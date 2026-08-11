import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

/* =========================================================
   SETTINGS
========================================================= */

const SCORE_PER_CORRECT = 20;

const PLAYER_SAMPLE_SIZE = 150;

const MAX_PLAYER_SEARCH_ROUNDS = 8;

/* =========================================================
   TYPES
========================================================= */

type AnswerBody = {
  sessionId?: string;

  playerId?:
    | number
    | null;

  answer?:
    | string
    | null;
};

type PlayerRow = {
  player_id: number;

  name: string;

  name_normalized:
    | string
    | null;

  nationality:
    | string
    | null;
};

type ClubRow = {
  player_id: number;

  club_name: string;
};

type TeamRow = {
  name: string;

  country:
    | string
    | null;

  duel_tier:
    | string
    | null;
};

/* =========================================================
   NORMALIZE
========================================================= */

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

function normalizeCountry(
  value: string,
) {
  const normalized =
    value
      .trim()
      .toLocaleLowerCase(
        "en-US",
      )
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        "",
      )
      .replace(
        /[^a-z0-9]/g,
        "",
      );

  const aliases:
    Record<
      string,
      string
    > = {
      turkiye:
        "turkey",

      turkey:
        "turkey",

      usa:
        "unitedstates",

      unitedstatesofamerica:
        "unitedstates",

      unitedstates:
        "unitedstates",

      uae:
        "unitedarabemirates",

      unitedarabemirates:
        "unitedarabemirates",

      southkorea:
        "korearepublic",

      korearepublic:
        "korearepublic",

      korea:
        "korearepublic",

      northmacedonia:
        "macedonia",

      macedonia:
        "macedonia",

      ivorycoast:
        "cotedivoire",

      cotedivoire:
        "cotedivoire",

      czechrepublic:
        "czechia",

      czechia:
        "czechia",
    };

  return (
    aliases[normalized] ??
    normalized
  );
}

/* =========================================================
   SHUFFLE
========================================================= */

