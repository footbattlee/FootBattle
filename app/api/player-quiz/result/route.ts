import { NextResponse } from "next/server";

import { footballLocaleFromRequest, nationalityToDisplayName } from "@/lib/football/localization";
import { getGameSecurityStatus } from "@/lib/game-security/status";
import { buildPlayerQuizSeniorCareer, type RawPlayerQuizClub } from "@/lib/player-quiz/clubs";
import { nationalitiesAreEquivalent } from "@/lib/player-quiz/nationalities";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const COMPLETION_SCORE = 250;
type FinishReason = "won" | "lost";
type ResultRequest = {
  sessionId?: string;
  finishReason?: FinishReason;
  birthYear?: string | number;
  nationality?: string;
  solvedClubIds?: number[];
  attemptCount?: number;
};

export async function POST(request: Request) {
  try {
    const locale = footballLocaleFromRequest(request);
    const authClient = await createAuthServerClient();
    const { data: { user } } = await authClient.auth.getUser();

    const body = (await request.json()) as ResultRequest;
    const sessionId = body.sessionId?.trim();
    if (!sessionId) return NextResponse.json({ ok: false, error: "Oyun oturumu bulunamadı." }, { status: 400 });
    if (body.finishReason !== "won" && body.finishReason !== "lost") return NextResponse.json({ ok: false, error: "Oyun bitiş bilgisi geçersiz." }, { status: 400 });

    const solvedClubIds = Array.isArray(body.solvedClubIds)
      ? Array.from(new Set(body.solvedClubIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)))
      : [];
    const attemptCount = typeof body.attemptCount === "number" && Number.isInteger(body.attemptCount) && body.attemptCount >= 0 ? body.attemptCount : 0;

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("player_quiz_sessions")
      .select("id, player_id, completed, result_applied, won, score, attempt_count, user_id")
      .eq("id", sessionId)
      .maybeSingle();
    if (sessionError || !session) return NextResponse.json({ ok: false, error: "Player Quiz oturumu bulunamadı." }, { status: 404 });
    if (session.user_id && session.user_id !== user?.id) return NextResponse.json({ ok: false, error: "Bu oyun oturumu başka bir kullanıcıya ait." }, { status: 403 });

    const playerId = Number(session.player_id);
    const [detailResult, playerResult, clubsResult] = await Promise.all([
      supabaseAdmin.from("player_quiz_details").select("birth_year").eq("player_id", playerId).maybeSingle(),
      supabaseAdmin.from("guess_players").select("player_id, name, image_url, nationality").eq("player_id", playerId).maybeSingle(),
      supabaseAdmin.from("player_quiz_clubs").select("id, club_name, career_order").eq("player_id", playerId).not("club_name", "is", null).order("career_order", { ascending: true }),
    ]);
    if (detailResult.error || !detailResult.data || playerResult.error || !playerResult.data || clubsResult.error) return NextResponse.json({ ok: false, error: "Oyuncunun doğru cevapları okunamadı." }, { status: 500 });

    const player = playerResult.data;
    const seniorCareer = buildPlayerQuizSeniorCareer((clubsResult.data ?? []) as RawPlayerQuizClub[]);
    const birthYearCorrect = Number(body.birthYear) === Number(detailResult.data.birth_year);
    const nationalityCorrect = nationalitiesAreEquivalent(player.nationality, body.nationality);
    const targetClubIds = new Set(seniorCareer.map((club) => club.id));
    if (!solvedClubIds.every((id) => targetClubIds.has(id))) return NextResponse.json({ ok: false, error: "Gönderilen kulüp bilgilerinden biri oyuncunun A takım kariyerine ait değil." }, { status: 400 });

    const allClubsSolved = targetClubIds.size > 0 && solvedClubIds.length === targetClubIds.size;
    const won = birthYearCorrect && nationalityCorrect && allClubsSolved;
    if (body.finishReason === "won" && !won) return NextResponse.json({ ok: false, error: "Player Quiz tamamlanmış görünmüyor." }, { status: 400 });

    const score = won ? COMPLETION_SCORE : 0;
    const correctAnswers = {
      birthYear: Number(detailResult.data.birth_year),
      nationality: nationalityToDisplayName(player.nationality, locale),
      clubs: seniorCareer,
    };

    if (session.result_applied) {
      const security = await getGameSecurityStatus("player_quiz", sessionId).catch(() => null);
      return NextResponse.json({ ok: true, alreadyRecorded: true, won: session.won, score: session.score ?? 0, attemptCount: session.attempt_count ?? attemptCount, player: { id: Number(player.player_id), fullName: player.name, imageUrl: player.image_url ?? null }, correctAnswers, scoreEligible: !security?.scoreBlocked, security });
    }

    const { data: completedSession, error: completeError } = await supabaseAdmin
      .from("player_quiz_sessions")
      .update({ completed: true, result_applied: true, won, score, attempt_count: attemptCount, user_id: user?.id ?? session.user_id ?? null, completed_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("result_applied", false)
      .select("id")
      .maybeSingle();
    if (completeError) return NextResponse.json({ ok: false, error: "Player Quiz sonucu kaydedilemedi." }, { status: 500 });

    const security = await getGameSecurityStatus("player_quiz", sessionId).catch(() => null);
    if (!completedSession) return NextResponse.json({ ok: true, alreadyRecorded: true, won, score, attemptCount, correctAnswers, scoreEligible: !security?.scoreBlocked, security });

    if (!user) return NextResponse.json({ ok: false, error: "Puanını kaydetmek için giriş yapmalısın.", completed: true, won, score, attemptCount, correctAnswers }, { status: 401 });

    const awardedScore = security?.scoreBlocked ? 0 : score;
    const [{ data: profile, error: profileError }, { data: soloProgress, error: soloError }] = await Promise.all([
      supabaseAdmin.from("profiles").select("current_streak, best_streak").eq("id", user.id).maybeSingle(),
      supabaseAdmin.from("solo_rating_progress").select("rating, games_played, wins").eq("user_id", user.id).maybeSingle(),
    ]);
    if (profileError || soloError) return NextResponse.json({ ok: false, error: "Kullanıcı istatistikleri okunamadı." }, { status: 500 });

    return NextResponse.json({
      ok: true,
      won,
      score,
      awardedScore,
      scoreEligible: !security?.scoreBlocked,
      attemptCount,
      alreadyRecorded: false,
      correctAnswers,
      currentStreak: profile?.current_streak ?? 0,
      bestStreak: profile?.best_streak ?? 0,
      totalScore: Number(soloProgress?.rating ?? 0),
      gamesPlayed: Number(soloProgress?.games_played ?? 0),
      gamesWon: Number(soloProgress?.wins ?? 0),
      security,
    });
  } catch (error) {
    console.error("Player Quiz result endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
