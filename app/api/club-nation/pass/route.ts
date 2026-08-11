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

  country:
    | string
    | null;

  duel_tier:
    | string
    | null;
};

/* =========================================================
   SHUFFLE
========================================================= */


type ClubNationPairRow = {
  club_name: string;
  duel_tier: string;
  nationality: string;
  matching_player_count: number;
};

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
   RANDOM NEXT QUESTION
========================================================= */


/* =========================================================
   CLUB NATION VALID PAIRS
========================================================= */

async function loadValidPairs() {
  const rows:
    ClubNationPairRow[] = [];

  const pageSize =
    1000;

  for (
    let from = 0;
    ;
    from += pageSize
  ) {
    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "club_nation_valid_pairs",
        )
        .select(`
          club_name,
          duel_tier,
          nationality,
          matching_player_count
        `)
        .range(
          from,
          from +
            pageSize -
            1,
        );

    if (error) {
      throw error;
    }

    const page =
      (
        data ??
        []
      ) as ClubNationPairRow[];

    rows.push(
      ...page,
    );

    if (
      page.length <
      pageSize
    ) {
      break;
    }
  }

  if (
    rows.length === 0
  ) {
    throw new Error(
      "Club Nation soru havuzu boş.",
    );
  }

  return rows;
}

async function findAnswerPlayer(
  clubName: string,
  nationality: string,
) {
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
        player_id
      `)
      .eq(
        "club_name",
        clubName,
      );

  if (clubError) {
    throw clubError;
  }

  const playerIds =
    Array.from(
      new Set(
        (
          clubRows ??
          []
        )
          .map(
            (row) =>
              Number(
                row.player_id,
              ),
          )
          .filter(
            (id) =>
              Number.isInteger(
                id,
              ),
          ),
      ),
    );

  if (
    playerIds.length === 0
  ) {
    throw new Error(
      `${clubName} için oyuncu bulunamadı.`,
    );
  }

  /*
   * .in() listesini küçük parçalarda sorguluyoruz.
   * View zaten min 2 eşleşmeyi garanti ediyor.
   */
  const chunkSize =
    200;

  const matchingPlayers:
    PlayerRow[] = [];

  for (
    let index = 0;
    index <
    playerIds.length;
    index += chunkSize
  ) {
    const chunk =
      playerIds.slice(
        index,
        index +
          chunkSize,
      );

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
          nationality
        `)
        .in(
          "player_id",
          chunk,
        )
        .eq(
          "nationality",
          nationality,
        );

    if (error) {
      throw error;
    }

    matchingPlayers.push(
      ...(
        (
          data ??
          []
        ) as PlayerRow[]
      ),
    );
  }

  if (
    matchingPlayers.length ===
    0
  ) {
    throw new Error(
      `${clubName} + ${nationality} için cevap oyuncusu bulunamadı.`,
    );
  }

  return shuffleArray(
    matchingPlayers,
  )[0];
}


async function createQuestion(
  previousClub?: string,
  previousNationality?: string,
  usedClubs: string[] = [],
) {
  const usedClubSet =
    new Set(
      usedClubs
        .map(
          (club) =>
            club
              ?.trim()
              .toLocaleLowerCase(
                "tr-TR",
              ),
        )
        .filter(Boolean),
    );

  const pairs =
    shuffleArray(
      await loadValidPairs(),
    );

  for (
    const pair of pairs
  ) {
    const clubName =
      pair.club_name
        ?.trim();

    const nationality =
      pair.nationality
        ?.trim();

    if (
      !clubName ||
      !nationality
    ) {
      continue;
    }

    const clubKey =
      clubName
        .toLocaleLowerCase(
          "tr-TR",
        );

    /*
     * Solo session boyunca aynı takım tekrar gelmez.
     * Milliyet tekrar edebilir.
     */
    if (
      usedClubSet.has(
        clubKey,
      )
    ) {
      continue;
    }

    /*
     * Eski sessionlarda used_clubs boş olursa en azından
     * birebir aynı soru art arda gelmesin.
     */
    if (
      previousClub &&
      previousNationality &&
      clubName ===
        previousClub &&
      nationality ===
        previousNationality
    ) {
      continue;
    }

    const player =
      await findAnswerPlayer(
        clubName,
        nationality,
      );

    if (!player) {
      continue;
    }

    return {
      playerId:
        Number(
          player.player_id,
        ),

      clubName,

      nationality,

      knownAnswer:
        player.name,
    };
  }

  throw new Error(
    "Kullanılmamış uygun Club Nation sorusu bulunamadı.",
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
          used_clubs,

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

    const currentUsedClubs =
      Array.isArray(
        session.used_clubs,
      )
        ? (
            session.used_clubs as string[]
          )
        : [];

    const nextQuestion =
      await createQuestion(
        session.club_name,
        session.nationality,
        currentUsedClubs,
      );

    const newPassesLeft =
      passesLeft - 1;

    const newQuestionNo =
      Number(
        session.question_no ??
          1,
      ) + 1;

    const newUsedClubs =
      Array.from(
        new Set([
          ...currentUsedClubs,
          nextQuestion.clubName,
        ]),
      );

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

          used_clubs:
            newUsedClubs,
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
          used_clubs,

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
            used_clubs,

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

      usedClubs:
        Array.isArray(
          updatedSession
            .used_clubs,
        )
          ? updatedSession
              .used_clubs
          : newUsedClubs,

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