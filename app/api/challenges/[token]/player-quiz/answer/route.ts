import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  buildPlayerQuizSeniorCareer,
  type RawPlayerQuizClub,
} from "@/lib/player-quiz/clubs";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const GUEST_COOKIE_NAME =
  "footbattle_guest";

type FieldType =
  | "birthYear"
  | "nationality"
  | "club";

type AnswerBody = {
  field?: FieldType;
  value?: string | number;
};

type ChallengeRow = {
  id: number | string;
  invite_token: string;
  game_code: string;
  status: string;

  challenger_user_id: string | null;
  challenger_guest_id: string | null;

  opponent_user_id: string | null;
  opponent_guest_id: string | null;
};

type GameRow = {
  challenge_id: number | string;
  player_id: number | string;

  challenger_birth_year_correct: boolean;
  opponent_birth_year_correct: boolean;

  challenger_nationality_correct: boolean;
  opponent_nationality_correct: boolean;

  challenger_solved_club_ids:
    | number[]
    | string[]
    | null;

  opponent_solved_club_ids:
    | number[]
    | string[]
    | null;

  challenger_attempt_count: number;
  opponent_attempt_count: number;

  challenger_finalized: boolean;
  opponent_finalized: boolean;

  challenger_forfeited: boolean;
  opponent_forfeited: boolean;
};

/* =========================================================
   HELPERS
========================================================= */

function sanitizeToken(
  value: unknown,
) {
  return String(value ?? "")
    .trim()
    .replace(
      /[^a-zA-Z0-9]/g,
      "",
    )
    .slice(0, 64);
}

function normalizeText(
  value: unknown,
) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase(
      "tr-TR",
    )
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(
      /[.\-_/]/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    );
}

function isAllowedField(
  value: unknown,
): value is FieldType {
  return (
    value === "birthYear" ||
    value === "nationality" ||
    value === "club"
  );
}

function parseStoredClubIds(
  value:
    | number[]
    | string[]
    | null
    | undefined,
) {
  if (!Array.isArray(value)) {
    return [] as number[];
  }

  return Array.from(
    new Set(
      value
        .map(Number)
        .filter(
          (id) =>
            Number.isInteger(id) &&
            id > 0,
        ),
    ),
  );
}

