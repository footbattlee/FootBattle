import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_WRONG_GUESSES = 5;
const MINIMUM_SEARCH_LENGTH = 3;

const MINIMUM_POPULARITY_SCORE = 84;

const MINIMUM_CLUB_COUNT = 3;
const MAXIMUM_CLUB_COUNT = 12;

type CandidatePlayer = {
  player_id: number;
  name: string;
  image_url: string | null;
  popularity_score: number | null;
};

type RawCareerClub = {
  id: number;
  club_name: string;
  career_order: number | null;
};

/* =========================================================
   NORMALIZE TEXT
========================================================= */

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[.\-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================================================
   YOUTH / RESERVE FILTER
========================================================= */

function isYouthClubName(value: unknown) {
  const clubName =
    normalizeText(value);

  if (!clubName) {
    return true;
  }

  return (
    /\bu\s?\d{2}\b/.test(clubName) ||
    /\byth\b/.test(clubName) ||
    /\byouth\b/.test(clubName) ||
    /\bacademy\b/.test(clubName) ||
    /\bakademi\b/.test(clubName) ||
    /\breserve\b/.test(clubName) ||
    /\breserves\b/.test(clubName) ||
    /\bprimavera\b/.test(clubName) ||
    /\bjuvenil\b/.test(clubName) ||
    /\bjuniors?\b/.test(clubName)
  );
}

/* =========================================================
   CLUB NORMALIZATION

   Duplicate takım tespitinde kullanıyoruz.

   Sunderland AFC -> Sunderland
   FC Barcelona   -> Barcelona
========================================================= */

function normalizeClubName(value: unknown) {
  const normalized =
    normalizeText(value);

  if (!normalized) {
    return "";
  }

  const removableWords =
    new Set([
      "fc",
      "afc",
      "cf",
      "sc",
      "sk",
      "fk",
      "ac",
      "football",
      "club",
      "futbol",
      "futebol",
    ]);

  return normalized
    .split(" ")
    .filter(
      (word) =>
        word &&
        !removableWords.has(
          word,
        ),
    )
    .join(" ")
    .trim();
}

/* =========================================================
   CAREER CLUB CLEANUP
========================================================= */

function buildSeniorCareer(
  rawClubs: RawCareerClub[],
) {
  /* =======================================================
     1. ALTYAPILARI ÇIKAR
  ======================================================= */

  const seniorClubs =
    rawClubs.filter(
      (club) =>
        !isYouthClubName(
          club.club_name,
        ),
    );

  /* =======================================================
     2. GERÇEK SIRAYA GÖRE DİZ
  ======================================================= */

  const sortedClubs =
    [...seniorClubs].sort(
      (
        first,
        second,
      ) =>
        Number(
          first.career_order ??
            999999,
        ) -
        Number(
          second.career_order ??
            999999,
        ),
    );

  /* =======================================================
     3. AYNI KULÜBÜ TEK SAY
  ======================================================= */

  const uniqueClubMap =
    new Map<
      string,
      {
        id: number;
        name: string;
        originalOrder: number;
      }
    >();

  for (
    const club of
      sortedClubs
  ) {
    const normalized =
      normalizeClubName(
        club.club_name,
      );

    if (!normalized) {
      continue;
    }

    if (
      uniqueClubMap.has(
        normalized,
      )
    ) {
      continue;
    }

    uniqueClubMap.set(
      normalized,
      {
        id:
          Number(
            club.id,
          ),

        name:
          club.club_name,

        originalOrder:
          Number(
            club.career_order ??
              0,
          ),
      },
    );
  }

  /* =======================================================
     4. CAREER ORDER'I YENİDEN 1,2,3...
  ======================================================= */

  return Array.from(
    uniqueClubMap.values(),
  )
    .sort(
      (
        first,
        second,
      ) =>
        first.originalOrder -
        second.originalOrder,
    )
    .map(
      (
        club,
        index,
      ) => ({
        id:
          club.id,

        name:
          club.name,

        careerOrder:
          index + 1,
      }),
    );
}

/* =========================================================
   GET
========================================================= */

export async function GET() {
  try {
    /* =====================================================
       1. ADAY OYUNCULAR

       Sadece:
       is_playable = 1
       popularity >= 72
    ===================================================== */

    const {
      data: candidates,
      error: candidatesError,
    } = await supabaseAdmin
      .from(
        "guess_players",
      )
      .select(`
        player_id,
        name,
        image_url,
        popularity_score
      `)
      .eq(
        "is_playable",
        1,
      )
      .gte(
        "popularity_score",
        MINIMUM_POPULARITY_SCORE,
      )
      .not(
        "name",
        "is",
        null,
      )
      .order(
        "popularity_score",
        {
          ascending: false,
          nullsFirst: false,
        },
      );

    if (
      candidatesError
    ) {
      console.error(
        "Career Path aday oyuncuları okunamadı:",
        candidatesError,
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            "Career Path oyuncu havuzu okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    if (
      !candidates ||
      candidates.length ===
        0
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Career Path için uygun oyuncu bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    /* =====================================================
       2. RANDOM BAŞLANGIÇ NOKTASI
    ===================================================== */

    const randomStart =
      Math.floor(
        Math.random() *
          candidates.length,
      );

    const orderedCandidates: CandidatePlayer[] =
      [
        ...candidates.slice(
          randomStart,
        ),

        ...candidates.slice(
          0,
          randomStart,
        ),
      ];

    /*
     * Her requestte bütün 3961 oyuncuyu
     * tek tek kontrol etmeye gerek yok.
     */
    const candidatesToCheck =
      orderedCandidates.slice(
        0,
        150,
      );

    let selectedPlayer:
      | CandidatePlayer
      | null = null;

    let selectedCareer:
      {
        id: number;
        name: string;
        careerOrder: number;
      }[] = [];

    /* =====================================================
       3. UYGUN CAREER PATH BUL
    ===================================================== */

    for (
      const candidate of
        candidatesToCheck
    ) {
      const {
        data: rawClubs,
        error: clubsError,
      } = await supabaseAdmin
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
          candidate.player_id,
        )
        .not(
          "club_name",
          "is",
          null,
        )
        .order(
          "career_order",
          {
            ascending: true,
          },
        );

      if (clubsError) {
        console.error(
          `Career Path kulüpleri okunamadı. Player ID: ${candidate.player_id}`,
          clubsError,
        );

        continue;
      }

      if (
        !rawClubs ||
        rawClubs.length ===
          0
      ) {
        continue;
      }

      const seniorCareer =
        buildSeniorCareer(
          rawClubs,
        );

      /* ===================================================
         CAREER PATH UYGUNLUK
      =================================================== */

      if (
        seniorCareer.length <
          MINIMUM_CLUB_COUNT ||
        seniorCareer.length >
          MAXIMUM_CLUB_COUNT
      ) {
        continue;
      }

      selectedPlayer =
        candidate;

      selectedCareer =
        seniorCareer;

      break;
    }

    /* =====================================================
       4. UYGUN OYUNCU YOK
    ===================================================== */

    if (
      !selectedPlayer ||
      selectedCareer.length <
        MINIMUM_CLUB_COUNT
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Career Path için uygun A takım kariyerine sahip oyuncu seçilemedi.",

          debug: {
            minimumPopularityScore:
              MINIMUM_POPULARITY_SCORE,

            minimumClubCount:
              MINIMUM_CLUB_COUNT,

            maximumClubCount:
              MAXIMUM_CLUB_COUNT,
          },
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       5. SESSION
    ===================================================== */

    const {
      data: session,
      error: sessionError,
    } = await supabaseAdmin
      .from(
        "career_path_sessions",
      )
      .insert({
        player_id:
          selectedPlayer.player_id,

        max_wrong_guesses:
          MAX_WRONG_GUESSES,
      })
      .select(`
        id,
        player_id,
        max_wrong_guesses,
        created_at
      `)
      .single();

    if (
      sessionError ||
      !session
    ) {
      console.error(
        "Career Path session oluşturma hatası:",
        sessionError,
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            "Yeni Career Path oyunu oluşturulamadı.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       6. RESPONSE

       Kulüp isimlerini burada CLIENT'A vermiyoruz.
       Sadece kaç tane slot olduğunu gönderiyoruz.
    ===================================================== */

    return NextResponse.json({
      ok: true,

      sessionId:
        session.id,

      player: {
        id:
          Number(
            selectedPlayer.player_id,
          ),

        fullName:
          selectedPlayer.name,

        imageUrl:
          selectedPlayer.image_url ??
          null,
      },

      board: {
        /*
         * ARTIK SADECE A TAKIM KULÜPLERİ
         */
        clubSlots:
          selectedCareer.length,
      },

      maxWrongGuesses:
        session.max_wrong_guesses,

      minimumSearchLength:
        MINIMUM_SEARCH_LENGTH,

      scoring: {
        zeroWrong:
          250,

        oneWrong:
          200,

        twoWrong:
          150,

        threeWrong:
          100,

        fourWrong:
          50,

        fiveWrong:
          0,
      },

      settings: {
        minimumPopularityScore:
          MINIMUM_POPULARITY_SCORE,

        minimumClubCount:
          MINIMUM_CLUB_COUNT,

        maximumClubCount:
          MAXIMUM_CLUB_COUNT,
      },
    });
  } catch (error) {
    console.error(
      "Career Path today endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Yeni Career Path oyunu hazırlanırken hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}