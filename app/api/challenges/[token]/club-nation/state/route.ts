import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

/* =========================================================
   TYPES
========================================================= */

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

type ChallengeRow = {
  id: number;

  invite_token: string;

  game_code: string;

  status: string;

  challenger_user_id:
    | string
    | null;

  challenger_guest_id:
    | string
    | null;

  opponent_user_id:
    | string
    | null;

  opponent_guest_id:
    | string
    | null;

  challenger_score:
    | number
    | null;

  opponent_score:
    | number
    | null;

  winner_side:
    | string
    | null;

  completed_at:
    | string
    | null;

  created_at:
    | string
    | null;

  updated_at:
    | string
    | null;
};

type RoundRow = {
  id: number;

  challenge_id: number;

  round_no: number;

  game_code: string;

  left_type: string;

  left_value: string;

  right_type: string;

  right_value: string;

  winner_side:
    | string
    | null;

  challenger_answer:
    | string
    | null;

  opponent_answer:
    | string
    | null;

  challenger_answer_player_id:
    | number
    | null;

  opponent_answer_player_id:
    | number
    | null;

  challenger_answered_at:
    | string
    | null;

  opponent_answered_at:
    | string
    | null;

  completed_at:
    | string
    | null;

  created_at:
    | string
    | null;
};

/* =========================================================
   SETTINGS
========================================================= */

const GUEST_COOKIE_NAME =
  "footbattle_guest";

const WIN_SCORE =
  3;

const ROUND_COUNT =
  5;

/* =========================================================
   HELPERS
========================================================= */

function sanitizeToken(
  value: unknown,
) {
  return String(
    value ?? "",
  )
    .trim()
    .replace(
      /[^a-zA-Z0-9]/g,
      "",
    )
    .slice(
      0,
      64,
    );
}

function mapRound(
  round: RoundRow,
) {
  return {
    id:
      Number(
        round.id,
      ),

    roundNo:
      Number(
        round.round_no,
      ),

    left: {
      type:
        round.left_type,

      value:
        round.left_value,
    },

    right: {
      type:
        round.right_type,

      value:
        round.right_value,
    },

    winnerSide:
      round.winner_side,

    completed:
      Boolean(
        round.completed_at,
      ),

    completedAt:
      round.completed_at,

    challenger: {
      answer:
        round.challenger_answer,

      playerId:
        round
          .challenger_answer_player_id,

      answeredAt:
        round
          .challenger_answered_at,
    },

    opponent: {
      answer:
        round.opponent_answer,

      playerId:
        round
          .opponent_answer_player_id,

      answeredAt:
        round
          .opponent_answered_at,
    },
  };
}

/* =========================================================
   SCORE FROM ROUNDS
========================================================= */

function calculateScore(
  rounds: RoundRow[],
) {
  const completedRounds =
    rounds.filter(
      (
        round,
      ) =>
        Boolean(
          round.completed_at,
        ),
    );

  const challenger =
    completedRounds.filter(
      (
        round,
      ) =>
        round.winner_side ===
        "challenger",
    ).length;

  const opponent =
    completedRounds.filter(
      (
        round,
      ) =>
        round.winner_side ===
        "opponent",
    ).length;

  return {
    challenger,

    opponent,
  };
}

/* =========================================================
   FIND CURRENT ROUND
========================================================= */

function findCurrentRound(
  rounds: RoundRow[],
) {
  return (
    rounds.find(
      (
        round,
      ) =>
        !round.completed_at,
    ) ??
    null
  );
}

