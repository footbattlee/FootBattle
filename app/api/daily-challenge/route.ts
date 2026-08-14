import { NextResponse } from "next/server";

import {
  createAuthServerClient,
} from "@/lib/supabase/auth-server";

import {
  supabaseAdmin,
} from "@/lib/supabase/server";

const REQUIRED_COMPLETIONS = 3;
const THREE_OF_FOUR_REWARD = 250;
const FOUR_OF_FOUR_REWARD = 350;

type DailyChallengeGame =
  | "guess_the_player"
  | "player_quiz"
  | "tic_tac_toe"
  | "wordle";

type DailyChallengeAction =
  | "start"
  | "complete";

type DailyChallengePostBody = {
  game?: DailyChallengeGame;
  action?: DailyChallengeAction;
};

type DailyChallengeProgressRow = {
  id: number | string;
  user_id?: string;
  challenge_date?: string;

  guess_the_player_completed: boolean;
  player_quiz_completed: boolean;
  tic_tac_toe_completed: boolean;
  wordle_completed: boolean;

  guess_the_player_attempted: boolean;
  player_quiz_attempted: boolean;
  tic_tac_toe_attempted: boolean;
  wordle_attempted: boolean;

  reward_claimed: boolean;
  reward_points_awarded: number;

  created_at?: string;
};

const GAME_COLUMN_MAP: Record<
  DailyChallengeGame,
  keyof DailyChallengeProgressRow
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

const GAME_ATTEMPTED_COLUMN_MAP: Record<
  DailyChallengeGame,
  keyof DailyChallengeProgressRow
> = {
  guess_the_player:
    "guess_the_player_attempted",

  player_quiz:
    "player_quiz_attempted",

  tic_tac_toe:
    "tic_tac_toe_attempted",

  wordle:
    "wordle_attempted",
};

const PROGRESS_SELECT = `
  id,
  user_id,
  challenge_date,
  guess_the_player_completed,
  player_quiz_completed,
  tic_tac_toe_completed,
  wordle_completed,
  guess_the_player_attempted,
  player_quiz_attempted,
  tic_tac_toe_attempted,
  wordle_attempted,
  reward_claimed,
  reward_points_awarded,
  created_at
`;

function getTodayDate() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "Europe/Istanbul",

      year:
        "numeric",

      month:
        "2-digit",

      day:
        "2-digit",
    },
  ).format(
    new Date(),
  );
}

function getCompletedCount(
  progress: DailyChallengeProgressRow,
) {
  return [
    progress
      .guess_the_player_completed,

    progress
      .player_quiz_completed,

    progress
      .tic_tac_toe_completed,

    progress
      .wordle_completed,
  ].filter(
    Boolean,
  ).length;
}

function getTargetReward(
  completedCount: number,
) {
  if (
    completedCount >= 4
  ) {
    return FOUR_OF_FOUR_REWARD;
  }

  if (
    completedCount >=
    REQUIRED_COMPLETIONS
  ) {
    return THREE_OF_FOUR_REWARD;
  }

  return 0;
}

function getNextGame(
  progress: DailyChallengeProgressRow,
) {
  if (
    !progress
      .guess_the_player_attempted
  ) {
    return {
      code:
        "guess_the_player",

      label:
        "Guess The Player",

      href:
        "/guess-the-player",
    };
  }

  if (
    !progress
      .player_quiz_attempted
  ) {
    return {
      code:
        "player_quiz",

      label:
        "Player Quiz",

      href:
        "/player-quiz",
    };
  }

  if (
    !progress
      .tic_tac_toe_attempted
  ) {
    return {
      code:
        "tic_tac_toe",

      label:
        "Tic Tac Toe",

      href:
        "/tic-tac-toe",
    };
  }

  if (
    !progress
      .wordle_attempted
  ) {
    return {
      code:
        "wordle",

      label:
        "Wordle",

      href:
        "/wordle",
    };
  }

  return null;
}

