import { NextResponse } from "next/server";

import {
  getPopularityBounds,
  getSuperLigDifficulty,
  isSuperLigGuessRequest,
} from "@/lib/guess-the-player/super-lig";
import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 7;
const MINIMUM_SEARCH_LENGTH = 3;
const MINIMUM_POPULARITY_SCORE = 84;
const SUPER_LIG_COMPETITION_ID = "TR1";

type CandidatePlayer = {
  player_id: number;
  nationality: string | null;
  position: string | null;
  sub_position: string | null;
  age: number | string | null;
  current_club_name: string | null;
  current_competition_id: string | null;
  preferred_foot: string | null;
  popularity_score: number | null;
};

const PLAYER_SELECT = `
  player_id,
  nationality,
  position,
  sub_position,
  age,
  current_club_name,
  current_competition_id,
  preferred_foot,
  popularity_score
`;

function getTurkeyDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isCompletePlayer(player: CandidatePlayer) {
  return Boolean(
    player.nationality &&
      player.position &&
      player.age !== null &&
      player.current_club_name &&
      player.current_competition_id &&
      player.preferred_foot,
  );
}

async function getNormalRandomPlayer() {
  const { count, error: countError } = await supabaseAdmin
    .from("guess_players")
    .select("player_id", { count: "exact", head: true })
    .eq("is_playable", 1)
    .gte("popularity_score", MINIMUM_POPULARITY_SCORE);

  if (countError || !count) throw countError ?? new Error("Oyuncu havuzu boş.");

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const randomIndex = Math.floor(Math.random() * count);
    const { data, error } = await supabaseAdmin
      .from("guess_players")
      .select(PLAYER_SELECT)
      .eq("is_playable", 1)
      .gte("popularity_score", MINIMUM_POPULARITY_SCORE)
      .order("player_id", { ascending: true })
      .range(randomIndex, randomIndex)
      .maybeSingle();
    if (error) throw error;
    if (data && isCompletePlayer(data)) return data as CandidatePlayer;
  }

  return null;
}

async function getCurrentSuperLigRandomPlayer(difficulty: ReturnType<typeof getSuperLigDifficulty>) {
  const { min, max } = getPopularityBounds(difficulty);

  const baseQuery = () =>
    supabaseAdmin
      .from("guess_players")
      .select(PLAYER_SELECT)
      .eq("is_playable", 1)
      .eq("current_competition_id", SUPER_LIG_COMPETITION_ID)
      .gte("popularity_score", min)
      .lte("popularity_score", max)
      .order("popularity_score", { ascending: false, nullsFirst: false });

  const { data: pool, error } = await baseQuery().limit(500);
  if (error) throw error;

  const complete = (pool ?? []).filter((player) => isCompletePlayer(player as CandidatePlayer)) as CandidatePlayer[];
  if (!complete.length) return null;

  return complete[Math.floor(Math.random() * complete.length)] ?? null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const dailyMode = url.searchParams.get("daily") === "1";
    const superLigMode = !dailyMode && isSuperLigGuessRequest(request);
    const difficulty = getSuperLigDifficulty(request);
    let targetPlayer: CandidatePlayer | null = null;

    if (dailyMode) {
      const { data: dailyRow, error: dailyError } = await supabaseAdmin
        .from("daily_guess_player")
        .select("player_id, is_published")
        .eq("play_date", getTurkeyDateKey())
        .eq("is_published", true)
        .maybeSingle();

      if (dailyError) throw dailyError;
      if (!dailyRow) return NextResponse.json({ ok: false, error: "Bugünün Guess The Player oyunu henüz yayınlanmadı." }, { status: 404 });

      const { data, error } = await supabaseAdmin
        .from("guess_players")
        .select(PLAYER_SELECT)
        .eq("player_id", dailyRow.player_id)
        .eq("is_playable", 1)
        .maybeSingle();
      if (error) throw error;
      if (data && isCompletePlayer(data)) targetPlayer = data as CandidatePlayer;
    } else if (superLigMode) {
      targetPlayer = await getCurrentSuperLigRandomPlayer(difficulty);
    } else {
      targetPlayer = await getNormalRandomPlayer();
    }

    if (!targetPlayer) {
      return NextResponse.json({ ok: false, error: superLigMode ? "Bu zorlukta aktif Süper Lig oyuncusu bulunamadı." : "Guess the Player için uygun oyuncu seçilemedi." }, { status: 500 });
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("guess_player_sessions")
      .insert({ player_id: targetPlayer.player_id, max_attempts: MAX_ATTEMPTS })
      .select("id, max_attempts")
      .single();

    if (sessionError || !session) throw sessionError ?? new Error("Yeni oyun oluşturulamadı.");

    return NextResponse.json({
      ok: true,
      mode: dailyMode ? "daily" : superLigMode ? "super_lig" : "random",
      daily: dailyMode,
      superLig: superLigMode,
      difficulty: superLigMode ? difficulty : null,
      sessionId: session.id,
      maxAttempts: session.max_attempts,
      minimumSearchLength: MINIMUM_SEARCH_LENGTH,
      minimumPopularityScore: superLigMode ? getPopularityBounds(difficulty).min : MINIMUM_POPULARITY_SCORE,
      board: { columns: ["nationality", "club", "competition", "position", "age", "preferredFoot"] },
    });
  } catch (error) {
    console.error("Guess the Player today endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Yeni oyun hazırlanırken hata oluştu." }, { status: 500 });
  }
}
