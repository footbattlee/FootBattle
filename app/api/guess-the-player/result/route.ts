import { NextResponse } from "next/server";

import {
  footballLocaleFromRequest,
  leagueToDisplayName,
  nationalityToDisplayName,
  positionToDisplayName,
  preferredFootToDisplayName,
} from "@/lib/football/localization";
import { getGameSecurityEvents } from "@/lib/game-security/server";
import { getGameSecurityStatus } from "@/lib/game-security/status";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 7;
const SCORE_TABLE = [350, 300, 250, 200, 150, 100, 50];

type ResultRequest = { sessionId?: string; playerIds?: number[]; durationSeconds?: number };

export async function POST(request: Request) {
  try {
    const locale = footballLocaleFromRequest(request);
    const authClient = await createAuthServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    const body = (await request.json()) as ResultRequest;
    const sessionId = body.sessionId?.trim();
    if (!sessionId) return NextResponse.json({ ok: false, error: "Oyun oturumu bulunamadı." }, { status: 400 });

    const playerIds = Array.isArray(body.playerIds) ? body.playerIds.map(Number) : [];
    if (playerIds.length < 1 || playerIds.length > MAX_ATTEMPTS || playerIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      return NextResponse.json({ ok: false, error: "Tahmin bilgileri geçersiz." }, { status: 400 });
    }
    if (new Set(playerIds).size !== playerIds.length) return NextResponse.json({ ok: false, error: "Aynı oyuncu birden fazla kez tahmin edilemez." }, { status: 400 });

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("guess_player_sessions")
      .select("id, player_id, max_attempts, completed, result_applied, won, score, attempt_count, user_id")
      .eq("id", sessionId)
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (!session) return NextResponse.json({ ok: false, error: "Oyun bulunamadı." }, { status: 404 });
    if (session.user_id && user?.id && session.user_id !== user.id) return NextResponse.json({ ok: false, error: "Bu oyun oturumu başka bir kullanıcıya ait." }, { status: 403 });

    const { data: targetPlayer, error: targetPlayerError } = await supabaseAdmin
      .from("guess_players")
      .select("player_id, name, nationality, position, sub_position, age, current_club_name, current_competition_id, preferred_foot, image_url")
      .eq("player_id", session.player_id)
      .maybeSingle();
    if (targetPlayerError || !targetPlayer) return NextResponse.json({ ok: false, error: "Hedef oyuncu bilgisi okunamadı." }, { status: 500 });

    const mappedTargetPlayer = {
      id: targetPlayer.player_id,
      fullName: targetPlayer.name,
      nationality: nationalityToDisplayName(targetPlayer.nationality, locale),
      position: positionToDisplayName(targetPlayer.sub_position ?? targetPlayer.position, locale),
      club: targetPlayer.current_club_name ?? (locale === "en" ? "Free Agent" : "Kulüpsüz"),
      league: leagueToDisplayName(targetPlayer.current_competition_id, locale),
      age: Number(targetPlayer.age ?? 0),
      preferredFoot: preferredFootToDisplayName(targetPlayer.preferred_foot, locale),
      imageUrl: targetPlayer.image_url ?? null,
    };

    if (session.result_applied) {
      const security = await getGameSecurityStatus("guess_the_player", sessionId).catch(() => null);

      /*
       * Sonuç daha önce kaydedilmiş olsa bile client tarafındaki günlük görev
       * senkronizasyonunun devam etmesi gerekiyor. Bu nedenle frontend'in
       * erken return etmesine sebep olan alreadyRecorded=true dönmüyoruz.
       * Puan/profil tarafında tekrar işlem yapılmadığı için idempotent kalır.
       */
      return NextResponse.json({
        ok: true,
        alreadyRecorded: false,
        replayedResult: true,
        won: session.won,
        score: session.score ?? 0,
        attemptCount: session.attempt_count ?? playerIds.length,
        targetPlayer: mappedTargetPlayer,
        authenticated: false,
        scoreEligible: !security?.scoreBlocked,
        security,
      });
    }

    const { events } = await getGameSecurityEvents("guess_the_player", sessionId, "guess");
    const recordedIds = events.map((event) => Number(event.payload?.playerId));
    if (recordedIds.length !== playerIds.length || recordedIds.some((id, index) => id !== playerIds[index])) {
      return NextResponse.json({ ok: false, error: "Gönderilen tahmin geçmişi sunucu kayıtlarıyla eşleşmiyor." }, { status: 409 });
    }

    const lastPlayerId = playerIds[playerIds.length - 1];
    const won = lastPlayerId === Number(session.player_id);
    const sessionMaxAttempts = Number(session.max_attempts ?? MAX_ATTEMPTS);
    if (!won && playerIds.length < sessionMaxAttempts) return NextResponse.json({ ok: false, error: "Oyun henüz tamamlanmadı." }, { status: 400 });
    const score = won ? SCORE_TABLE[playerIds.length - 1] ?? 0 : 0;

    const { data: completedSession, error: completeError } = await supabaseAdmin
      .from("guess_player_sessions")
      .update({ completed: true, result_applied: true, won, score, attempt_count: playerIds.length, user_id: user?.id ?? null, completed_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("result_applied", false)
      .select("id")
      .maybeSingle();
    if (completeError) throw completeError;

    const security = await getGameSecurityStatus("guess_the_player", sessionId).catch(() => null);
    if (!completedSession) {
      return NextResponse.json({
        ok: true,
        alreadyRecorded: false,
        replayedResult: true,
        won,
        score,
        attemptCount: playerIds.length,
        targetPlayer: mappedTargetPlayer,
        authenticated: false,
        scoreEligible: !security?.scoreBlocked,
        security,
      });
    }

    if (!user) {
      return NextResponse.json({ ok: true, won, score, awardedScore: 0, scoreEligible: false, attemptCount: playerIds.length, alreadyRecorded: false, targetPlayer: mappedTargetPlayer, authenticated: false, durationSeconds: typeof body.durationSeconds === "number" ? Math.max(0, Math.floor(body.durationSeconds)) : null, security });
    }

    const awardedScore = security?.scoreBlocked ? 0 : score;
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, total_score, games_played, games_won, current_streak, best_streak")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError || !profile) throw profileError ?? new Error("Profil bulunamadı.");

    const nextTotalScore = Number(profile.total_score ?? 0) + awardedScore;
    const nextGamesPlayed = Number(profile.games_played ?? 0) + 1;
    const nextGamesWon = Number(profile.games_won ?? 0) + (won ? 1 : 0);
    const { error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .update({ total_score: nextTotalScore, games_played: nextGamesPlayed, games_won: nextGamesWon })
      .eq("id", user.id);
    if (profileUpdateError) throw profileUpdateError;

    return NextResponse.json({
      ok: true,
      won,
      score,
      awardedScore,
      scoreEligible: !security?.scoreBlocked,
      attemptCount: playerIds.length,
      alreadyRecorded: false,
      targetPlayer: mappedTargetPlayer,
      authenticated: true,
      currentStreak: profile.current_streak ?? 0,
      bestStreak: profile.best_streak ?? 0,
      totalScore: nextTotalScore,
      gamesPlayed: nextGamesPlayed,
      gamesWon: nextGamesWon,
      durationSeconds: typeof body.durationSeconds === "number" ? Math.max(0, Math.floor(body.durationSeconds)) : null,
      security,
    });
  } catch (error) {
    console.error("Guess the Player result endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
