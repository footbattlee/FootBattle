import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

/* =========================================================
   SETTINGS
========================================================= */

const GAME_DURATION_SECONDS = 120;

const STARTING_PASSES = 3;

const SCORE_PER_CORRECT = 20;

const PLAYER_SAMPLE_SIZE = 150;

const MAX_PLAYER_SEARCH_ROUNDS = 8;

/* =========================================================
   TYPES
========================================================= */

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


type ClubNationPairRow = {
  club_name: string;
  duel_tier: string;
  nationality: string;
  matching_player_count: number;
};

/* =========================================================
   HELPERS
========================================================= */

function shuffleArray<T>(
  values: T[],
) {
  const result = [...values];

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
   RANDOM QUESTION
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


async function createQuestion() {
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
    "Uygun Club Nation sorusu üretilemedi.",
  );
}


/* =========================================================
   POST
========================================================= */

export async function POST() {
  try {
    /* =====================================================
       AUTH

       Giriş zorunlu değil.
       Giriş yapan oyuncunun user_id'sini session'a yazarız.
    ===================================================== */

    const authSupabase =
      await createAuthServerClient();

    const {
      data: {
        user,
      },
    } =
      await authSupabase.auth.getUser();

    /* =====================================================
       FIRST QUESTION
    ===================================================== */

    const question =
      await createQuestion();

    /* =====================================================
       TIMER
    ===================================================== */

    const startedAt =
      new Date();

    const expiresAt =
      new Date(
        startedAt.getTime() +
          GAME_DURATION_SECONDS *
            1000,
      );

    /* =====================================================
       CREATE SESSION
    ===================================================== */

    const {
      data: session,
      error:
        sessionError,
    } =
      await supabaseAdmin
        .from(
          "one_club_one_country_sessions",
        )
        .insert({
          player_id:
            question.playerId,

          club_name:
            question.clubName,

          nationality:
            question.nationality,

          user_id:
            user?.id ??
            null,

          completed:
            false,

          won:
            null,

          score:
            0,

          attempt_count:
            0,

          correct_count:
            0,

          wrong_count:
            0,

          passes_left:
            STARTING_PASSES,

          question_no:
            1,

          used_clubs: [
            question.clubName,
          ],

          started_at:
            startedAt.toISOString(),

          expires_at:
            expiresAt.toISOString(),
        })
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
          created_at
        `)
        .single();

    if (sessionError) {
      console.error(
        "1 Takım 1 Millet session oluşturma hatası:",
        sessionError,
      );

      throw sessionError;
    }

    /* =====================================================
       RESPONSE

       knownAnswer kesinlikle frontend'e dönmüyor.
       O sadece server tarafında eşleşmenin çözülebilir
       olduğunu garanti etmek için kullanıldı.
    ===================================================== */

    return NextResponse.json({
      ok: true,

      game: {
        code:
          "club_nation",

        label:
          "1 Takım 1 Millet",

        durationSeconds:
          GAME_DURATION_SECONDS,

        scorePerCorrect:
          SCORE_PER_CORRECT,

        maxPasses:
          STARTING_PASSES,
      },

      session: {
        id:
          session.id,

        startedAt:
          session.started_at,

        expiresAt:
          session.expires_at,

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
              STARTING_PASSES,
          ),

        questionNo:
          Number(
            session.question_no ??
              1,
          ),

        usedClubs:
          Array.isArray(
            session.used_clubs,
          )
            ? session.used_clubs
            : [],
      },

      question: {
        club:
          session.club_name,

        nationality:
          session.nationality,
      },
    });
  } catch (error) {
    console.error(
      "1 Takım 1 Millet start endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "1 Takım 1 Millet başlatılamadı.",
      },
      {
        status: 500,
      },
    );
  }
}