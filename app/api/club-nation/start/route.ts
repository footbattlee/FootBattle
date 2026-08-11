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

async function createQuestion() {
  /* -------------------------------------------------------
     OYUNDA KULLANILACAK TAKIMLAR

     football_teams içindeki duel_enabled takımları kullanıyoruz.
     Böylece çok alakasız / altyapı kulüpleri gelmez.
  ------------------------------------------------------- */

  const {
    data: teamData,
    error: teamError,
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

    if (
      !name ||
      !team.country
        ?.trim()
    ) {
      continue;
    }

    allowedTeams.set(
      name,
      team,
    );
  }

  if (
    allowedTeams.size === 0
  ) {
    throw new Error(
      "1 Takım 1 Millet için aktif takım bulunamadı.",
    );
  }

  /* -------------------------------------------------------
     OYUNCU HAVUZUNU SAY
  ------------------------------------------------------- */

  const {
    count: playerCount,
    error: countError,
  } =
    await supabaseAdmin
      .from(
        "guess_players",
      )
      .select(
        "player_id",
        {
          count: "exact",
          head: true,
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
      "Milliyeti bulunan oyuncu bulunamadı.",
    );
  }

  /* -------------------------------------------------------
     RANDOM OYUNCU GRUPLARI DENE

     Postgres tarafında order by random() yapmadan,
     random offset üzerinden küçük gruplar çekiyoruz.
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

    const randomOffset =
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
          randomOffset,
          randomOffset +
            PLAYER_SAMPLE_SIZE -
            1,
        );

    if (playerError) {
      throw playerError;
    }

    const players =
      shuffleArray(
        (
          playerData ??
          []
        ) as PlayerRow[],
      ).filter(
        (player) =>
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
        (player) =>
          Number(
            player.player_id,
          ),
      );

    /* -----------------------------------------------------
       BU OYUNCULARIN KARİYER KULÜPLERİ
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

    if (clubError) {
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
        !allowedTeams.has(
          clubName,
        )
      ) {
        continue;
      }

      const current =
        clubsByPlayer.get(
          playerId,
        ) ?? [];

      current.push(
        clubName,
      );

      clubsByPlayer.set(
        playerId,
        current,
      );
    }

    /* -----------------------------------------------------
       OYUNCU + KULÜP + MİLLİYET

       Buradaki player_id yalnızca eşleşmenin gerçekten
       çözülebilir olduğunu garanti eden örnek oyuncudur.

       Kullanıcı cevap verirken bu oyuncuyu bilmek zorunda
       olmayacak. Aynı takım + millet kombinasyonuna uyan
       başka futbolcular da doğru kabul edilecek.
    ----------------------------------------------------- */

    for (
      const player of players
    ) {
      const clubs =
        clubsByPlayer.get(
          Number(
            player.player_id,
          ),
        ) ?? [];

      if (
        clubs.length === 0
      ) {
        continue;
      }

      const nationality =
        player.nationality
          ?.trim();

      if (
        !nationality
      ) {
        continue;
      }

      /*
       * Kulübün bağlı olduğu ülke ile oyuncunun milliyeti
       * aynıysa bu eşleşmeyi oyuna almıyoruz.
       *
       * Liverpool + England     -> YOK
       * Barcelona + Spain       -> YOK
       * Galatasaray + Turkey    -> YOK
       *
       * Liverpool + Egypt       -> VAR
       * Barcelona + Argentina   -> VAR
       * Galatasaray + Uruguay   -> VAR
       */
      const validClubs =
        clubs.filter(
          (
            clubName,
          ) => {
            const team =
              allowedTeams.get(
                clubName,
              );

            if (
              !team
            ) {
              return false;
            }

            const clubCountry =
              team.country
                ?.trim();

            if (
              !clubCountry
            ) {
              return false;
            }

            return (
              normalizeCountry(
                clubCountry,
              ) !==
              normalizeCountry(
                nationality,
              )
            );
          },
        );

      if (
        validClubs.length ===
        0
      ) {
        continue;
      }

      const selectedClub =
        shuffleArray(
          validClubs,
        )[0];

      if (
        !selectedClub
      ) {
        continue;
      }

      return {
        playerId:
          Number(
            player.player_id,
          ),

        clubName:
          selectedClub,

        nationality,

        knownAnswer:
          player.name,
      };
    }
  }

  throw new Error(
    "Uygun takım ve millet eşleşmesi bulunamadı.",
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