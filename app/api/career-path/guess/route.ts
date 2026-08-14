import { NextResponse } from "next/server";

import { recordGameSecurityEvent } from "@/lib/game-security/server";
import {
  buildPlayerQuizSeniorCareer,
  playerQuizClubsAreEquivalent,
  type RawPlayerQuizClub,
} from "@/lib/player-quiz/clubs";
import { supabaseAdmin } from "@/lib/supabase/server";

type GuessRequest = { sessionId?: string; clubName?: string; solvedClubIds?: number[] };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GuessRequest;
    const sessionId = body.sessionId?.trim();
    const clubName = body.clubName?.trim() ?? "";
    if (!sessionId) return NextResponse.json({ ok: false, error: "Oyun oturumu bulunamadı." }, { status: 400 });
    if (!clubName) return NextResponse.json({ ok: false, error: "Kulüp seçimi boş olamaz." }, { status: 400 });

    const eventResult = await recordGameSecurityEvent({
      request,
      gameCode: "career_path",
      sourceSessionId: sessionId,
      eventType: "guess",
      payload: { clubName: clubName.slice(0, 120) },
      maxPerMinute: 50,
    });
    if (!eventResult.allowed) return NextResponse.json({ ok: false, error: "Çok hızlı tahmin gönderiyorsun." }, { status: 429 });

    const solvedClubIds = Array.isArray(body.solvedClubIds)
      ? body.solvedClubIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)
      : [];

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("career_path_sessions")
      .select("id, player_id, max_wrong_guesses, completed")
      .eq("id", sessionId)
      .maybeSingle();
    if (sessionError) return NextResponse.json({ ok: false, error: "Oyun oturumu kontrol edilemedi." }, { status: 500 });
    if (!session) return NextResponse.json({ ok: false, error: "Career Path oyunu bulunamadı." }, { status: 404 });
    if (session.completed) return NextResponse.json({ ok: false, error: "Bu Career Path oyunu zaten tamamlandı." }, { status: 409 });

    const { data: rawClubs, error: clubsError } = await supabaseAdmin
      .from("player_quiz_clubs")
      .select("id, club_name, career_order")
      .eq("player_id", session.player_id)
      .not("club_name", "is", null)
      .order("career_order", { ascending: true });
    if (clubsError) return NextResponse.json({ ok: false, error: "Kulüp bilgileri kontrol edilemedi." }, { status: 500 });

    const careerClubs = buildPlayerQuizSeniorCareer((rawClubs ?? []) as RawPlayerQuizClub[]);
    if (!careerClubs.length) return NextResponse.json({ ok: false, error: "Oyuncunun A takım kariyeri bulunamadı." }, { status: 404 });

    const matchedClub = careerClubs.find((club) => playerQuizClubsAreEquivalent(club.name, clubName));
    if (!matchedClub) return NextResponse.json({ ok: true, correct: false, duplicate: false, matchedClub: null });
    if (solvedClubIds.includes(matchedClub.id)) return NextResponse.json({ ok: true, correct: false, duplicate: true, matchedClub: null });

    return NextResponse.json({ ok: true, correct: true, duplicate: false, matchedClub });
  } catch (error) {
    console.error("Career Path guess endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Cevap kontrol edilirken hata oluştu." }, { status: 500 });
  }
}
