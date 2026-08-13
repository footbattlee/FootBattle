import { NextResponse } from "next/server";

import {
  createAuthServerClient,
} from "@/lib/supabase/auth-server";

import {
  supabaseAdmin,
} from "@/lib/supabase/server";

const REQUIRED_COMPLETIONS =
  3;

const THREE_OF_FOUR_REWARD =
  250;

const FOUR_OF_FOUR_REWARD =
  350;

function getTodayDate() {
  const now =
    new Date();

  return now
    .toISOString()
    .slice(
      0,
      10,
    );
}

export async function GET() {
  try {
    /* =====================================================
       1. AUTH
    ===================================================== */

    const authClient =
      await createAuthServerClient();

    const {
      data: {
        user,
      },
      error:
        authError,
    } =
      await authClient.auth.getUser();

    if (
      authError ||
      !user
    ) {
      return NextResponse.json(
        {
          ok: false,

          authenticated:
            false,

          error:
            "Günlük görev için giriş yapmalısın.",
        },
        {
          status: 401,
        },
      );
    }

    /* =====================================================
       2. TODAY
    ===================================================== */

    const challengeDate =
      getTodayDate();

    /* =====================================================
       3. PROGRESS BUL
    ===================================================== */

    const {
      data:
        existingProgress,
      error:
        progressError,
    } =
      await supabaseAdmin
        .from(
          "daily_challenge_progress",
        )
        .select(`
          id,
          user_id,
          challenge_date,
          guess_the_player_completed,
          player_quiz_completed,
          tic_tac_toe_completed,
          wordle_completed,
          reward_claimed,
          created_at
        `)
        .eq(
          "user_id",
          user.id,
        )
        .eq(
          "challenge_date",
          challengeDate,
        )
        .maybeSingle();

    if (
      progressError
    ) {
      console.error(
        "Daily challenge progress okunamadı:",
        progressError,
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            "Günlük görev bilgileri okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       4. YOKSA OLUŞTUR
    ===================================================== */

    let progress =
      existingProgress;

    if (
      !progress
    ) {
      const {
        data:
          createdProgress,
        error:
          createError,
      } =
        await supabaseAdmin
          .from(
            "daily_challenge_progress",
          )
          .insert({
            user_id:
              user.id,

            challenge_date:
              challengeDate,

            guess_the_player_completed:
              false,

            player_quiz_completed:
              false,

            tic_tac_toe_completed:
              false,

            wordle_completed:
              false,

            reward_claimed:
              false,
          })
          .select(`
            id,
            user_id,
            challenge_date,
            guess_the_player_completed,
            player_quiz_completed,
            tic_tac_toe_completed,
            wordle_completed,
            reward_claimed,
            created_at
          `)
          .single();

      if (
        createError ||
        !createdProgress
      ) {
        console.error(
          "Daily challenge progress oluşturulamadı:",
          createError,
        );

        return NextResponse.json(
          {
            ok: false,

            error:
              "Günlük görev oluşturulamadı.",
          },
          {
            status: 500,
          },
        );
      }

      progress =
        createdProgress;
    }

    /* =====================================================
       5. COMPLETED COUNT
    ===================================================== */

    const completedCount =
      [
        Boolean(
          progress
            .guess_the_player_completed,
        ),

        Boolean(
          progress
            .player_quiz_completed,
        ),

        Boolean(
          progress
            .tic_tac_toe_completed,
        ),

        Boolean(
          progress
            .wordle_completed,
        ),
      ].filter(
        Boolean,
      ).length;

    const challengeCompleted =
      completedCount >=
      REQUIRED_COMPLETIONS;

    const perfectCompleted =
      completedCount ===
      4;

    const reward =
      perfectCompleted
        ? FOUR_OF_FOUR_REWARD
        : challengeCompleted
          ? THREE_OF_FOUR_REWARD
          : 0;

    /* =====================================================
       6. NEXT GAME
    ===================================================== */

    let nextGame:
      | {
          code: string;
          label: string;
          href: string;
        }
      | null =
      null;

    if (
      !progress
        .guess_the_player_completed
    ) {
      nextGame = {
        code:
          "guess_the_player",

        label:
          "Guess The Player",

        href:
          "/guess-the-player",
      };
    } else if (
      !progress
        .player_quiz_completed
    ) {
      nextGame = {
        code:
          "player_quiz",

        label:
          "Player Quiz",

        href:
          "/player-quiz",
      };
    } else if (
      !progress
        .tic_tac_toe_completed
    ) {
      nextGame = {
        code:
          "tic_tac_toe",

        label:
          "Tic Tac Toe",

        href:
          "/tic-tac-toe",
      };
    } else if (
      !progress
        .wordle_completed
    ) {
      nextGame = {
        code:
          "wordle",

        label:
          "Wordle",

        href:
          "/wordle",
      };
    }

    /* =====================================================
       7. RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      authenticated:
        true,

      challengeDate,

      required:
        REQUIRED_COMPLETIONS,

      totalGames:
        4,

      completedCount,

      challengeCompleted,

      perfectCompleted,

      reward,

      rewardClaimed:
        Boolean(
          progress
            .reward_claimed,
        ),

      progress: {
        guessThePlayer:
          Boolean(
            progress
              .guess_the_player_completed,
          ),

        playerQuiz:
          Boolean(
            progress
              .player_quiz_completed,
          ),

        ticTacToe:
          Boolean(
            progress
              .tic_tac_toe_completed,
          ),

        wordle:
          Boolean(
            progress
              .wordle_completed,
          ),
      },

      nextGame,
    });
  } catch (
    error
  ) {
    console.error(
      "Daily challenge GET error:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof
          Error
            ? error.message
            : "Günlük görev bilgileri alınamadı.",
      },
      {
        status: 500,
      },
    );
  }
}

type DailyChallengeGame =
  | "guess_the_player"
  | "player_quiz"
  | "tic_tac_toe"
  | "wordle";

type DailyChallengePostBody = {
  game?: DailyChallengeGame;
};

const GAME_COLUMN_MAP: Record<
  DailyChallengeGame,
  string
> = {
  guess_the_player:
    "guess_the_player_completed",

  player_quiz:
    "player_quiz_completed",

  tic_tac_toe:
    "tic_tac_toe_completed",

  wordle:
    "wordle_completed",
};

const DAILY_REWARD_3_OF_4 =
  250;

const DAILY_REWARD_4_OF_4 =
  350;

/* =========================================================
   POST
   Oyunu günlük görevde tamamlandı olarak işaretle
========================================================= */

export async function POST(
  request: Request,
) {
  try {
    /* =====================================================
       1. AUTH
    ===================================================== */

    const authClient =
      await createAuthServerClient();

    const {
      data: {
        user,
      },
      error:
        authError,
    } =
      await authClient.auth.getUser();

    if (
      authError ||
      !user
    ) {
      return NextResponse.json(
        {
          ok: false,
          authenticated:
            false,

          error:
            "Günlük görev için giriş yapmalısın.",
        },
        {
          status: 401,
        },
      );
    }

    /* =====================================================
       2. BODY
    ===================================================== */

    const body =
      (await request.json()) as DailyChallengePostBody;

    const game =
      body.game;

    if (
      !game ||
      !GAME_COLUMN_MAP[
        game
      ]
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Geçersiz günlük görev oyunu.",
        },
        {
          status: 400,
        },
      );
    }

    const challengeDate =
      getTodayDate();

    /* =====================================================
       3. BUGÜNKÜ PROGRESS
    ===================================================== */

    const {
      data:
        existingProgress,
      error:
        progressError,
    } =
      await supabaseAdmin
        .from(
          "daily_challenge_progress",
        )
        .select(`
          id,
          guess_the_player_completed,
          player_quiz_completed,
          tic_tac_toe_completed,
          wordle_completed,
          reward_claimed,
          reward_points_awarded
        `)
        .eq(
          "user_id",
          user.id,
        )
        .eq(
          "challenge_date",
          challengeDate,
        )
        .maybeSingle();

    if (
      progressError
    ) {
      console.error(
        "Daily challenge POST progress error:",
        progressError,
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            "Günlük görev bilgileri okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       4. YOKSA KAYIT OLUŞTUR
    ===================================================== */

    let progress =
      existingProgress;

    if (
      !progress
    ) {
      const {
        data:
          createdProgress,
        error:
          createError,
      } =
        await supabaseAdmin
          .from(
            "daily_challenge_progress",
          )
          .insert({
            user_id:
              user.id,

            challenge_date:
              challengeDate,

            guess_the_player_completed:
              false,

            player_quiz_completed:
              false,

            tic_tac_toe_completed:
              false,

            wordle_completed:
              false,

            reward_claimed:
              false,

            reward_points_awarded:
              0,
          })
          .select(`
            id,
            guess_the_player_completed,
            player_quiz_completed,
            tic_tac_toe_completed,
            wordle_completed,
            reward_claimed,
            reward_points_awarded
          `)
          .single();

      if (
        createError ||
        !createdProgress
      ) {
        return NextResponse.json(
          {
            ok: false,

            error:
              "Günlük görev kaydı oluşturulamadı.",
          },
          {
            status: 500,
          },
        );
      }

      progress =
        createdProgress;
    }

    /* =====================================================
       5. BU OYUN ZATEN TAMAMLANDI MI?
    ===================================================== */

    const gameColumn =
      GAME_COLUMN_MAP[
        game
      ];

    const progressRecord =
      progress as unknown as
        Record<
          string,
          unknown
        >;

    if (
      Boolean(
        progressRecord[
          gameColumn
        ],
      )
    ) {
      return NextResponse.json({
        ok: true,

        alreadyCompleted:
          true,

        game,

        rewardAdded:
          0,

        message:
          "Bu oyun bugünkü görevde zaten tamamlandı.",
      });
    }

    /* =====================================================
       6. OYUNU TAMAMLA
    ===================================================== */

    const {
      data:
        updatedProgress,
      error:
        updateError,
    } =
      await supabaseAdmin
        .from(
          "daily_challenge_progress",
        )
        .update({
          [
            gameColumn
          ]:
            true,
        })
        .eq(
          "id",
          progress.id,
        )
        .select(`
          id,
          guess_the_player_completed,
          player_quiz_completed,
          tic_tac_toe_completed,
          wordle_completed,
          reward_claimed,
          reward_points_awarded
        `)
        .single();

    if (
      updateError ||
      !updatedProgress
    ) {
      console.error(
        "Daily challenge game completion error:",
        updateError,
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            "Günlük görev ilerlemesi güncellenemedi.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       7. TAMAMLANAN OYUN SAYISI
    ===================================================== */

    const completedCount =
      [
        updatedProgress
          .guess_the_player_completed,

        updatedProgress
          .player_quiz_completed,

        updatedProgress
          .tic_tac_toe_completed,

        updatedProgress
          .wordle_completed,
      ].filter(
        Boolean,
      ).length;

    /* =====================================================
       8. HEDEF ÖDÜL
    ===================================================== */

    let targetReward =
      0;

    if (
      completedCount >=
      4
    ) {
      targetReward =
        DAILY_REWARD_4_OF_4;
    } else if (
      completedCount >=
      3
    ) {
      targetReward =
        DAILY_REWARD_3_OF_4;
    }

    const alreadyAwarded =
      Number(
        updatedProgress
          .reward_points_awarded ??
          0,
      );

    const rewardToAdd =
      Math.max(
        targetReward -
          alreadyAwarded,
        0,
      );

    /* =====================================================
       9. PUAN EKLE
    ===================================================== */

    let rewardAdded =
      0;

    if (
      rewardToAdd >
      0
    ) {
      const {
        data:
          profile,
        error:
          profileError,
      } =
        await supabaseAdmin
          .from(
            "profiles",
          )
          .select(
            "total_score",
          )
          .eq(
            "id",
            user.id,
          )
          .maybeSingle();

      if (
        profileError ||
        !profile
      ) {
        console.error(
          "Daily challenge profile error:",
          profileError,
        );

        return NextResponse.json(
          {
            ok: false,

            error:
              "Günlük görev puanı profile eklenemedi.",
          },
          {
            status: 500,
          },
        );
      }

      const currentScore =
        Number(
          profile.total_score ??
            0,
        );

      const {
        error:
          scoreUpdateError,
      } =
        await supabaseAdmin
          .from(
            "profiles",
          )
          .update({
            total_score:
              currentScore +
              rewardToAdd,
          })
          .eq(
            "id",
            user.id,
          );

      if (
        scoreUpdateError
      ) {
        console.error(
          "Daily challenge score update error:",
          scoreUpdateError,
        );

        return NextResponse.json(
          {
            ok: false,

            error:
              "Günlük görev puanı eklenemedi.",
          },
          {
            status: 500,
          },
        );
      }

      rewardAdded =
        rewardToAdd;

      const {
        error:
          rewardUpdateError,
      } =
        await supabaseAdmin
          .from(
            "daily_challenge_progress",
          )
          .update({
            reward_points_awarded:
              targetReward,

            reward_claimed:
              completedCount >=
              3,
          })
          .eq(
            "id",
            updatedProgress.id,
          );

      if (
        rewardUpdateError
      ) {
        console.error(
          "Daily challenge reward status error:",
          rewardUpdateError,
        );
      }
    }

    /* =====================================================
       10. NEXT GAME
    ===================================================== */

    let nextGame:
      | {
          code: string;
          label: string;
          href: string;
        }
      | null =
      null;

    if (
      !updatedProgress
        .guess_the_player_completed
    ) {
      nextGame = {
        code:
          "guess_the_player",

        label:
          "Guess The Player",

        href:
          "/guess-the-player",
      };
    } else if (
      !updatedProgress
        .player_quiz_completed
    ) {
      nextGame = {
        code:
          "player_quiz",

        label:
          "Player Quiz",

        href:
          "/player-quiz",
      };
    } else if (
      !updatedProgress
        .tic_tac_toe_completed
    ) {
      nextGame = {
        code:
          "tic_tac_toe",

        label:
          "Tic Tac Toe",

        href:
          "/tic-tac-toe",
      };
    } else if (
      !updatedProgress
        .wordle_completed
    ) {
      nextGame = {
        code:
          "wordle",

        label:
          "Wordle",

        href:
          "/wordle",
      };
    }

    /* =====================================================
       11. RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      alreadyCompleted:
        false,

      game,

      completedCount,

      required:
        3,

      totalGames:
        4,

      challengeCompleted:
        completedCount >=
        3,

      perfectCompleted:
        completedCount ===
        4,

      rewardAdded,

      totalDailyReward:
        Math.max(
          alreadyAwarded +
            rewardAdded,
          targetReward,
        ),

      nextGame,

      progress: {
        guessThePlayer:
          Boolean(
            updatedProgress
              .guess_the_player_completed,
          ),

        playerQuiz:
          Boolean(
            updatedProgress
              .player_quiz_completed,
          ),

        ticTacToe:
          Boolean(
            updatedProgress
              .tic_tac_toe_completed,
          ),

        wordle:
          Boolean(
            updatedProgress
              .wordle_completed,
          ),
      },
    });
  } catch (
    error
  ) {
    console.error(
      "Daily challenge POST error:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof
          Error
            ? error.message
            : "Günlük görev güncellenemedi.",
      },
      {
        status: 500,
      },
    );
  }
}