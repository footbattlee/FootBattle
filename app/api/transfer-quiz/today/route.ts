import { NextResponse } from "next/server";

import { nationalityToDisplayName } from "@/lib/football/localization";
import { startGameSecuritySession } from "@/lib/game-security/server";
import {
  buildPlayerQuizSeniorCareer,
  type RawPlayerQuizClub,
} from "@/lib/player-quiz/clubs";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_LIVES = 5;
const GUESS_TIME_SECONDS = 30;
const MINIMUM_SEARCH_LENGTH = 3;

export async function GET(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const { data: { user } } = await authClient.auth.getUser();

    const { data: transferQuiz, error: transferError } = await supabaseAdmin
      .from("transfer_quizzes")
      .select("id, player_id, headline, club_name, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (transferError) return NextResponse.json({ ok: false, error: "Aktif transfer quiz okunamadı." }, { status: 500 });
    if (!transferQuiz) return NextResponse.json({ ok: false, error: "Aktif transfer quiz bulunamadı." }, { status: 404 });

    const playerId = Number(transferQuiz.player_id);
    const [playerResult, detailResult, clubsResult] = await Promise.all([
      supabaseAdmin.from("guess_players").select("player_id, name, image_url, nationality, popularity_score").eq("player_id", playerId).maybeSingle(),
      supabaseAdmin.from("player_quiz_details").select("birth_year").eq("player_id", playerId).maybeSingle(),
      supabaseAdmin.from("player_quiz_clubs").select("id, club_name, career_order").eq("player_id", playerId).not("club_name", "is", null).order("career_order", { ascending: true }),
    ]);
    if (playerResult.error || !playerResult.data) return NextResponse.json({ ok: false, error: "Transfer Quiz oyuncusu bulunamadı." }, { status: 404 });
    if (detailResult.error || !detailResult.data) return NextResponse.json({ ok: false, error: "Oyuncunun doğum yılı bulunamadı." }, { status: 404 });
    if (clubsResult.error) return NextResponse.json({ ok: false, error: "Oyuncunun kariyer bilgileri okunamadı." }, { status: 500 });

    const seniorCareer = buildPlayerQuizSeniorCareer((clubsResult.data ?? []) as RawPlayerQuizClub[]);
    if (!seniorCareer.length) return NextResponse.json({ ok: false, error: "Oyuncunun A takım kariyeri bulunamadı." }, { status: 404 });

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("player_quiz_sessions")
      .insert({ player_id: playerId, max_lives: MAX_LIVES, guess_time_seconds: GUESS_TIME_SECONDS })
      .select("id, max_lives, guess_time_seconds")
      .single();
    if (sessionError || !session) return NextResponse.json({ ok: false, error: "Transfer Quiz oturumu oluşturulamadı." }, { status: 500 });

    await startGameSecuritySession({
      request,
      gameCode: "transfer_quiz",
      sourceSessionId: String(session.id),
      userId: user?.id ?? null,
      mode: "solo",
      metadata: { transferQuizId: transferQuiz.id, playerId },
    });

    return NextResponse.json({
      ok: true,
      transferQuizId: transferQuiz.id,
      headline: transferQuiz.headline ?? "Transfer Özel",
      targetClub: transferQuiz.club_name ?? null,
      sessionId: session.id,
      player: {
        id: Number(playerResult.data.player_id),
        fullName: playerResult.data.name,
        imageUrl: playerResult.data.image_url ?? null,
        nationality: nationalityToDisplayName(playerResult.data.nationality),
      },
      maxLives: session.max_lives,
      guessTimeSeconds: session.guess_time_seconds,
      minimumSearchLength: MINIMUM_SEARCH_LENGTH,
      board: {
        birthYearSlots: 1,
        nationalitySlots: 1,
        clubSlots: seniorCareer.length,
        totalSlots: seniorCareer.length + 2,
      },
      scoring: { completionScore: 500 },
    });
  } catch (error) {
    console.error("Transfer Quiz today endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Transfer Quiz hazırlanırken hata oluştu." }, { status: 500 });
  }
}
