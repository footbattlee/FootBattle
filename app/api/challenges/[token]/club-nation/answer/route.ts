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

type AnswerBody = {
  roundId?: number;

  playerId?:
    | number
    | null;

  answer?:
    | string
    | null;
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
};

type GuessPlayer = {
  player_id: number;

  name: string;

  name_normalized:
    | string
    | null;

  nationality:
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

function normalizeText(
  value: string,
) {
  return value
    .trim()
    .toLocaleLowerCase(
      "tr-TR",
    )
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /ı/g,
      "i",
    )
    .replace(
      /[^a-z0-9\s-]/g,
      "",
    )
    .replace(
      /\s+/g,
      " ",
    );
}

/* =========================================================
   PLAYER RESOLVE
========================================================= */

async function resolvePlayer(
  playerId:
    | number
    | null,
  rawAnswer: string,
) {
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
          nationality
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
        ok:
          false as const,

        status:
          404,

        error:
          "Seçilen futbolcu bulunamadı.",
      };
    }

    return {
      ok:
        true as const,

      player:
        data as GuessPlayer,
    };
  }

  const normalizedAnswer =
    normalizeText(
      rawAnswer,
    );

  if (
    normalizedAnswer.length <
    3
  ) {
    return {
      ok:
        false as const,

      status:
        400,

      error:
        "En az 3 harf yazmalısın.",
    };
  }

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
        nationality
      `)
      .eq(
        "name_normalized",
        normalizedAnswer,
      )
      .limit(
        10,
      );

  if (exactError) {
    throw exactError;
  }

  if (
    exactPlayers &&
    exactPlayers.length ===
      1
  ) {
    return {
      ok:
        true as const,

      player:
        exactPlayers[0] as GuessPlayer,
    };
  }

  const {
    data:
      candidates,
    error:
      candidateError,
  } =
    await supabaseAdmin
      .from(
        "guess_players",
      )
      .select(`
        player_id,
        name,
        name_normalized,
        nationality
      `)
      .ilike(
        "name_normalized",
        `%${normalizedAnswer}%`,
      )
      .limit(
        50,
      );

  if (
    candidateError
  ) {
    throw candidateError;
  }

  const surnameMatches =
    (
      candidates ??
      []
    ).filter(
      (
        player,
      ) => {
        const normalizedName =
          normalizeText(
            player
              .name_normalized ??
              player.name ??
              "",
          );

        const parts =
          normalizedName
            .split(" ")
            .filter(
              Boolean,
            );

        const surname =
          parts[
            parts.length -
              1
          ] ?? "";

        return (
          surname ===
          normalizedAnswer
        );
      },
    );

  if (
    surnameMatches.length ===
    1
  ) {
    return {
      ok:
        true as const,

      player:
        surnameMatches[0] as GuessPlayer,
    };
  }

  if (
    surnameMatches.length >
    1
  ) {
    return {
      ok:
        false as const,

      status:
        409,

      ambiguous:
        true,

      error:
        "Bu soyadında birden fazla futbolcu bulundu. Listeden seçim yap.",

      players:
        surnameMatches
          .slice(
            0,
            10,
          )
          .map(
            (
              player,
            ) => ({
              playerId:
                player.player_id,

              name:
                player.name,

              nationality:
                player.nationality,
            }),
          ),
    };
  }

  return {
    ok:
      false as const,

    status:
      404,

    error:
      "Bu isimde futbolcu bulunamadı.",
  };
}

/* =========================================================
   VALIDATE PLAYER
========================================================= */

async function isValidAnswer(
  player: GuessPlayer,
  clubName: string,
  nationality: string,
) {
  const nationalityCorrect =
    normalizeText(
      player.nationality ??
        "",
    ) ===
    normalizeText(
      nationality,
    );

  if (
    !nationalityCorrect
  ) {
    return false;
  }

  const {
    data:
      clubRows,
    error:
      clubError,
  } =
    await supabaseAdmin
      .from(
        "player_quiz_clubs",
      )
      .select(`
        club_name
      `)
      .eq(
        "player_id",
        player.player_id,
      );

  if (
    clubError
  ) {
    throw clubError;
  }

  const targetClub =
    normalizeText(
      clubName,
    );

  return (
    clubRows ??
    []
  ).some(
    (
      row,
    ) =>
      normalizeText(
        row.club_name ??
          "",
      ) ===
      targetClub,
  );
}

/* =========================================================
   SCORE FROM ROUNDS
========================================================= */

async function calculateScore(
  challengeId: number,
) {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "challenge_rounds",
      )
      .select(`
        winner_side
      `)
      .eq(
        "challenge_id",
        challengeId,
      )
      .eq(
        "game_code",
        "club_nation",
      )
      .not(
        "completed_at",
        "is",
        null,
      );

  if (error) {
    throw error;
  }

  const rounds =
    data ??
    [];

  const challengerScore =
    rounds.filter(
      (
        round,
      ) =>
        round.winner_side ===
        "challenger",
    ).length;

  const opponentScore =
    rounds.filter(
      (
        round,
      ) =>
        round.winner_side ===
        "opponent",
    ).length;

  return {
    challenger:
      challengerScore,

    opponent:
      opponentScore,
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

    const roundId =
      Number(
        body.roundId,
      );

    const playerId =
      body.playerId
        ? Number(
            body.playerId,
          )
        : null;

    const rawAnswer =
      body.answer
        ?.trim() ??
      "";

    if (
      !Number.isInteger(
        roundId,
      ) ||
      roundId <=
        0
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Round bilgisi geçersiz.",
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
          completed_at
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
          status:
            403,
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
       GAME / STATUS
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
            "Bu challenge şu anda oynanmıyor.",
        },
        {
          status:
            409,
        },
      );
    }

    /* =====================================================
       ROUND
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

          completed_at
        `)
        .eq(
          "id",
          roundId,
        )
        .eq(
          "challenge_id",
          challenge.id,
        )
        .eq(
          "game_code",
          "club_nation",
        )
        .maybeSingle();

    if (
      roundError
    ) {
      throw roundError;
    }

    if (
      !roundData
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Round bulunamadı.",
        },
        {
          status:
            404,
        },
      );
    }

    const round =
      roundData as RoundRow;

    /* =====================================================
       ROUND COMPLETED
    ===================================================== */

    if (
      round.completed_at ||
      round.winner_side
    ) {
      const score =
        await calculateScore(
          challenge.id,
        );

      return NextResponse.json({
        ok: true,

        alreadyCompleted:
          true,

        roundCompleted:
          true,

        winnerSide:
          round.winner_side,

        score,
      });
    }

    /* =====================================================
       PLAYER
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
        resolved,
        {
          status:
            resolved.status,
        },
      );
    }

    const selectedPlayer =
      resolved.player;

    /* =====================================================
       VALIDATE
    ===================================================== */

    const correct =
      await isValidAnswer(
        selectedPlayer,
        round.left_value,
        round.right_value,
      );

    const now =
      new Date()
        .toISOString();

    /* =====================================================
       WRONG ANSWER

       Yanlış cevap roundu kapatmaz.
       Sadece ilgili tarafın son cevabını kaydeder.
    ===================================================== */

    if (
      !correct
    ) {
      const updateData =
        role ===
        "challenger"
          ? {
              challenger_answer:
                selectedPlayer.name,

              challenger_answer_player_id:
                selectedPlayer.player_id,

              challenger_answered_at:
                now,
            }
          : {
              opponent_answer:
                selectedPlayer.name,

              opponent_answer_player_id:
                selectedPlayer.player_id,

              opponent_answered_at:
                now,
            };

      const {
        error:
          wrongUpdateError,
      } =
        await supabaseAdmin
          .from(
            "challenge_rounds",
          )
          .update(
            updateData,
          )
          .eq(
            "id",
            round.id,
          )
          .is(
            "completed_at",
            null,
          );

      if (
        wrongUpdateError
      ) {
        throw wrongUpdateError;
      }

      const score =
        await calculateScore(
          challenge.id,
        );

      return NextResponse.json({
        ok: true,

        correct:
          false,

        role,

        roundCompleted:
          false,

        score,

        answer: {
          playerId:
            selectedPlayer
              .player_id,

          name:
            selectedPlayer
              .name,
        },

        message:
          "Yanlış cevap. Round devam ediyor.",
      });
    }

    /* =====================================================
       CORRECT ANSWER

       İlk doğru cevap roundu kilitler.
    ===================================================== */

    const updateData =
      role ===
      "challenger"
        ? {
            challenger_answer:
              selectedPlayer.name,

            challenger_answer_player_id:
              selectedPlayer.player_id,

            challenger_answered_at:
              now,

            winner_side:
              "challenger",

            completed_at:
              now,
          }
        : {
            opponent_answer:
              selectedPlayer.name,

            opponent_answer_player_id:
              selectedPlayer.player_id,

            opponent_answered_at:
              now,

            winner_side:
              "opponent",

            completed_at:
              now,
          };

    const {
      data:
        completedRound,
      error:
        completeRoundError,
    } =
      await supabaseAdmin
        .from(
          "challenge_rounds",
        )
        .update(
          updateData,
        )
        .eq(
          "id",
          round.id,
        )
        .is(
          "completed_at",
          null,
        )
        .select(`
          id,
          round_no,
          winner_side,
          completed_at
        `)
        .maybeSingle();

    if (
      completeRoundError
    ) {
      throw completeRoundError;
    }

    /* =====================================================
       RACE CONDITION

       İki taraf milisaniyeler içinde doğru cevapladıysa
       sadece ilk update başarılı olur.
    ===================================================== */

    if (
      !completedRound
    ) {
      const {
        data:
          latestRound,
        error:
          latestRoundError,
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
            "id",
            round.id,
          )
          .maybeSingle();

      if (
        latestRoundError
      ) {
        throw latestRoundError;
      }

      const score =
        await calculateScore(
          challenge.id,
        );

      return NextResponse.json({
        ok: true,

        correct:
          true,

        wonRound:
          false,

        roundCompleted:
          true,

        winnerSide:
          latestRound
            ?.winner_side ??
          null,

        score,

        message:
          latestRound
            ?.winner_side ===
          role
            ? "Roundu sen kazandın."
            : "Rakibin senden önce doğru cevapladı.",
      });
    }

    /* =====================================================
       SCORE
    ===================================================== */

    const score =
      await calculateScore(
        challenge.id,
      );

    /* =====================================================
       CHALLENGE COMPLETE?
    ===================================================== */

    const challengeWinner =
      score.challenger >=
      WIN_SCORE
        ? "challenger"
        : score.opponent >=
            WIN_SCORE
          ? "opponent"
          : null;

    if (
      challengeWinner
    ) {
      const {
        error:
          challengeCompleteError,
      } =
        await supabaseAdmin
          .from(
            "guest_challenges",
          )
          .update({
            status:
              "completed",

            challenger_score:
              score.challenger,

            opponent_score:
              score.opponent,

            winner_side:
              challengeWinner,

            completed_at:
              now,

            updated_at:
              now,
          })
          .eq(
            "id",
            challenge.id,
          )
          .eq(
            "status",
            "playing",
          );

      if (
        challengeCompleteError
      ) {
        throw challengeCompleteError;
      }

      return NextResponse.json({
        ok: true,

        correct:
          true,

        wonRound:
          true,

        roundCompleted:
          true,

        challengeCompleted:
          true,

        role,

        winnerSide:
          challengeWinner,

        score,

        answer: {
          playerId:
            selectedPlayer
              .player_id,

          name:
            selectedPlayer
              .name,
        },

        message:
          challengeWinner ===
          role
            ? "Maçı kazandın! 🏆"
            : "Rakibin maçı kazandı.",
      });
    }

    /* =====================================================
       UPDATE CURRENT SCORE
    ===================================================== */

    const {
      error:
        scoreUpdateError,
    } =
      await supabaseAdmin
        .from(
          "guest_challenges",
        )
        .update({
          challenger_score:
            score.challenger,

          opponent_score:
            score.opponent,

          updated_at:
            now,
        })
        .eq(
          "id",
          challenge.id,
        )
        .eq(
          "status",
          "playing",
        );

    if (
      scoreUpdateError
    ) {
      throw scoreUpdateError;
    }

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      correct:
        true,

      wonRound:
        true,

      roundCompleted:
        true,

      challengeCompleted:
        false,

      role,

      winnerSide:
        role,

      score,

      round: {
        id:
          round.id,

        roundNo:
          round.round_no,
      },

      answer: {
        playerId:
          selectedPlayer
            .player_id,

        name:
          selectedPlayer
            .name,
      },

      message:
        "Doğru! Round senin.",
    });
  } catch (
    error
  ) {
    console.error(
      "Guest Club Nation answer endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "1 Takım 1 Millet cevabı kontrol edilemedi.",
      },
      {
        status:
          500,
      },
    );
  }
}