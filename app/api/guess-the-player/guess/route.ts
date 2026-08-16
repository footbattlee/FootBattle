import { NextResponse } from "next/server";

import {
  footballLocaleFromRequest,
  leagueToDisplayName,
  nationalityToDisplayName,
  positionToDisplayName,
  preferredFootToDisplayName,
  type FootballLocale,
} from "@/lib/football/localization";
import {
  getGameSecurityEvents,
  recordGameSecurityEvent,
} from "@/lib/game-security/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type ComparisonStatus = "correct" | "wrong" | "higher" | "lower";

type PlayerRecord = {
  player_id: number;
  name: string;
  nationality: string | null;
  position: string | null;
  sub_position: string | null;
  age: number | string | null;
  current_club_name: string | null;
  current_competition_id: string | null;
  preferred_foot: string | null;
  image_url: string | null;
};

type GuessRequest = { sessionId?: string; playerId?: number };

function normalizeValue(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLocaleUpperCase("tr-TR")
    .replace(/İ/g, "I")
    .replace(/Ç/g, "C")
    .replace(/Ğ/g, "G")
    .replace(/Ö/g, "O")
    .replace(/Ş/g, "S")
    .replace(/Ü/g, "U");
}

function compareText(guessedValue: string | null, targetValue: string | null): ComparisonStatus {
  return normalizeValue(guessedValue) === normalizeValue(targetValue) ? "correct" : "wrong";
}

function compareAge(guessedAgeValue: number | string | null, targetAgeValue: number | string | null): ComparisonStatus {
  const guessedAge = Number(guessedAgeValue ?? 0);
  const targetAge = Number(targetAgeValue ?? 0);
  if (!guessedAge || !targetAge) return "wrong";
  if (guessedAge === targetAge) return "correct";
  return guessedAge < targetAge ? "higher" : "lower";
}

function mapPlayer(player: PlayerRecord, locale: FootballLocale) {
  return {
    id: player.player_id,
    fullName: player.name,
    nationality: nationalityToDisplayName(player.nationality, locale),
    position: positionToDisplayName(player.sub_position ?? player.position, locale),
    club: player.current_club_name ?? (locale === "en" ? "Free Agent" : "Kulüpsüz"),
    league: leagueToDisplayName(player.current_competition_id, locale),
    age: Number(player.age ?? 0),
    preferredFoot: preferredFootToDisplayName(player.preferred_foot, locale),
    imageUrl: player.image_url ?? null,
  };
}

export async function POST(request: Request) {
  try {
    const locale = footballLocaleFromRequest(request);
    const body = (await request.json()) as GuessRequest;
    const sessionId = body.sessionId?.trim();
    const playerId = Number(body.playerId);

    if (!sessionId) return NextResponse.json({ ok: false, error: "Oyun oturumu bulunamadı." }, { status: 400 });
    if (!Number.isInteger(playerId) || playerId <= 0) return NextResponse.json({ ok: false, error: "Geçerli bir oyuncu seçmelisin." }, { status: 400 });

    const { events: previousEvents } = await getGameSecurityEvents("guess_the_player", sessionId, "guess");
    const alreadyGuessed = previousEvents.some((event) => Number(event.payload?.playerId) === playerId);
    if (alreadyGuessed) return NextResponse.json({ ok: false, error: "Bu oyuncuyu zaten tahmin ettin." }, { status: 409 });

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("guess_player_sessions")
      .select("id, player_id, max_attempts, completed")
      .eq("id", sessionId)
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (!session) return NextResponse.json({ ok: false, error: "Oyun bulunamadı." }, { status: 404 });
    if (session.completed) return NextResponse.json({ ok: false, error: "Bu oyun zaten tamamlandı." }, { status: 409 });

    const currentAttemptNumber = previousEvents.length + 1;
    const maxAttempts = Number(session.max_attempts ?? 7);
    if (currentAttemptNumber > maxAttempts) return NextResponse.json({ ok: false, error: "Tahmin hakkın kalmadı." }, { status: 409 });

    const securityEvent = await recordGameSecurityEvent({
      request,
      gameCode: "guess_the_player",
      sourceSessionId: sessionId,
      eventType: "guess",
      payload: { playerId, attemptNumber: currentAttemptNumber },
      maxPerMinute: 45,
    });
    if (!securityEvent.allowed) return NextResponse.json({ ok: false, error: "Çok hızlı tahmin gönderiyorsun." }, { status: 429 });

    const playerSelect = `player_id, name, nationality, position, sub_position, age, current_club_name, current_competition_id, preferred_foot, image_url`;
    const [{ data: guessedPlayer, error: guessedPlayerError }, { data: targetPlayer, error: targetPlayerError }] = await Promise.all([
      supabaseAdmin.from("guess_players").select(playerSelect).eq("player_id", playerId).eq("is_playable", 1).maybeSingle(),
      supabaseAdmin.from("guess_players").select(playerSelect).eq("player_id", session.player_id).maybeSingle(),
    ]);
    if (guessedPlayerError) throw guessedPlayerError;
    if (!guessedPlayer) return NextResponse.json({ ok: false, error: "Seçilen oyuncu bulunamadı." }, { status: 404 });
    if (targetPlayerError || !targetPlayer) return NextResponse.json({ ok: false, error: "Hedef oyuncu bilgileri okunamadı." }, { status: 500 });

    const won = Number(guessedPlayer.player_id) === Number(targetPlayer.player_id);
    const exhaustedAttempts = !won && currentAttemptNumber >= maxAttempts;
    const guessedPosition = guessedPlayer.sub_position ?? guessedPlayer.position;
    const targetPosition = targetPlayer.sub_position ?? targetPlayer.position;

    return NextResponse.json({
      ok: true,
      won,
      exhaustedAttempts,
      attemptNumber: currentAttemptNumber,
      maxAttempts,
      player: mapPlayer(guessedPlayer as PlayerRecord, locale),
      comparison: {
        nationality: compareText(guessedPlayer.nationality, targetPlayer.nationality),
        position: compareText(guessedPosition, targetPosition),
        club: compareText(guessedPlayer.current_club_name, targetPlayer.current_club_name),
        league: compareText(guessedPlayer.current_competition_id, targetPlayer.current_competition_id),
        age: compareAge(guessedPlayer.age, targetPlayer.age),
        preferredFoot: compareText(guessedPlayer.preferred_foot, targetPlayer.preferred_foot),
      },
      targetPlayer: won || exhaustedAttempts ? mapPlayer(targetPlayer as PlayerRecord, locale) : null,
    });
  } catch (error) {
    console.error("Guess the Player guess endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Tahmin kontrol edilirken hata oluştu." }, { status: 500 });
  }
}