/* =========================================================
   GET
========================================================= */

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    /* =====================================================
       TOKEN
    ===================================================== */

    const {
      token:
        rawToken,
    } =
      await context.params;

    const token =
      sanitizeToken(
        rawToken,
      );

    if (!token) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Geçerli challenge bulunamadı.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       AUTH / GUEST
    ===================================================== */

    const authSupabase =
      await createAuthServerClient();

    const {
      data: {
        user,
      },
    } =
      await authSupabase
        .auth
        .getUser();

    const cookieStore =
      await cookies();

    const guestId =
      cookieStore.get(
        GUEST_COOKIE_NAME,
      )?.value ??
      null;

    /* =====================================================
       CHALLENGE
    ===================================================== */

    const {
      data:
        challengeData,
      error:
        challengeError,
    } =
      await supabaseAdmin
        .from(
          "guest_challenges",
        )
        .select(`
          id,
          invite_token,
          game_code,
          status,

          challenger_user_id,
          challenger_guest_id,

          opponent_user_id,
          opponent_guest_id,

          challenger_score,
          opponent_score,

          winner_side,
          completed_at,

          created_at,
          updated_at
        `)
        .eq(
          "invite_token",
          token,
        )
        .maybeSingle();

    if (
      challengeError
    ) {
      throw challengeError;
    }

    if (
      !challengeData
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Challenge bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    const challenge =
      challengeData as ChallengeRow;

    /* =====================================================
       ACCESS
    ===================================================== */

    const isChallenger =
      user
        ? challenge
            .challenger_user_id ===
          user.id
        : Boolean(
            guestId &&
              challenge
                .challenger_guest_id ===
                guestId,
          );

    const isOpponent =
      user
        ? challenge
            .opponent_user_id ===
          user.id
        : Boolean(
            guestId &&
              challenge
                .opponent_guest_id ===
                guestId,
          );

    if (
      !isChallenger &&
      !isOpponent
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Bu challenge'a erişim yetkin yok.",
        },
        {
          status: 403,
        },
      );
    }

    const role:
      | "challenger"
      | "opponent" =
      isChallenger
        ? "challenger"
        : "opponent";

    /* =====================================================
       GAME CONTROL
    ===================================================== */

    if (
      challenge.game_code !==
      "club_nation"
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Bu challenge 1 Takım 1 Millet değil.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       ROUNDS
    ===================================================== */

    const {
      data:
        roundData,
      error:
        roundError,
    } =
      await supabaseAdmin
        .from(
          "challenge_rounds",
        )
        .select(`
          id,
          challenge_id,
          round_no,
          game_code,

          left_type,
          left_value,

          right_type,
          right_value,

          winner_side,

          challenger_answer,
          opponent_answer,

          challenger_answer_player_id,
          opponent_answer_player_id,

          challenger_answered_at,
          opponent_answered_at,

          completed_at,
          created_at
        `)
        .eq(
          "challenge_id",
          challenge.id,
        )
        .eq(
          "game_code",
          "club_nation",
        )
        .order(
          "round_no",
          {
            ascending:
              true,
          },
        );

    if (
      roundError
    ) {
      throw roundError;
    }

    const rounds =
      (
        roundData ??
        []
      ) as RoundRow[];

    /* =====================================================
       SCORE

       Roundlardan hesaplamak daha güvenli.
    ===================================================== */

    const calculatedScore =
      calculateScore(
        rounds,
      );

    const storedChallengerScore =
      Number(
        challenge
          .challenger_score ??
          0,
      );

    const storedOpponentScore =
      Number(
        challenge
          .opponent_score ??
          0,
      );

    const score = {
      challenger:
        Math.max(
          storedChallengerScore,
          calculatedScore.challenger,
        ),

      opponent:
        Math.max(
          storedOpponentScore,
          calculatedScore.opponent,
        ),
    };

    /* =====================================================
       WINNER
    ===================================================== */

    const calculatedWinner =
      score.challenger >=
      WIN_SCORE
        ? "challenger"
        : score.opponent >=
            WIN_SCORE
          ? "opponent"
          : null;

    const winnerSide =
      challenge.winner_side ??
      calculatedWinner;

    /* =====================================================
       CURRENT ROUND
    ===================================================== */

    const currentRound =
      findCurrentRound(
        rounds,
      );

    const completedRoundCount =
      rounds.filter(
        (
          round,
        ) =>
          Boolean(
            round.completed_at,
          ),
      ).length;

    /* =====================================================
       CHALLENGE STATUS
    ===================================================== */

    const completed =
      challenge.status ===
        "completed" ||
      Boolean(
        challenge.completed_at,
      ) ||
      Boolean(
        winnerSide,
      );

    const prepared =
      rounds.length >
      0;

    const readyToPlay =
      rounds.length ===
        ROUND_COUNT &&
      (
        challenge.status ===
          "ready" ||
        challenge.status ===
          "playing"
      );

    /* =====================================================
       ROLE-SPECIFIC CURRENT ANSWER
    ===================================================== */

    const myCurrentAnswer =
      currentRound
        ? role ===
          "challenger"
          ? {
              answer:
                currentRound
                  .challenger_answer,

              playerId:
                currentRound
                  .challenger_answer_player_id,

              answeredAt:
                currentRound
                  .challenger_answered_at,
            }
          : {
              answer:
                currentRound
                  .opponent_answer,

              playerId:
                currentRound
                  .opponent_answer_player_id,

              answeredAt:
                currentRound
                  .opponent_answered_at,
            }
        : null;

    const opponentCurrentAnswer =
      currentRound
        ? role ===
          "challenger"
          ? {
              answer:
                currentRound
                  .opponent_answer,

              playerId:
                currentRound
                  .opponent_answer_player_id,

              answeredAt:
                currentRound
                  .opponent_answered_at,
            }
          : {
              answer:
                currentRound
                  .challenger_answer,

              playerId:
                currentRound
                  .challenger_answer_player_id,

              answeredAt:
                currentRound
                  .challenger_answered_at,
            }
        : null;

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      role,

      game: {
        code:
          "club_nation",

        label:
          "1 Takım 1 Millet",

        roundCount:
          ROUND_COUNT,

        winScore:
          WIN_SCORE,
      },

      challenge: {
        id:
          challenge.id,

        status:
          challenge.status,

        prepared,

        readyToPlay,

        completed,

        winnerSide,

        createdAt:
          challenge.created_at,

        updatedAt:
          challenge.updated_at,

        completedAt:
          challenge.completed_at,
      },

      score,

      progress: {
        completedRounds:
          completedRoundCount,

        totalRounds:
          ROUND_COUNT,

        remainingRounds:
          Math.max(
            0,
            ROUND_COUNT -
              completedRoundCount,
          ),
      },

      currentRound:
        currentRound
          ? mapRound(
              currentRound,
            )
          : null,

      myCurrentAnswer,

      opponentCurrentAnswer,

      rounds:
        rounds.map(
          mapRound,
        ),
    });
  } catch (
    error
  ) {
    console.error(
      "Guest Club Nation state endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "1 Takım 1 Millet maç durumu okunamadı.",
      },
      {
        status: 500,
      },
    );
  }
}