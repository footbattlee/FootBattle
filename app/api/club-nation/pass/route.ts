import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

/* =========================================================
   SETTINGS
========================================================= */

const PLAYER_SAMPLE_SIZE = 150;

const MAX_PLAYER_SEARCH_ROUNDS = 8;

/* =========================================================
   TYPES
========================================================= */

type PassBody = {
  sessionId?: string;
};

type PlayerRow = {
  player_id: number;

  name: string;

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
};

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
   RANDOM NEXT QUESTION
========================================================= */

async function createQuestion(
  previousClub?: string,
  previousNationality?: string,
) {
  /* -------------------------------------------------------
     AKTİF TAKIMLAR
  ------------------------------------------------------- */

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
        name
      `)
      .eq(
        "duel_enabled",
        true,
      );

  if (teamError) {
    throw teamError;
  }

  const allowedClubs =
    new Set(
      (
        (
          teamData ??
          []
        ) as TeamRow[]
      )
        .map(
          (
            team,
          ) =>
            team.name
              ?.trim(),
        )
        .filter(
          (
            name,
          ): name is string =>
            Boolean(
              name,
            ),
        ),
    );

  if (
    allowedClubs.size ===
    0
  ) {
    throw new Error(
      "Aktif takım bulunamadı.",
    );
  }

  /* -------------------------------------------------------
     PLAYER COUNT
  ------------------------------------------------------- */

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

  /* -------------------------------------------------------
     RANDOM PLAYER SAMPLE
  ------------------------------------------------------- */

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

    /* -----------------------------------------------------
       KARİYER KULÜPLERİ
    ----------------------------------------------------- */

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
      const playerId =
        Number(
          row.player_id,
        );

      const clubName =
        row.club_name
          ?.trim();

      if (
        !Number.isInteger(
          playerId,
        ) ||
        !clubName ||
        !allowedClubs.has(
          clubName,
        )
      ) {
        continue;
      }

      const existing =
        clubsByPlayer.get(
          playerId,
        ) ?? [];

      existing.push(
        clubName,
      );

      clubsByPlayer.set(
        playerId,
        existing,
      );
    }

    /* -----------------------------------------------------
       YENİ SORU SEÇ
    ----------------------------------------------------- */

    for (
      const player
      of players
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
        const club
        of clubs
      ) {
        /*
         * Aynı soru tekrar gelmesin.
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
      (await request.json()) as PassBody;

    const sessionId =
      body.sessionId
        ?.trim();

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
       OWNER CONTROL
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
       ALREADY COMPLETED
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
       TIMER CONTROL
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
       PASS CONTROL
    ===================================================== */

    const passesLeft =
      Number(
        session.passes_left ??
          0,
      );

    if (
      passesLeft <=
      0
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            "Pas hakkın kalmadı.",

          passesLeft:
            0,
        },
        {
          status:
            409,
        },
      );
    }

    /* =====================================================
       NEXT QUESTION
    ===================================================== */

    const nextQuestion =
      await createQuestion(
        session.club_name,
        session.nationality,
      );

    const newPassesLeft =
      passesLeft - 1;

    const newQuestionNo =
      Number(
        session.question_no ??
          1,
      ) + 1;

    /* =====================================================
       UPDATE SESSION
    ===================================================== */

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

          passes_left:
            newPassesLeft,

          question_no:
            newQuestionNo,
        })
        .eq(
          "id",
          session.id,
        )
        /*
         * Aynı anda iki kez pas butonuna basılması
         * ihtimalinde eski passes_left değerini şart koş.
         */
        .eq(
          "passes_left",
          passesLeft,
        )
        .select(`
          id,

          club_name,
          nationality,

          score,
          correct_count,
          wrong_count,

          passes_left,
          question_no,

          expires_at
        `)
        .maybeSingle();

    if (
      updateError
    ) {
      throw updateError;
    }

    /*
     * İki paralel pass isteğinden biri kazanmış olabilir.
     */
    if (
      !updatedSession
    ) {
      const {
        data:
          latestSession,
        error:
          latestError,
      } =
        await supabaseAdmin
          .from(
            "one_club_one_country_sessions",
          )
          .select(`
            club_name,
            nationality,

            score,
            correct_count,
            wrong_count,

            passes_left,
            question_no,

            expires_at
          `)
          .eq(
            "id",
            session.id,
          )
          .maybeSingle();

      if (
        latestError
      ) {
        throw latestError;
      }

      if (
        !latestSession
      ) {
        throw new Error(
          "Oyun oturumu tekrar okunamadı.",
        );
      }

      const secondsLeft =
        Math.max(
          0,
          Math.ceil(
            (
              new Date(
                latestSession
                  .expires_at,
              ).getTime() -
              Date.now()
            ) /
              1000,
          ),
        );

      return NextResponse.json({
        ok:
          true,

        alreadyProcessed:
          true,

        score:
          Number(
            latestSession
              .score ??
              0,
          ),

        correctCount:
          Number(
            latestSession
              .correct_count ??
              0,
          ),

        wrongCount:
          Number(
            latestSession
              .wrong_count ??
              0,
          ),

        passesLeft:
          Number(
            latestSession
              .passes_left ??
              0,
          ),

        questionNo:
          Number(
            latestSession
              .question_no ??
              1,
          ),

        secondsLeft,

        question: {
          club:
            latestSession
              .club_name,

          nationality:
            latestSession
              .nationality,
        },
      });
    }

    /* =====================================================
       TIME LEFT
    ===================================================== */

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

      passed:
        true,

      score:
        Number(
          updatedSession
            .score ??
            0,
        ),

      correctCount:
        Number(
          updatedSession
            .correct_count ??
            0,
        ),

      wrongCount:
        Number(
          updatedSession
            .wrong_count ??
            0,
        ),

      passesLeft:
        Number(
          updatedSession
            .passes_left ??
            newPassesLeft,
        ),

      questionNo:
        Number(
          updatedSession
            .question_no ??
            newQuestionNo,
        ),

      secondsLeft,

      question: {
        club:
          updatedSession
            .club_name,

        nationality:
          updatedSession
            .nationality,
      },

      message:
        newPassesLeft > 0
          ? `Pas geçildi. ${newPassesLeft} pas hakkın kaldı.`
          : "Pas geçildi. Pas hakkın kalmadı.",
    });
  } catch (
    error
  ) {
    console.error(
      "1 Takım 1 Millet pass endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok:
          false,

        error:
          error instanceof Error
            ? error.message
            : "Pas işlemi yapılamadı.",
      },
      {
        status:
          500,
      },
    );
  }
}