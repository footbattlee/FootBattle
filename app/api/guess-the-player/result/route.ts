import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 7;

const SCORE_TABLE = [
  350,
  300,
  250,
  200,
  150,
  100,
  50,
];

type ResultRequest = {
  sessionId?: string;

  playerIds?: number[];

  durationSeconds?: number;
};

export async function POST(
  request: Request,
) {
  try {
    /* =====================================================
       1. AUTH

       Giriş artık zorunlu değil.
       User varsa skor/profil kaydedeceğiz.
       Yoksa sadece oyunu tamamlayacağız.
    ===================================================== */

    const authClient =
      await createAuthServerClient();

    const {
      data: { user },
    } =
      await authClient.auth.getUser();

    /* =====================================================
       2. BODY
    ===================================================== */

    const body =
      (await request.json()) as ResultRequest;

    const sessionId =
      body.sessionId?.trim();

    if (!sessionId) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Oyun oturumu bulunamadı.",
        },
        {
          status: 400,
        },
      );
    }

    const playerIds =
      Array.isArray(
        body.playerIds,
      )
        ? body.playerIds.map(
            Number,
          )
        : [];

    if (
      playerIds.length < 1 ||
      playerIds.length >
        MAX_ATTEMPTS ||
      playerIds.some(
        (id) =>
          !Number.isInteger(
            id,
          ) ||
          id <= 0,
      )
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Tahmin bilgileri geçersiz.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      new Set(
        playerIds,
      ).size !==
      playerIds.length
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Aynı oyuncu birden fazla kez tahmin edilemez.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       3. SESSION
    ===================================================== */

    const {
      data: session,
      error: sessionError,
    } =
      await supabaseAdmin
        .from(
          "guess_player_sessions",
        )
        .select(`
          id,
          player_id,
          max_attempts,
          completed,
          result_applied,
          won,
          score,
          attempt_count,
          user_id
        `)
        .eq(
          "id",
          sessionId,
        )
        .maybeSingle();

    if (sessionError) {
      throw sessionError;
    }

    if (!session) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Oyun bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    /* =====================================================
       4. TARGET PLAYER
    ===================================================== */

    const {
      data: targetPlayer,
      error: targetPlayerError,
    } =
      await supabaseAdmin
        .from(
          "guess_players",
        )
        .select(`
          player_id,
          name,
          nationality,
          position,
          sub_position,
          age,
          current_club_name,
          current_competition_id,
          preferred_foot,
          image_url
        `)
        .eq(
          "player_id",
          session.player_id,
        )
        .maybeSingle();

    if (
      targetPlayerError ||
      !targetPlayer
    ) {
      console.error(
        "Hedef oyuncu okunamadı:",
        targetPlayerError,
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            "Hedef oyuncu bilgisi okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    const mappedTargetPlayer = {
      id:
        targetPlayer.player_id,

      fullName:
        targetPlayer.name,

      nationality:
        targetPlayer.nationality ??
        "Bilinmiyor",

      position:
        targetPlayer.sub_position ??
        targetPlayer.position ??
        "Bilinmiyor",

      club:
        targetPlayer.current_club_name ??
        "Kulüpsüz",

      league:
        targetPlayer.current_competition_id ??
        "Bilinmiyor",

      age:
        Number(
          targetPlayer.age ??
            0,
        ),

      preferredFoot:
        targetPlayer.preferred_foot ??
        "Bilinmiyor",

      imageUrl:
        targetPlayer.image_url ??
        null,
    };

    /* =====================================================
       5. ZATEN TAMAMLANDI
    ===================================================== */

    if (
      session.result_applied
    ) {
      return NextResponse.json({
        ok: true,

        alreadyRecorded:
          true,

        won:
          session.won,

        score:
          session.score ??
          0,

        attemptCount:
          session.attempt_count ??
          playerIds.length,

        targetPlayer:
          mappedTargetPlayer,

        authenticated:
          Boolean(user),
      });
    }

    /* =====================================================
       6. RESULT
    ===================================================== */

    const lastPlayerId =
      playerIds[
        playerIds.length - 1
      ];

    const won =
      lastPlayerId ===
      Number(
        session.player_id,
      );

    const sessionMaxAttempts =
      Number(
        session.max_attempts ??
          MAX_ATTEMPTS,
      );

    /*
     * Kazanmadıysa ancak tüm haklarını
     * kullandıktan sonra oyun tamamlanabilir.
     */
    if (
      !won &&
      playerIds.length <
        sessionMaxAttempts
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Oyun henüz tamamlanmadı.",
        },
        {
          status: 400,
        },
      );
    }

    const score =
      won
        ? SCORE_TABLE[
            playerIds.length -
              1
          ] ?? 0
        : 0;

    const durationSeconds =
      typeof body.durationSeconds ===
        "number" &&
      Number.isFinite(
        body.durationSeconds,
      ) &&
      body.durationSeconds >=
        0
        ? Math.floor(
            body.durationSeconds,
          )
        : null;

    const now =
      new Date().toISOString();

    /* =====================================================
       7. SESSION'I TAMAMLA

       Guest kullanıcı da session'ı tamamlayabilir.
       Login varsa user_id bağlanır.
    ===================================================== */

    const {
      data: completedSession,
      error: completeError,
    } =
      await supabaseAdmin
        .from(
          "guess_player_sessions",
        )
        .update({
          completed:
            true,

          result_applied:
            true,

          won,

          score,

          attempt_count:
            playerIds.length,

          user_id:
            user?.id ??
            null,

          completed_at:
            now,
        })
        .eq(
          "id",
          sessionId,
        )
        .eq(
          "result_applied",
          false,
        )
        .select(
          "id",
        )
        .maybeSingle();

    if (completeError) {
      throw completeError;
    }

    /*
     * Başka request daha önce session'ı
     * tamamladıysa tekrar profil puanı yazma.
     */
    if (!completedSession) {
      return NextResponse.json({
        ok: true,

        alreadyRecorded:
          true,

        won,

        score,

        attemptCount:
          playerIds.length,

        targetPlayer:
          mappedTargetPlayer,

        authenticated:
          Boolean(user),
      });
    }

    /* =====================================================
       8. GUEST RESPONSE

       Guest kullanıcı için burada işimiz bitti.

       En önemlisi:
       targetPlayer response'ta dönüyor.
    ===================================================== */

    if (!user) {
      return NextResponse.json({
        ok: true,

        won,

        score,

        attemptCount:
          playerIds.length,

        alreadyRecorded:
          false,

        targetPlayer:
          mappedTargetPlayer,

        authenticated:
          false,

        currentStreak:
          null,

        bestStreak:
          null,

        totalScore:
          0,

        gamesPlayed:
          0,

        gamesWon:
          0,

        durationSeconds,
      });
    }

    /* =====================================================
       9. PROFILE

       Buraya yalnızca giriş yapan kullanıcı gelir.
    ===================================================== */

    const {
      data: profile,
      error: profileError,
    } =
      await supabaseAdmin
        .from(
          "profiles",
        )
        .select(`
          id,
          total_score,
          games_played,
          games_won,
          current_streak,
          best_streak
        `)
        .eq(
          "id",
          user.id,
        )
        .maybeSingle();

    if (
      profileError ||
      !profile
    ) {
      throw (
        profileError ??
        new Error(
          "Profil bulunamadı.",
        )
      );
    }

    const nextTotalScore =
      (profile.total_score ??
        0) +
      score;

    const nextGamesPlayed =
      (profile.games_played ??
        0) +
      1;

    const nextGamesWon =
      (profile.games_won ??
        0) +
      (won ? 1 : 0);

    /* =====================================================
       10. PROFILE UPDATE
    ===================================================== */

    const {
      error: profileUpdateError,
    } =
      await supabaseAdmin
        .from(
          "profiles",
        )
        .update({
          total_score:
            nextTotalScore,

          games_played:
            nextGamesPlayed,

          games_won:
            nextGamesWon,
        })
        .eq(
          "id",
          user.id,
        );

    if (
      profileUpdateError
    ) {
      throw profileUpdateError;
    }

    /* =====================================================
       11. AUTHENTICATED RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      won,

      score,

      attemptCount:
        playerIds.length,

      alreadyRecorded:
        false,

      targetPlayer:
        mappedTargetPlayer,

      authenticated:
        true,

      currentStreak:
        profile.current_streak ??
        0,

      bestStreak:
        profile.best_streak ??
        0,

      totalScore:
        nextTotalScore,

      gamesPlayed:
        nextGamesPlayed,

      gamesWon:
        nextGamesWon,

      durationSeconds,
    });
  } catch (error) {
    console.error(
      "Guess the Player result endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Beklenmeyen bir hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}