function calculateCorrectCount({
  birthYearCorrect,
  nationalityCorrect,
  solvedClubIds,
}: {
  birthYearCorrect: boolean;
  nationalityCorrect: boolean;
  solvedClubIds: number[];
}) {
  return (
    (birthYearCorrect ? 1 : 0) +
    (nationalityCorrect ? 1 : 0) +
    solvedClubIds.length
  );
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      token: string;
    }>;
  },
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
          status: 400,
        },
      );
    }

    /* =====================================================
       BODY
    ===================================================== */

    const body =
      (await request.json()) as AnswerBody;

    const field =
      body.field;

    const rawValue =
      body.value;

    if (
      !isAllowedField(
        field,
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Kontrol edilecek alan geçersiz.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      rawValue === undefined ||
      rawValue === null ||
      String(rawValue).trim() === ""
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Cevap boş olamaz.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       AUTH / GUEST
    ===================================================== */

    const authClient =
      await createAuthServerClient();

    const {
      data: {
        user,
      },
    } =
      await authClient.auth.getUser();

    const cookieStore =
      await cookies();

    const guestId =
      cookieStore.get(
        GUEST_COOKIE_NAME,
      )?.value ?? null;

    /* =====================================================
       CHALLENGE
    ===================================================== */

    const {
      data: challengeData,
      error: challengeError,
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
          opponent_guest_id
        `)
        .eq(
          "invite_token",
          token,
        )
        .maybeSingle();

    if (
      challengeError ||
      !challengeData
    ) {
      console.error(
        "Player Quiz VS challenge okunamadı:",
        challengeError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Challenge bulunamadı.",
        },
        {
          status:
            challengeError
              ? 500
              : 404,
        },
      );
    }

    const challenge =
      challengeData as ChallengeRow;

    if (
      challenge.game_code !==
      "player_quiz"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu challenge Player Quiz değil.",
        },
        {
          status: 400,
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
            "Düello şu anda oynanabilir durumda değil.",
        },
        {
          status: 409,
        },
      );
    }

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
            "Bu challenge'a cevap veremezsin.",
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
       GAME STATE
    ===================================================== */

    const {
      data: gameData,
      error: gameError,
    } =
      await supabaseAdmin
        .from(
          "guest_challenge_player_quiz",
        )
        .select(`
          challenge_id,
          player_id,

          challenger_birth_year_correct,
          opponent_birth_year_correct,

          challenger_nationality_correct,
          opponent_nationality_correct,

          challenger_solved_club_ids,
          opponent_solved_club_ids,

          challenger_attempt_count,
          opponent_attempt_count,

          challenger_finalized,
          opponent_finalized,

          challenger_forfeited,
          opponent_forfeited
        `)
        .eq(
          "challenge_id",
          challenge.id,
        )
        .maybeSingle();

    if (
      gameError ||
      !gameData
    ) {
      console.error(
        "Player Quiz VS game state okunamadı:",
        gameError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Challenge oyunu hazırlanmadı.",
        },
        {
          status: 409,
        },
      );
    }

    const game =
      gameData as GameRow;

    const playerId =
      Number(
        game.player_id,
      );

    /* =====================================================
       CURRENT PLAYER STATE
    ===================================================== */

    const birthYearCorrect =
      role === "challenger"
        ? Boolean(
            game
              .challenger_birth_year_correct,
          )
        : Boolean(
            game
              .opponent_birth_year_correct,
          );

    const nationalityCorrect =
      role === "challenger"
        ? Boolean(
            game
              .challenger_nationality_correct,
          )
        : Boolean(
            game
              .opponent_nationality_correct,
          );

    const solvedClubIds =
      role === "challenger"
        ? parseStoredClubIds(
            game
              .challenger_solved_club_ids,
          )
        : parseStoredClubIds(
            game
              .opponent_solved_club_ids,
          );

    const attemptCount =
      role === "challenger"
        ? Number(
            game
              .challenger_attempt_count ??
              0,
          )
        : Number(
            game
              .opponent_attempt_count ??
              0,
          );

    const finalized =
      role === "challenger"
        ? Boolean(
            game
              .challenger_finalized,
          )
        : Boolean(
            game
              .opponent_finalized,
          );

    const forfeited =
      role === "challenger"
        ? Boolean(
            game
              .challenger_forfeited,
          )
        : Boolean(
            game
              .opponent_forfeited,
          );

    if (forfeited) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu düellodan pes ettin.",
        },
        {
          status: 409,
        },
      );
    }

    if (finalized) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu Player Quiz senin için tamamlandı.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       SENIOR CAREER

       Total puan sayısını ve geçerli kulüpleri
       tek kaynaktan hesaplıyoruz.
    ===================================================== */

    const {
      data: rawClubs,
      error: clubsError,
    } =
      await supabaseAdmin
        .from(
          "player_quiz_clubs",
        )
        .select(`
          id,
          club_name,
          career_order
        `)
        .eq(
          "player_id",
          playerId,
        )
        .order(
          "career_order",
          {
            ascending: true,
          },
        );

    if (clubsError) {
      console.error(
        "Player Quiz VS kulüpler okunamadı:",
        clubsError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Kariyer bilgileri okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    const seniorCareer =
      buildPlayerQuizSeniorCareer(
        (
          rawClubs ??
          []
        ) as RawPlayerQuizClub[],
      );

    if (
      seniorCareer.length ===
      0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Oyuncunun kariyer kulüpleri hazırlanamadı.",
        },
        {
          status: 422,
        },
      );
    }

    const totalCount =
      seniorCareer.length +
      2;

    /* =====================================================
       BIRTH YEAR
    ===================================================== */

    if (
      field ===
      "birthYear"
    ) {
      /*
       * Zaten çözüldüyse network retry yüzünden
       * yeni deneme yazmıyoruz.
       */
      if (
        birthYearCorrect
      ) {
        const correctCount =
          calculateCorrectCount({
            birthYearCorrect:
              true,

            nationalityCorrect,

            solvedClubIds,
          });

        return NextResponse.json({
          ok: true,

          role,
          field,

          correct: true,
          alreadySolved: true,

          progress: {
            birthYearCorrect:
              true,

            nationalityCorrect,

            solvedClubIds,

            correctCount,

            totalCount,

            attemptCount,
          },
        });
      }

      const guessedBirthYear =
        Number(
          rawValue,
        );

      if (
        !Number.isInteger(
          guessedBirthYear,
        ) ||
        guessedBirthYear <
          1900 ||
        guessedBirthYear >
          2100
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Geçerli bir doğum yılı gir.",
          },
          {
            status: 400,
          },
        );
      }

      const {
        data: details,
        error: detailsError,
      } =
        await supabaseAdmin
          .from(
            "player_quiz_details",
          )
          .select(
            "birth_year",
          )
          .eq(
            "player_id",
            playerId,
          )
          .maybeSingle();

      if (
        detailsError ||
        !details
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Doğum yılı kontrol edilemedi.",
          },
          {
            status: 500,
          },
        );
      }

      const correct =
        Number(
          details.birth_year,
        ) ===
        guessedBirthYear;

      const newAttemptCount =
        attemptCount +
        1;

      const updatePayload =
        role === "challenger"
          ? {
              challenger_birth_year_correct:
                correct
                  ? true
                  : game
                      .challenger_birth_year_correct,

              challenger_attempt_count:
                newAttemptCount,

              updated_at:
                new Date().toISOString(),
            }
          : {
              opponent_birth_year_correct:
                correct
                  ? true
                  : game
                      .opponent_birth_year_correct,

              opponent_attempt_count:
                newAttemptCount,

              updated_at:
                new Date().toISOString(),
            };

      const {
        error: updateError,
      } =
        await supabaseAdmin
          .from(
            "guest_challenge_player_quiz",
          )
          .update(
            updatePayload,
          )
          .eq(
            "challenge_id",
            challenge.id,
          );

      if (updateError) {
        console.error(
          "Birth year progress kaydedilemedi:",
          updateError,
        );

        return NextResponse.json(
          {
            ok: false,
            error:
              "Cevap kaydedilemedi.",
          },
          {
            status: 500,
          },
        );
      }

      const updatedBirthYearCorrect =
        correct
          ? true
          : birthYearCorrect;

      const correctCount =
        calculateCorrectCount({
          birthYearCorrect:
            updatedBirthYearCorrect,

          nationalityCorrect,

          solvedClubIds,
        });

      return NextResponse.json({
        ok: true,

        role,
        field,

        correct,

        alreadySolved:
          false,

        progress: {
          birthYearCorrect:
            updatedBirthYearCorrect,

          nationalityCorrect,

          solvedClubIds,

          correctCount,

          totalCount,

          attemptCount:
            newAttemptCount,
        },
      });
    }

    /* =====================================================
       NATIONALITY
    ===================================================== */

    if (
      field ===
      "nationality"
    ) {
      if (
        nationalityCorrect
      ) {
        const correctCount =
          calculateCorrectCount({
            birthYearCorrect,

            nationalityCorrect:
              true,

            solvedClubIds,
          });

        return NextResponse.json({
          ok: true,

          role,
          field,

          correct: true,
          alreadySolved: true,

          progress: {
            birthYearCorrect,

            nationalityCorrect:
              true,

            solvedClubIds,

            correctCount,

            totalCount,

            attemptCount,
          },
        });
      }

      const {
        data: player,
        error: playerError,
      } =
        await supabaseAdmin
          .from(
            "guess_players",
          )
          .select(
            "nationality",
          )
          .eq(
            "player_id",
            playerId,
          )
          .maybeSingle();

      if (
        playerError ||
        !player
          ?.nationality
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Milliyet kontrol edilemedi.",
          },
          {
            status: 500,
          },
        );
      }

      const correct =
        normalizeText(
          rawValue,
        ) ===
        normalizeText(
          player.nationality,
        );

      const newAttemptCount =
        attemptCount +
        1;

      const updatePayload =
        role === "challenger"
          ? {
              challenger_nationality_correct:
                correct
                  ? true
                  : game
                      .challenger_nationality_correct,

              challenger_attempt_count:
                newAttemptCount,

              updated_at:
                new Date().toISOString(),
            }
          : {
              opponent_nationality_correct:
                correct
                  ? true
                  : game
                      .opponent_nationality_correct,

              opponent_attempt_count:
                newAttemptCount,

              updated_at:
                new Date().toISOString(),
            };

      const {
        error: updateError,
      } =
        await supabaseAdmin
          .from(
            "guest_challenge_player_quiz",
          )
          .update(
            updatePayload,
          )
          .eq(
            "challenge_id",
            challenge.id,
          );

      if (updateError) {
        console.error(
          "Nationality progress kaydedilemedi:",
          updateError,
        );

        return NextResponse.json(
          {
            ok: false,
            error:
              "Cevap kaydedilemedi.",
          },
          {
            status: 500,
          },
        );
      }

      const updatedNationalityCorrect =
        correct
          ? true
          : nationalityCorrect;

      const correctCount =
        calculateCorrectCount({
          birthYearCorrect,

          nationalityCorrect:
            updatedNationalityCorrect,

          solvedClubIds,
        });

      return NextResponse.json({
        ok: true,

        role,
        field,

        correct,

        alreadySolved:
          false,

        progress: {
          birthYearCorrect,

          nationalityCorrect:
            updatedNationalityCorrect,

          solvedClubIds,

          correctCount,

          totalCount,

          attemptCount:
            newAttemptCount,
        },
      });
    }

    /* =====================================================
       CLUB
    ===================================================== */

    const normalizedGuess =
      normalizeText(
        rawValue,
      );

    const matchedClub =
      seniorCareer.find(
        (club) =>
          normalizeText(
            club.name,
          ) ===
          normalizedGuess,
      );

    /*
     * Yanlış kulüp:
     * attempt +1
     */
    if (!matchedClub) {
      const newAttemptCount =
        attemptCount +
        1;

      const updatePayload =
        role === "challenger"
          ? {
              challenger_attempt_count:
                newAttemptCount,

              updated_at:
                new Date().toISOString(),
            }
          : {
              opponent_attempt_count:
                newAttemptCount,

              updated_at:
                new Date().toISOString(),
            };

      const {
        error: updateError,
      } =
        await supabaseAdmin
          .from(
            "guest_challenge_player_quiz",
          )
          .update(
            updatePayload,
          )
          .eq(
            "challenge_id",
            challenge.id,
          );

      if (updateError) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Deneme kaydedilemedi.",
          },
          {
            status: 500,
          },
        );
      }

      const correctCount =
        calculateCorrectCount({
          birthYearCorrect,
          nationalityCorrect,
          solvedClubIds,
        });

      return NextResponse.json({
        ok: true,

        role,
        field,

        correct: false,
        duplicate: false,

        matchedClub:
          null,

        progress: {
          birthYearCorrect,

          nationalityCorrect,

          solvedClubIds,

          correctCount,

          totalCount,

          attemptCount:
            newAttemptCount,
        },
      });
    }

    const matchedId =
      Number(
        matchedClub.id,
      );

    /*
     * Daha önce çözülen kulüp.
     * Network retry / tekrar tıklama:
     * attempt artırmıyoruz.
     */
    if (
      solvedClubIds.includes(
        matchedId,
      )
    ) {
      const correctCount =
        calculateCorrectCount({
          birthYearCorrect,
          nationalityCorrect,
          solvedClubIds,
        });

      return NextResponse.json({
        ok: true,

        role,
        field,

        correct: true,

        duplicate: true,
        alreadySolved: true,

        matchedClub: {
          id:
            matchedId,

          name:
            matchedClub.name,

          careerOrder:
            matchedClub.careerOrder,
        },

        progress: {
          birthYearCorrect,

          nationalityCorrect,

          solvedClubIds,

          correctCount,

          totalCount,

          attemptCount,
        },
      });
    }

    /*
     * Yeni doğru kulüp.
     */
    const updatedSolvedClubIds =
      Array.from(
        new Set([
          ...solvedClubIds,
          matchedId,
        ]),
      );

    const newAttemptCount =
      attemptCount +
      1;

    const updatePayload =
      role === "challenger"
        ? {
            challenger_solved_club_ids:
              updatedSolvedClubIds,

            challenger_attempt_count:
              newAttemptCount,

            updated_at:
              new Date().toISOString(),
          }
        : {
            opponent_solved_club_ids:
              updatedSolvedClubIds,

            opponent_attempt_count:
              newAttemptCount,

            updated_at:
              new Date().toISOString(),
          };

    const {
      error:
        updateError,
    } =
      await supabaseAdmin
        .from(
          "guest_challenge_player_quiz",
        )
        .update(
          updatePayload,
        )
        .eq(
          "challenge_id",
          challenge.id,
        );

    if (updateError) {
      console.error(
        "Club progress kaydedilemedi:",
        updateError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Kulüp cevabı kaydedilemedi.",
        },
        {
          status: 500,
        },
      );
    }

    const correctCount =
      calculateCorrectCount({
        birthYearCorrect,
        nationalityCorrect,

        solvedClubIds:
          updatedSolvedClubIds,
      });

    return NextResponse.json({
      ok: true,

      role,
      field,

      correct: true,
      duplicate: false,
      alreadySolved: false,

      matchedClub: {
        id:
          matchedId,

        name:
          matchedClub.name,

        careerOrder:
          matchedClub.careerOrder,
      },

      progress: {
        birthYearCorrect,

        nationalityCorrect,

        solvedClubIds:
          updatedSolvedClubIds,

        correctCount,

        totalCount,

        attemptCount:
          newAttemptCount,
      },
    });
  } catch (error) {
    console.error(
      "Player Quiz VS answer endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Cevap kontrol edilirken hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}