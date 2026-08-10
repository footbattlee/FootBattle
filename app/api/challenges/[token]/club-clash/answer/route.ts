import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  matchesBothConstraints,
  normalizeChallengeText,
} from "@/lib/challenges/player-matcher";

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

type AnswerBody = {
  playerId?: number | null;
  answer?: string;
};

type ChallengeSide =
  | "challenger"
  | "opponent";

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

  challenger_score: number;
  opponent_score: number;

  winner_side:
    | "challenger"
    | "opponent"
    | "draw"
    | null;
};

type ChallengeRoundRow = {
  id: number;
  challenge_id: number;
  round_no: number;
  game_code: string;

  left_type: string;
  left_value: string;

  right_type: string;
  right_value: string;

  winner_side:
    | ChallengeSide
    | "draw"
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
};

type GuessPlayer = {
  player_id: number;
  name: string;
  name_normalized:
    | string
    | null;
  current_club_name:
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

/* =========================================================
   PLAYER RESOLVE
========================================================= */

async function resolvePlayer(
  playerId: number | null,
  rawAnswer: string,
) {
  /* -------------------------------------------------------
     1. AUTOCOMPLETE PLAYER ID
  ------------------------------------------------------- */

  if (
    playerId &&
    Number.isInteger(
      playerId,
    ) &&
    playerId > 0
  ) {
    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "guess_players",
        )
        .select(`
          player_id,
          name,
          name_normalized,
          current_club_name
        `)
        .eq(
          "player_id",
          playerId,
        )
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return {
        ok: false as const,

        status:
          404,

        error:
          "Seçilen futbolcu bulunamadı.",
      };
    }

    return {
      ok: true as const,

      player:
        data as GuessPlayer,
    };
  }

  /* -------------------------------------------------------
     2. FREE TEXT
  ------------------------------------------------------- */

  const normalizedAnswer =
    normalizeChallengeText(
      rawAnswer,
    );

  if (
    normalizedAnswer.length <
    2
  ) {
    return {
      ok: false as const,

      status:
        400,

      error:
        "Futbolcu adı veya soyadı yazmalısın.",
    };
  }

  /* -------------------------------------------------------
     3. EXACT FULL NAME
  ------------------------------------------------------- */

  const {
    data:
      exactPlayers,

    error:
      exactError,
  } =
    await supabaseAdmin
      .from(
        "guess_players",
      )
      .select(`
        player_id,
        name,
        name_normalized,
        current_club_name
      `)
      .eq(
        "name_normalized",
        normalizedAnswer,
      )
      .limit(
        10,
      );

  if (
    exactError
  ) {
    throw exactError;
  }

  if (
    exactPlayers &&
    exactPlayers.length ===
      1
  ) {
    return {
      ok: true as const,

      player:
        exactPlayers[0] as GuessPlayer,
    };
  }

  if (
    exactPlayers &&
    exactPlayers.length >
      1
  ) {
    return {
      ok: false as const,

      status:
        409,

      ambiguous:
        true,

      error:
        "Bu isimde birden fazla futbolcu bulundu. Listeden seçim yap.",
    };
  }

  /* -------------------------------------------------------
     4. EXACT SURNAME
  ------------------------------------------------------- */

  const {
    data:
      surnameCandidates,

    error:
      surnameError,
  } =
    await supabaseAdmin
      .from(
        "guess_players",
      )
      .select(`
        player_id,
        name,
        name_normalized,
        current_club_name
      `)
      .ilike(
        "name_normalized",
        `%${normalizedAnswer}%`,
      )
      .limit(
        50,
      );

  if (
    surnameError
  ) {
    throw surnameError;
  }

  const exactSurnameMatches =
    (
      surnameCandidates ??
      []
    ).filter(
      (
        player,
      ) => {
        const normalizedName =
          normalizeChallengeText(
            player.name_normalized ??
              player.name ??
              "",
          );

        const parts =
          normalizedName
            .split(
              " ",
            )
            .filter(
              Boolean,
            );

        const surname =
          parts[
            parts.length -
              1
          ] ??
          "";

        return (
          surname ===
          normalizedAnswer
        );
      },
    );

  if (
    exactSurnameMatches.length ===
    1
  ) {
    return {
      ok: true as const,

      player:
        exactSurnameMatches[0] as GuessPlayer,
    };
  }

  if (
    exactSurnameMatches.length >
    1
  ) {
    return {
      ok: false as const,

      status:
        409,

      ambiguous:
        true,

      error:
        "Bu soyadında birden fazla futbolcu bulundu. Listeden seçim yap.",

      players:
        exactSurnameMatches
          .slice(
            0,
            10,
          )
          .map(
            (
              player,
            ) => ({
              playerId:
                Number(
                  player.player_id,
                ),

              name:
                player.name,

              currentClubName:
                player.current_club_name ??
                null,
            }),
          ),
    };
  }

  return {
    ok: false as const,

    status:
      404,

    error:
      "Bu isim veya soyadla eşleşen futbolcu bulunamadı.",
  };
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    /* =====================================================
       TOKEN
    ===================================================== */

    const {
      token: rawToken,
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
          status:
            400,
        },
      );
    }

    /* =====================================================
       BODY
    ===================================================== */

    const body =
      (await request.json()) as AnswerBody;

    const rawAnswer =
      body.answer
        ?.trim() ??
      "";

    const playerId =
      body.playerId
        ? Number(
            body.playerId,
          )
        : null;

    if (
      !playerId &&
      !rawAnswer
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Bir futbolcu seçmeli veya isim yazmalısın.",
        },
        {
          status:
            400,
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
      await authSupabase.auth.getUser();

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

          winner_side
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
          status:
            404,
        },
      );
    }

    const challenge =
      challengeData as ChallengeRow;

    /* =====================================================
       ROLE
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
            "Bu challenge'da oyuncu değilsin.",
        },
        {
          status:
            403,
        },
      );
    }

    const role:
      ChallengeSide =
      isChallenger
        ? "challenger"
        : "opponent";

    /* =====================================================
       GAME CONTROL
    ===================================================== */

    if (
      challenge.game_code !==
      "club_clash"
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Bu challenge 2 Takım 1 Oyuncu değil.",
        },
        {
          status:
            409,
        },
      );
    }

    if (
      challenge.status !==
      "playing"
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            challenge.status ===
            "completed"
              ? "Bu challenge zaten tamamlandı."
              : "Challenge şu anda aktif değil.",
        },
        {
          status:
            409,
        },
      );
    }

    /* =====================================================
       CURRENT ROUND
    ===================================================== */

    const {
      data:
        currentRoundData,

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

          completed_at
        `)
        .eq(
          "challenge_id",
          challenge.id,
        )
        .eq(
          "game_code",
          "club_clash",
        )
        .is(
          "completed_at",
          null,
        )
        .order(
          "round_no",
          {
            ascending:
              true,
          },
        )
        .limit(
          1,
        )
        .maybeSingle();

    if (
      roundError
    ) {
      throw roundError;
    }

    if (
      !currentRoundData
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Aktif round bulunamadı.",
        },
        {
          status:
            409,
        },
      );
    }

    const currentRound =
      currentRoundData as ChallengeRoundRow;

    /* =====================================================
       PLAYER RESOLVE
    ===================================================== */

    const resolved =
      await resolvePlayer(
        playerId,
        rawAnswer,
      );

    if (
      !resolved.ok
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            resolved.error,

          ambiguous:
            "ambiguous" in
            resolved
              ? resolved.ambiguous
              : false,

          players:
            "players" in
            resolved
              ? resolved.players
              : undefined,
        },
        {
          status:
            resolved.status,
        },
      );
    }

    const player =
      resolved.player;

    /* =====================================================
       CONSTRAINT CHECK
    ===================================================== */

    const match =
      await matchesBothConstraints(
        Number(
          player.player_id,
        ),

        {
          type:
            currentRound.left_type as
              | "club"
              | "country",

          value:
            currentRound.left_value,
        },

        {
          type:
            currentRound.right_type as
              | "club"
              | "country",

          value:
            currentRound.right_value,
        },
      );

    const isCorrect =
      match.matches;

    /* =====================================================
       ATTEMPT
    ===================================================== */

    const {
      error:
        attemptError,
    } =
      await supabaseAdmin
        .from(
          "challenge_attempts",
        )
        .insert({
          challenge_id:
            challenge.id,

          round_id:
            currentRound.id,

          player_side:
            role,

          player_id:
            Number(
              player.player_id,
            ),

          answer_text:
            player.name,

          is_correct:
            isCorrect,
        });

    if (
      attemptError
    ) {
      console.error(
        "Guest Club Clash attempt kayıt hatası:",
        attemptError,
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            "Cevap kaydedilemedi.",
        },
        {
          status:
            500,
        },
      );
    }

    /* =====================================================
       WRONG
    ===================================================== */

    if (
      !isCorrect
    ) {
      return NextResponse.json({
        ok: true,

        correct:
          false,

        won:
          false,

        roundCompleted:
          false,

        gameFinished:
          false,

        role,

        player: {
          playerId:
            Number(
              player.player_id,
            ),

          name:
            player.name,
        },

        constraints:
          match.constraints,

        message:
          `${player.name} iki koşulu da karşılamıyor. Tekrar dene.`,
      });
    }

    /* =====================================================
       CORRECT — ROUND LOCK
    ===================================================== */

    const now =
      new Date().toISOString();

    const roundUpdate =
      role ===
      "challenger"
        ? {
            winner_side:
              "challenger",

            challenger_answer:
              player.name,

            challenger_answer_player_id:
              Number(
                player.player_id,
              ),

            challenger_answered_at:
              now,

            completed_at:
              now,
          }
        : {
            winner_side:
              "opponent",

            opponent_answer:
              player.name,

            opponent_answer_player_id:
              Number(
                player.player_id,
              ),

            opponent_answered_at:
              now,

            completed_at:
              now,
          };

    const {
      data:
        wonRound,

      error:
        winError,
    } =
      await supabaseAdmin
        .from(
          "challenge_rounds",
        )
        .update(
          roundUpdate,
        )
        .eq(
          "id",
          currentRound.id,
        )
        .is(
          "completed_at",
          null,
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

          completed_at
        `)
        .maybeSingle();

    if (
      winError
    ) {
      throw winError;
    }

    /* =====================================================
       OTHER PLAYER WON RACE
    ===================================================== */

    if (
      !wonRound
    ) {
      return NextResponse.json({
        ok: true,

        correct:
          true,

        won:
          false,

        roundCompleted:
          true,

        gameFinished:
          false,

        role,

        player: {
          playerId:
            Number(
              player.player_id,
            ),

          name:
            player.name,
        },

        message:
          "Cevabın doğru ama rakibin senden önce davrandı.",
      });
    }

    /* =====================================================
       COMPLETED ROUNDS
    ===================================================== */

    const {
      data:
        completedRounds,

      error:
        completedRoundsError,
    } =
      await supabaseAdmin
        .from(
          "challenge_rounds",
        )
        .select(`
          id,
          round_no,
          winner_side,
          completed_at
        `)
        .eq(
          "challenge_id",
          challenge.id,
        )
        .eq(
          "game_code",
          "club_clash",
        )
        .not(
          "completed_at",
          "is",
          null,
        );

    if (
      completedRoundsError
    ) {
      throw completedRoundsError;
    }

    /* =====================================================
       SCORE
    ===================================================== */

    const challengerScore =
      (
        completedRounds ??
        []
      ).filter(
        (
          round,
        ) =>
          round.winner_side ===
          "challenger",
      ).length;

    const opponentScore =
      (
        completedRounds ??
        []
      ).filter(
        (
          round,
        ) =>
          round.winner_side ===
          "opponent",
      ).length;

    /* =====================================================
       FIRST TO 3
    ===================================================== */

    const gameFinished =
      challengerScore >=
        WIN_SCORE ||
      opponentScore >=
        WIN_SCORE;

    let winnerSide:
      | ChallengeSide
      | null =
      null;

    if (
      challengerScore >=
      WIN_SCORE
    ) {
      winnerSide =
        "challenger";
    }

    if (
      opponentScore >=
      WIN_SCORE
    ) {
      winnerSide =
        "opponent";
    }

    /* =====================================================
       CHALLENGE UPDATE
    ===================================================== */

    const challengeUpdate: {
      challenger_score: number;
      opponent_score: number;
      updated_at: string;

      status?: string;

      winner_side?:
        | ChallengeSide
        | null;

      completed_at?: string;
    } = {
      challenger_score:
        challengerScore,

      opponent_score:
        opponentScore,

      updated_at:
        now,
    };

    if (
      gameFinished
    ) {
      challengeUpdate.status =
        "completed";

      challengeUpdate.winner_side =
        winnerSide;

      challengeUpdate.completed_at =
        now;
    }

    const {
      error:
        challengeUpdateError,
    } =
      await supabaseAdmin
        .from(
          "guest_challenges",
        )
        .update(
          challengeUpdate,
        )
        .eq(
          "id",
          challenge.id,
        )
        .eq(
          "status",
          "playing",
        );

    if (
      challengeUpdateError
    ) {
      throw challengeUpdateError;
    }

    /* =====================================================
       NEXT ROUND
    ===================================================== */

    let nextRound:
      | {
          id: number;
          roundNo: number;

          left: {
            type: string;
            value: string;
          };

          right: {
            type: string;
            value: string;
          };
        }
      | null =
      null;

    if (
      !gameFinished
    ) {
      const {
        data:
          nextRoundData,

        error:
          nextRoundError,
      } =
        await supabaseAdmin
          .from(
            "challenge_rounds",
          )
          .select(`
            id,
            round_no,

            left_type,
            left_value,

            right_type,
            right_value
          `)
          .eq(
            "challenge_id",
            challenge.id,
          )
          .eq(
            "game_code",
            "club_clash",
          )
          .is(
            "completed_at",
            null,
          )
          .order(
            "round_no",
            {
              ascending:
                true,
            },
          )
          .limit(
            1,
          )
          .maybeSingle();

      if (
        nextRoundError
      ) {
        console.error(
          "Guest Club Clash next round sorgu hatası:",
          nextRoundError,
        );
      }

      if (
        nextRoundData
      ) {
        nextRound = {
          id:
            Number(
              nextRoundData.id,
            ),

          roundNo:
            Number(
              nextRoundData.round_no,
            ),

          left: {
            type:
              nextRoundData.left_type,

            value:
              nextRoundData.left_value,
          },

          right: {
            type:
              nextRoundData.right_type,

            value:
              nextRoundData.right_value,
          },
        };
      }
    }

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      correct:
        true,

      won:
        true,

      roundCompleted:
        true,

      gameFinished,

      role,

      winScore:
        WIN_SCORE,

      message:
        gameFinished
          ? "Doğru cevap! Düelloyu kazandın. 🏆"
          : "Doğru cevap! Round senin. ⚽",

      player: {
        playerId:
          Number(
            player.player_id,
          ),

        name:
          player.name,
      },

      score: {
        challenger:
          challengerScore,

        opponent:
          opponentScore,
      },

      round: {
        id:
          Number(
            wonRound.id,
          ),

        roundNo:
          wonRound.round_no,

        winnerSide:
          wonRound.winner_side,

        completedAt:
          wonRound.completed_at,
      },

      nextRound,

      winnerSide,
    });
  } catch (error) {
    console.error(
      "Guest Club Clash answer endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Cevap kontrol edilemedi.",
      },
      {
        status:
          500,
      },
    );
  }
}