function buildProgressResponse(
  progress: DailyChallengeProgressRow,
) {
  const completedCount =
    getCompletedCount(
      progress,
    );

  return {
    completedCount,

    challengeCompleted:
      completedCount >=
      REQUIRED_COMPLETIONS,

    perfectCompleted:
      completedCount === 4,

    reward:
      getTargetReward(
        completedCount,
      ),

    rewardClaimed:
      Boolean(
        progress
          .reward_claimed,
      ),

    rewardPointsAwarded:
      Number(
        progress
          .reward_points_awarded ??
          0,
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

    attempted: {
      guessThePlayer:
        Boolean(
          progress
            .guess_the_player_attempted,
        ),

      playerQuiz:
        Boolean(
          progress
            .player_quiz_attempted,
        ),

      ticTacToe:
        Boolean(
          progress
            .tic_tac_toe_attempted,
        ),

      wordle:
        Boolean(
          progress
            .wordle_attempted,
        ),
    },

    failed: {
      guessThePlayer:
        Boolean(
          progress
            .guess_the_player_attempted,
        ) &&
        !Boolean(
          progress
            .guess_the_player_completed,
        ),

      playerQuiz:
        Boolean(
          progress
            .player_quiz_attempted,
        ) &&
        !Boolean(
          progress
            .player_quiz_completed,
        ),

      ticTacToe:
        Boolean(
          progress
            .tic_tac_toe_attempted,
        ) &&
        !Boolean(
          progress
            .tic_tac_toe_completed,
        ),

      wordle:
        Boolean(
          progress
            .wordle_attempted,
        ) &&
        !Boolean(
          progress
            .wordle_completed,
        ),
    },

    nextGame:
      getNextGame(
        progress,
      ),
  };
}

async function getOrCreateProgress(
  userId: string,
  challengeDate: string,
): Promise<DailyChallengeProgressRow> {
  const {
    data:
      rawExistingProgress,

    error:
      progressError,
  } =
    await supabaseAdmin
      .from(
        "daily_challenge_progress",
      )
      .select(
        PROGRESS_SELECT,
      )
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "challenge_date",
        challengeDate,
      )
      .maybeSingle();

  if (
    progressError
  ) {
    throw new Error(
      `Günlük görev bilgileri okunamadı: ${progressError.message}`,
    );
  }

  if (
    rawExistingProgress
  ) {
    return rawExistingProgress as unknown as
      DailyChallengeProgressRow;
  }

  /*
   * DB TypeScript tipleri yeni attempted kolonlarını henüz
   * tanımıyorsa bile bu payload bilinçli olarak any geçiliyor.
   */
  const insertPayload = {
    user_id:
      userId,

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

    guess_the_player_attempted:
      false,

    player_quiz_attempted:
      false,

    tic_tac_toe_attempted:
      false,

    wordle_attempted:
      false,

    reward_claimed:
      false,

    reward_points_awarded:
      0,
  } as any;

  const {
    data:
      rawCreatedProgress,

    error:
      createError,
  } =
    await supabaseAdmin
      .from(
        "daily_challenge_progress",
      )
      .insert(
        insertPayload,
      )
      .select(
        PROGRESS_SELECT,
      )
      .single();

  if (
    createError ||
    !rawCreatedProgress
  ) {
    throw new Error(
      createError
        ? `Günlük görev oluşturulamadı: ${createError.message}`
        : "Günlük görev oluşturulamadı.",
    );
  }

  return rawCreatedProgress as unknown as
    DailyChallengeProgressRow;
}

/* =========================================================
   GET
========================================================= */