function shuffleArray<T>(
  values: T[],
) {
  const result =
    [...values];

  for (
    let index =
      result.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex =
      Math.floor(
        Math.random() *
          (index + 1),
      );

    [
      result[index],
      result[randomIndex],
    ] = [
      result[randomIndex],
      result[index],
    ];
  }

  return result;
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
  /* -------------------------------------------------------
     AUTOCOMPLETE PLAYER ID
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
        data as PlayerRow,
    };
  }

  /* -------------------------------------------------------
     SERBEST METİN
  ------------------------------------------------------- */

  const normalizedAnswer =
    normalizeText(
      rawAnswer,
    );

  if (
    normalizedAnswer.length <
    2
  ) {
    return {
      ok:
        false as const,

      status:
        400,

      error:
        "Futbolcu adı veya soyadı yazmalısın.",
    };
  }

  /* -------------------------------------------------------
     TAM İSİM
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
        exactPlayers[0] as PlayerRow,
    };
  }

  /* -------------------------------------------------------
     SOYADINA BAK
  ------------------------------------------------------- */

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
      (player) => {
        const name =
          normalizeText(
            player
              .name_normalized ??
              player.name ??
              "",
          );

        const parts =
          name
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
        surnameMatches[0] as PlayerRow,
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
   RANDOM NEXT QUESTION
========================================================= */

async function createQuestion(
  previousClub?: string,
  previousNationality?: string,
) {
  const {
    data:
      teamData,
    error:
      teamError,
  } =
    await supabaseAdmin
      .from(
        "football_teams",
      )
      .select(`
        name,
        country,
        duel_tier
      `)
      .eq(
        "duel_enabled",
        true,
      )
      .in(
        "duel_tier",
        [
          "S",
          "A",
          "B",
        ],
      );

  if (teamError) {
    throw teamError;
  }

  const allowedTeams =
    new Map<
      string,
      TeamRow
    >();

  for (
    const team of (
      teamData ??
      []
    ) as TeamRow[]
  ) {
    const name =
      team.name
        ?.trim();

    const country =
      team.country
        ?.trim();

    if (
      !name ||
      !country
    ) {
      continue;
    }

    allowedTeams.set(
      name,
      team,
    );
  }

  if (
    allowedTeams.size ===
    0
  ) {
    throw new Error(
      "Aktif takım bulunamadı.",
    );
  }

  const {
    count:
      playerCount,
    error:
      countError,
  } =
    await supabaseAdmin
      .from(
        "guess_players",
      )
      .select(
        "player_id",
        {
          count:
            "exact",

          head:
            true,
        },
      )
      .not(
        "nationality",
        "is",
        null,
      );

  if (countError) {
    throw countError;
  }

  const totalPlayers =
    playerCount ?? 0;

  if (
    totalPlayers === 0
  ) {
    throw new Error(
      "Oyuncu havuzu boş.",
    );
  }

  for (
    let round = 0;
    round <
    MAX_PLAYER_SEARCH_ROUNDS;
    round += 1
  ) {
    const maxOffset =
      Math.max(
        0,
        totalPlayers -
          PLAYER_SAMPLE_SIZE,
      );

    const offset =
      maxOffset > 0
        ? Math.floor(
            Math.random() *
              (
                maxOffset +
                1
              ),
          )
        : 0;

    const {
      data:
        playerData,
      error:
        playerError,
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
        .not(
          "nationality",
          "is",
          null,
        )
        .order(
          "player_id",
          {
            ascending:
              true,
          },
        )
        .range(
          offset,
          offset +
            PLAYER_SAMPLE_SIZE -
            1,
        );

    if (
      playerError
    ) {
      throw playerError;
    }

    const players =
      shuffleArray(
        (
          playerData ??
          []
        ) as PlayerRow[],
      ).filter(
        (
          player,
        ) =>
          Boolean(
            player.nationality
              ?.trim(),
          ),
      );

    if (
      players.length ===
      0
    ) {
      continue;
    }

    const playerIds =
      players.map(
        (
          player,
        ) =>
          Number(
            player.player_id,
          ),
      );

    const {
      data:
        clubData,
      error:
        clubError,
    } =
      await supabaseAdmin
        .from(
          "player_quiz_clubs",
        )
        .select(`
          player_id,
          club_name
        `)
        .in(
          "player_id",
          playerIds,
        )
        .not(
          "club_name",
          "is",
          null,
        );

    if (
      clubError
    ) {
      throw clubError;
    }

    const clubsByPlayer =
      new Map<
        number,
        string[]
      >();

    for (
      const row of (
        clubData ??
        []
      ) as ClubRow[]
    ) {
      const id =
        Number(
          row.player_id,
        );

      const club =
        row.club_name
          ?.trim();

      if (
        !club ||
        !allowedTeams.has(
          club,
        )
      ) {
        continue;
      }

      const existing =
        clubsByPlayer.get(
          id,
        ) ?? [];

      existing.push(
        club,
      );

      clubsByPlayer.set(
        id,
        existing,
      );
    }

    for (
      const player of players
    ) {
      const nationality =
        player.nationality
          ?.trim();

      if (
        !nationality
      ) {
        continue;
      }

      const clubs =
        shuffleArray(
          clubsByPlayer.get(
            Number(
              player.player_id,
            ),
          ) ?? [],
        );

      for (
        const club of clubs
      ) {
        const team =
          allowedTeams.get(
            club,
          );

        if (
          !team
        ) {
          continue;
        }

        const clubCountry =
          team.country
            ?.trim();

        if (
          !clubCountry
        ) {
          continue;
        }

        /*
         * Kulübün bağlı olduğu ülke ile oyuncunun milliyeti
         * aynıysa bu soruyu üretmiyoruz.
         *
         * Liverpool + England   -> YOK
         * Barcelona + Spain     -> YOK
         * Galatasaray + Turkey  -> YOK
         */
        if (
          normalizeCountry(
            clubCountry,
          ) ===
          normalizeCountry(
            nationality,
          )
        ) {
          continue;
        }

        /*
         * Aynı soru art arda gelmesin.
         */
        if (
          previousClub &&
          previousNationality &&
          club ===
            previousClub &&
          nationality ===
            previousNationality
        ) {
          continue;
        }

        return {
          playerId:
            Number(
              player.player_id,
            ),

          clubName:
            club,

          nationality,
        };
      }
    }
  }

  throw new Error(
    "Yeni soru üretilemedi.",
  );
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: Request,
) {
  try {
    /* =====================================================
       BODY
    ===================================================== */

    const body =
      (await request.json()) as AnswerBody;

    const sessionId =
      body.sessionId
        ?.trim();

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

    if (!sessionId) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            "Oyun oturumu bulunamadı.",
        },
        {
          status:
            400,
        },
      );
    }

    /* =====================================================
       AUTH
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

    /* =====================================================
       SESSION
    ===================================================== */

    const {
      data:
        session,
      error:
        sessionError,
    } =
      await supabaseAdmin
        .from(
          "one_club_one_country_sessions",
        )
        .select(`
          id,

          player_id,
          club_name,
          nationality,

          completed,
          score,
          attempt_count,

          correct_count,
          wrong_count,
          passes_left,
          question_no,

          user_id,

          started_at,
          expires_at,
          completed_at
        `)
        .eq(
          "id",
          sessionId,
        )
        .maybeSingle();

    if (
      sessionError
    ) {
      throw sessionError;
    }

    if (!session) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            "Oyun bulunamadı.",
        },
        {
          status:
            404,
        },
      );
    }

    /* =====================================================
       SESSION OWNER

       Session login olmuş kullanıcıya aitse başka kullanıcı
       cevaplayamasın.
    ===================================================== */

    if (
      session.user_id &&
      session.user_id !==
        user?.id
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            "Bu oyun oturumuna erişim yetkin yok.",
        },
        {
          status:
            403,
        },
      );
    }

    /* =====================================================
       COMPLETED
    ===================================================== */

    if (
      session.completed
    ) {
      return NextResponse.json({
        ok:
          true,

        completed:
          true,

        score:
          Number(
            session.score ??
              0,
          ),

        correctCount:
          Number(
            session.correct_count ??
              0,
          ),

        wrongCount:
          Number(
            session.wrong_count ??
              0,
          ),

        passesLeft:
          Number(
            session.passes_left ??
              0,
          ),

        completedAt:
          session.completed_at,
      });
    }

    /* =====================================================
       TIMER
    ===================================================== */

    const now =
      new Date();

    const expiresAt =
      session.expires_at
        ? new Date(
            session.expires_at,
          )
        : null;

    if (
      !expiresAt ||
      now.getTime() >=
        expiresAt.getTime()
    ) {
      const {
        error:
          completeError,
      } =
        await supabaseAdmin
          .from(
            "one_club_one_country_sessions",
          )
          .update({
            completed:
              true,

            completed_at:
              now.toISOString(),
          })
          .eq(
            "id",
            session.id,
          )
          .eq(
            "completed",
            false,
          );

      if (
        completeError
      ) {
        throw completeError;
      }

      return NextResponse.json({
        ok:
          true,

        completed:
          true,

        reason:
          "time_up",

        score:
          Number(
            session.score ??
              0,
          ),

        correctCount:
          Number(
            session.correct_count ??
              0,
          ),

        wrongCount:
          Number(
            session.wrong_count ??
              0,
          ),

        passesLeft:
          Number(
            session.passes_left ??
              0,
          ),

        message:
          "Süre doldu!",
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
       NATIONALITY CONTROL
    ===================================================== */

    const playerNationality =
      normalizeText(
        selectedPlayer
          .nationality ??
          "",
      );

    const targetNationality =
      normalizeText(
        session.nationality,
      );

    const nationalityCorrect =
      playerNationality ===
      targetNationality;

    /* =====================================================
       CLUB CONTROL
    ===================================================== */

    const {
      data:
        careerRows,
      error:
        careerError,
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
          selectedPlayer
            .player_id,
        );

    if (
      careerError
    ) {
      throw careerError;
    }

    const targetClub =
      normalizeText(
        session.club_name,
      );

    const clubCorrect =
      (
        careerRows ??
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

    const isCorrect =
      nationalityCorrect &&
      clubCorrect;

    /* =====================================================
       ATTEMPT LOG
    ===================================================== */

    const {
      error:
        attemptError,
    } =
      await supabaseAdmin
        .from(
          "one_club_one_country_attempts",
        )
        .insert({
          session_id:
            session.id,

          player_id:
            selectedPlayer
              .player_id,

          answer_text:
            selectedPlayer
              .name,

          is_correct:
            isCorrect,
        });

    if (
      attemptError
    ) {
      throw attemptError;
    }

    /* =====================================================
       WRONG
    ===================================================== */

    if (
      !isCorrect
    ) {
      const newAttemptCount =
        Number(
          session.attempt_count ??
            0,
        ) + 1;

      const newWrongCount =
        Number(
          session.wrong_count ??
            0,
        ) + 1;

      const {
        error:
          wrongUpdateError,
      } =
        await supabaseAdmin
          .from(
            "one_club_one_country_sessions",
          )
          .update({
            attempt_count:
              newAttemptCount,

            wrong_count:
              newWrongCount,
          })
          .eq(
            "id",
            session.id,
          );

      if (
        wrongUpdateError
      ) {
        throw wrongUpdateError;
      }

      const secondsLeft =
        Math.max(
          0,
          Math.ceil(
            (
              expiresAt.getTime() -
              Date.now()
            ) /
              1000,
          ),
        );

      return NextResponse.json({
        ok:
          true,

        correct:
          false,

        score:
          Number(
            session.score ??
              0,
          ),

        correctCount:
          Number(
            session.correct_count ??
              0,
          ),

        wrongCount:
          newWrongCount,

        attemptCount:
          newAttemptCount,

        passesLeft:
          Number(
            session.passes_left ??
              0,
          ),

        secondsLeft,

        question: {
          club:
            session.club_name,

          nationality:
            session.nationality,
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
          "Olmadı! Aynı soruda devam.",
      });
    }

    /* =====================================================
       CORRECT -> NEXT QUESTION
    ===================================================== */

    const nextQuestion =
      await createQuestion(
        session.club_name,
        session.nationality,
      );

    const newScore =
      Number(
        session.score ??
          0,
      ) +
      SCORE_PER_CORRECT;

    const newCorrectCount =
      Number(
        session.correct_count ??
          0,
      ) + 1;

    const newAttemptCount =
      Number(
        session.attempt_count ??
          0,
      ) + 1;

    const newQuestionNo =
      Number(
        session.question_no ??
          1,
      ) + 1;

    const {
      data:
        updatedSession,
      error:
        updateError,
    } =
      await supabaseAdmin
        .from(
          "one_club_one_country_sessions",
        )
        .update({
          player_id:
            nextQuestion.playerId,

          club_name:
            nextQuestion.clubName,

          nationality:
            nextQuestion.nationality,

          score:
            newScore,

          correct_count:
            newCorrectCount,

          attempt_count:
            newAttemptCount,

          question_no:
            newQuestionNo,
        })
        .eq(
          "id",
          session.id,
        )
        .select(`
          id,
          club_name,
          nationality,

          score,
          attempt_count,

          correct_count,
          wrong_count,
          passes_left,
          question_no,

          expires_at
        `)
        .single();

    if (
      updateError
    ) {
      throw updateError;
    }

    const secondsLeft =
      Math.max(
        0,
        Math.ceil(
          (
            new Date(
              updatedSession
                .expires_at,
            ).getTime() -
            Date.now()
          ) /
            1000,
        ),
      );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok:
        true,

      correct:
        true,

      pointsEarned:
        SCORE_PER_CORRECT,

      score:
        Number(
          updatedSession
            .score ??
            newScore,
        ),

      correctCount:
        Number(
          updatedSession
            .correct_count ??
            newCorrectCount,
        ),

      wrongCount:
        Number(
          updatedSession
            .wrong_count ??
            0,
        ),

      attemptCount:
        Number(
          updatedSession
            .attempt_count ??
            newAttemptCount,
        ),

      passesLeft:
        Number(
          updatedSession
            .passes_left ??
            0,
        ),

      questionNo:
        Number(
          updatedSession
            .question_no ??
            newQuestionNo,
        ),

      secondsLeft,

      previousAnswer: {
        playerId:
          selectedPlayer
            .player_id,

        name:
          selectedPlayer
            .name,
      },

      question: {
        club:
          updatedSession
            .club_name,

        nationality:
          updatedSession
            .nationality,
      },

      message:
        `Doğru! +${SCORE_PER_CORRECT} puan`,
    });
  } catch (
    error
  ) {
    console.error(
      "1 Takım 1 Millet answer endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok:
          false,

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