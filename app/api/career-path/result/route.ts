import { NextResponse } from "next/server";

import { getGameSecurityStatus } from "@/lib/game-security/status";
import { buildPlayerQuizSeniorCareer, type RawPlayerQuizClub } from "@/lib/player-quiz/clubs";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_WRONG_GUESSES = 5;
const SCORE_TABLE = [250, 200, 150, 100, 50, 0];

type FinishReason = "won" | "lost";
type ResultRequest = {
  sessionId?: string;
  finishReason?: FinishReason;
  solvedClubIds?: number[];
  wrongCount?: number;
  attemptCount?: number;
};

export async function POST(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    const body = (await request.json()) as ResultRequest;
    const sessionId = body.sessionId?.trim();
    if (!sessionId) return NextResponse.json({ ok: false, error: "Oyun oturumu bulunamadı." }, { status: 400 });
    if (body.finishReason !== "won" && body.finishReason !== "lost") return NextResponse.json({ ok: false, error: "Oyun bitiş bilgisi geçersiz." }, { status: 400 });

    const wrongCount = Number(body.wrongCount);
    if (!Number.isInteger(wrongCount) || wrongCount < 0 || wrongCount > MAX_WRONG_GUESSES) return NextResponse.json({ ok: false, error: "Yanlış tahmin sayısı geçersiz." }, { status: 400 });
    const attemptCount = typeof body.attemptCount === "number" && Number.isInteger(body.attemptCount) && body.attemptCount >= 0 ? body.attemptCount : 0;
    const solvedClubIds = Array.isArray(body.solvedClubIds) ? Array.from(new Set(body.solvedClubIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))) : [];

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("career_path_sessions")
      .select("id, player_id, max_wrong_guesses, completed, result_applied, won, score, wrong_count, attempt_count, user_id")
      .eq("id", sessionId)
      .maybeSingle();
    if (sessionError) return NextResponse.json({ ok: false, error: "Career Path oyunu kontrol edilemedi." }, { status: 500 });
    if (!session) return NextResponse.json({ ok: false, error: "Career Path oyunu bulunamadı." }, { status: 404 });
    if (session.user_id && session.user_id !== user?.id) return NextResponse.json({ ok: false, error: "Bu oyun oturumu başka bir kullanıcıya ait." }, { status: 403 });

    const playerId = Number(session.player_id);
    const { data: rawClubs, error: clubsError } = await supabaseAdmin
      .from("player_quiz_clubs")
      .select("id, club_name, career_order")
      .eq("player_id", playerId)
      .not("club_name", "is", null)
      .order("career_order", { ascending: true });
    if (clubsError || !rawClubs?.length) return NextResponse.json({ ok: false, error: "Kariyer bilgileri doğrulanamadı." }, { status: 500 });

    const seniorCareer = buildPlayerQuizSeniorCareer(rawClubs as RawPlayerQuizClub[]);
    const targetClubIds = new Set(seniorCareer.map((club) => club.id));
    if (!solvedClubIds.every((clubId) => targetClubIds.has(clubId))) return NextResponse.json({ ok: false, error: "Gönderilen kulüplerden biri bu oyuncunun A takım kariyerine ait değil." }, { status: 400 });

    const allClubsSolved = solvedClubIds.length === targetClubIds.size;
    const won = allClubsSolved && wrongCount < Number(session.max_wrong_guesses ?? MAX_WRONG_GUESSES);
    if (body.finishReason === "won" && !won) return NextResponse.json({ ok: false, error: "Career Path tamamlanmış görünmüyor. Eksik A takım kulübü var." }, { status: 400 });
    if (body.finishReason === "lost" && wrongCount < Number(session.max_wrong_guesses ?? MAX_WRONG_GUESSES)) return NextResponse.json({ ok: false, error: "Oyun henüz kaybedilmiş görünmüyor." }, { status: 400 });

    const score = won ? SCORE_TABLE[Math.min(wrongCount, 5)] ?? 0 : 0;
    const { data: targetPlayer } = await supabaseAdmin.from("guess_players").select("player_id, name, image_url").eq("player_id", playerId).maybeSingle();
    const player = targetPlayer ? { id: Number(targetPlayer.player_id), fullName: targetPlayer.name, imageUrl: targetPlayer.image_url ?? null } : null;

    if (session.result_applied) {
      const security = await getGameSecurityStatus("career_path", sessionId).catch(() => null);
      return NextResponse.json({ ok: true, alreadyRecorded: true, won: session.won, score: session.score ?? 0, wrongCount: session.wrong_count ?? wrongCount, attemptCount: session.attempt_count ?? attemptCount, player, allClubs: seniorCareer, scoreEligible: !security?.scoreBlocked, security });
    }

    const { data: completedSession, error: completeError } = await supabaseAdmin
      .from("career_path_sessions")
      .update({ completed: true, result_applied: true, won, score, wrong_count: wrongCount, attempt_count: attemptCount, user_id: user?.id ?? session.user_id ?? null, completed_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("result_applied", false)
      .select("id")
      .maybeSingle();
    if (completeError) return NextResponse.json({ ok: false, error: "Career Path sonucu kaydedilemedi." }, { status: 500 });

    const security = await getGameSecurityStatus("career_path", sessionId).catch(() => null);
    if (!completedSession) return NextResponse.json({ ok: true, alreadyRecorded: true, won, score, wrongCount, attemptCount, player, allClubs: seniorCareer, scoreEligible: !security?.scoreBlocked, security });
    if (!user) return NextResponse.json({ ok: false, error: "Puanını kaydetmek için giriş yapmalısın.", completed: true }, { status: 401 });

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
      wrongCount,
      attemptCount,
      alreadyRecorded: false,
      player,
      allClubs: seniorCareer,
      currentStreak: profile?.current_streak ?? 0,
      bestStreak: profile?.best_streak ?? 0,
      totalScore: Number(soloProgress?.rating ?? 0),
      gamesPlayed: Number(soloProgress?.games_played ?? 0),
      gamesWon: Number(soloProgress?.wins ?? 0),
      security,
    });
  } catch (error) {
    console.error("Career Path result endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