export async function GET() {
  try {
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

    const challengeDate =
      getTodayDate();

    const progress =
      await getOrCreateProgress(
        user.id,
        challengeDate,
      );

    const summary =
      buildProgressResponse(
        progress,
      );

    return NextResponse.json({
      ok: true,

      authenticated:
        true,

      challengeDate,

      required:
        REQUIRED_COMPLETIONS,

      totalGames:
        4,

      ...summary,
    });
  } catch (error) {
    console.error(
      "Daily challenge GET error:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Günlük görev bilgileri alınamadı.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   POST

   action = start
   → günlük oyun hakkını kullanıldı olarak işaretler.

   action = complete
   → oyunu başarıyla tamamlandı olarak işaretler.
========================================================= */

export async function POST(
  request: Request,
) {
  try {
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

    const body =
      (await request.json()) as
        DailyChallengePostBody;

    const game =
      body.game;

    const action =
      body.action ??
      "complete";

    if (
      !game ||
      !GAME_COLUMN_MAP[
        game
      ] ||
      !GAME_ATTEMPTED_COLUMN_MAP[
        game
      ] ||
      (
        action !==
          "start" &&
        action !==
          "complete"
      )
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Geçersiz günlük görev isteği.",
        },
        {
          status: 400,
        },
      );
    }

    const challengeDate =
      getTodayDate();

    let progress =
      await getOrCreateProgress(
        user.id,
        challengeDate,
      );

    const gameColumn =
      GAME_COLUMN_MAP[
        game
      ];

    const attemptedColumn =
      GAME_ATTEMPTED_COLUMN_MAP[
        game
      ];

    /* =====================================================
       START
    ===================================================== */

    if (
      action ===
      "start"
    ) {
      if (
        Boolean(
          progress[
            attemptedColumn
          ],
        )
      ) {
        return NextResponse.json(
          {
            ok: false,

            game,

            alreadyAttempted:
              true,

            error:
              "Bugünkü bu görev hakkını zaten kullandın.",
          },
          {
            status: 409,
          },
        );
      }

      const updatePayload = {
        [
          attemptedColumn
        ]:
          true,
      } as any;

      const {
        data:
          rawStartedProgress,

        error:
          startError,
      } =
        await supabaseAdmin
          .from(
            "daily_challenge_progress",
          )
          .update(
            updatePayload,
          )
          .eq(
            "id",
            progress.id,
          )
          .select(
            PROGRESS_SELECT,
          )
          .single();

      if (
        startError ||
        !rawStartedProgress
      ) {
        console.error(
          "Daily challenge start error:",
          startError,
        );

        return NextResponse.json(
          {
            ok: false,

            error:
              "Günlük görev hakkı başlatılamadı.",
          },
          {
            status: 500,
          },
        );
      }

      progress =
        rawStartedProgress as unknown as
          DailyChallengeProgressRow;

      return NextResponse.json({
        ok: true,

        game,

        started:
          true,

        alreadyAttempted:
          false,

        required:
          REQUIRED_COMPLETIONS,

        totalGames:
          4,

        ...buildProgressResponse(
          progress,
        ),
      });
    }

    /* =====================================================
       COMPLETE
    ===================================================== */

    if (
      Boolean(
        progress[
          gameColumn
        ],
      )
    ) {
      return NextResponse.json({
        ok: true,

        game,

        alreadyCompleted:
          true,

        rewardAdded:
          0,

        required:
          REQUIRED_COMPLETIONS,

        totalGames:
          4,

        ...buildProgressResponse(
          progress,
        ),

        message:
          "Bu oyun bugünkü görevde zaten tamamlandı.",
      });
    }

    const completePayload = {
      [
        gameColumn
      ]:
        true,

      [
        attemptedColumn
      ]:
        true,
    } as any;

    const {
      data:
        rawUpdatedProgress,

      error:
        updateError,
    } =
      await supabaseAdmin
        .from(
          "daily_challenge_progress",
        )
        .update(
          completePayload,
        )
        .eq(
          "id",
          progress.id,
        )
        .select(
          PROGRESS_SELECT,
        )
        .single();

    if (
      updateError ||
      !rawUpdatedProgress
    ) {
      console.error(
        "Daily challenge completion error:",
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

    progress =
      rawUpdatedProgress as unknown as
        DailyChallengeProgressRow;

    /* =====================================================
       REWARD
    ===================================================== */

    const completedCount =
      getCompletedCount(
        progress,
      );

    const targetReward =
      getTargetReward(
        completedCount,
      );

    const alreadyAwarded =
      Number(
        progress
          .reward_points_awarded ??
          0,
      );

    const rewardToAdd =
      Math.max(
        targetReward -
          alreadyAwarded,
        0,
      );

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

      const rewardPayload = {
        reward_points_awarded:
          targetReward,

        reward_claimed:
          completedCount >=
          REQUIRED_COMPLETIONS,
      } as any;

      const {
        data:
          rawRewardProgress,

        error:
          rewardUpdateError,
      } =
        await supabaseAdmin
          .from(
            "daily_challenge_progress",
          )
          .update(
            rewardPayload,
          )
          .eq(
            "id",
            progress.id,
          )
          .select(
            PROGRESS_SELECT,
          )
          .single();

      if (
        rewardUpdateError
      ) {
        console.error(
          "Daily challenge reward status error:",
          rewardUpdateError,
        );
      } else if (
        rawRewardProgress
      ) {
        progress =
          rawRewardProgress as unknown as
            DailyChallengeProgressRow;
      }
    }

    return NextResponse.json({
      ok: true,

      game,

      alreadyCompleted:
        false,

      rewardAdded,

      required:
        REQUIRED_COMPLETIONS,

      totalGames:
        4,

      ...buildProgressResponse(
        progress,
      ),
    });
  } catch (error) {
    console.error(
      "Daily challenge POST error:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Günlük görev güncellenemedi.",
      },
      {
        status: 500,
      },
    );
  }
}