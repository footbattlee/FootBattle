import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

type FieldType =
  | "birthYear"
  | "nationality"
  | "club";

type GuessRequest = {
  sessionId?: string;
  field?: FieldType;
  value?: string | number;
  solvedClubIds?: number[];
};

const ALLOWED_FIELDS: FieldType[] = [
  "birthYear",
  "nationality",
  "club",
];

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
    .replace(/&/g, " ")
    .replace(/[.\-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================================================
   YOUTH FILTER
========================================================= */

function isYouthClubName(value: unknown) {
  const clubName = normalizeText(value);

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
========================================================= */

function normalizeClubName(value: unknown) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return "";
  }

  const removableWords = new Set([
    "fc",
    "afc",
    "cf",
    "sc",
    "sk",
    "fk",
    "ac",
    "jk",
    "football",
    "club",
    "futbol",
    "futebol",
    "calcio",
  ]);

  return normalized
    .split(" ")
    .filter(
      (word) =>
        word &&
        !removableWords.has(word),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================================================
   CLUB EQUIVALENCE
========================================================= */

function clubsAreEquivalent(
  firstValue: unknown,
  secondValue: unknown,
) {
  const first =
    normalizeClubName(firstValue);

  const second =
    normalizeClubName(secondValue);

  if (!first || !second) {
    return false;
  }

  if (first === second) {
    return true;
  }

  const shorter =
    first.length <= second.length
      ? first
      : second;

  const longer =
    first.length > second.length
      ? first
      : second;

  /*
   * Örnek:
   * Brighton
   * Brighton Hove Albion
   */
  if (
    shorter.length >= 6 &&
    (
      longer.startsWith(
        `${shorter} `,
      ) ||
      longer.endsWith(
        ` ${shorter}`,
      )
    )
  ) {
    return true;
  }

  const shorterWords =
    shorter.split(" ");

  const longerWords =
    longer.split(" ");

  if (
    shorter.length >= 6 &&
    shorterWords.every(
      (word) =>
        longerWords.includes(word),
    )
  ) {
    return true;
  }

  return false;
}

/* =========================================================
   BUILD SENIOR CAREER
========================================================= */

function buildSeniorCareer(
  rawClubs: {
    id: number;
    club_name: string;
    career_order: number | null;
  }[],
) {
  const seniorClubs =
    rawClubs.filter(
      (club) =>
        !isYouthClubName(
          club.club_name,
        ),
    );

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
          Number(club.id),

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
   POST
========================================================= */

export async function POST(
  request: Request,
) {
  try {
    /* =====================================================
       1. BODY
    ===================================================== */

    const body =
      (await request.json()) as GuessRequest;

    const sessionId =
      body.sessionId?.trim();

    const field =
      body.field;

    const rawValue =
      body.value;

    if (!sessionId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Oyun oturumu bulunamadı.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !field ||
      !ALLOWED_FIELDS.includes(
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
      String(rawValue).trim() ===
        ""
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Kontrol edilecek değer boş olamaz.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       2. SESSION
    ===================================================== */

    const {
      data: session,
      error: sessionError,
    } = await supabaseAdmin
      .from(
        "player_quiz_sessions",
      )
      .select(`
        id,
        player_id,
        max_lives,
        guess_time_seconds,
        completed
      `)
      .eq(
        "id",
        sessionId,
      )
      .maybeSingle();

    if (sessionError) {
      console.error(
        "Player Quiz session okunamadı:",
        sessionError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Player Quiz oturumu kontrol edilemedi.",
        },
        {
          status: 500,
        },
      );
    }

    if (!session) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Player Quiz oyunu bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      session.completed
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu Player Quiz oyunu zaten tamamlandı.",
        },
        {
          status: 409,
        },
      );
    }

    const playerId =
      Number(
        session.player_id,
      );

    /* =====================================================
       3. BIRTH YEAR
    ===================================================== */

    if (
      field ===
      "birthYear"
    ) {
      const guessedBirthYear =
        Number(rawValue);

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
        data,
        error,
      } = await supabaseAdmin
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

      if (error) {
        console.error(
          "Player Quiz doğum yılı okunamadı:",
          error,
        );

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

      if (!data) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Oyuncunun doğum yılı hazırlanmamış.",
          },
          {
            status: 404,
          },
        );
      }

      return NextResponse.json({
        ok: true,

        field,

        correct:
          guessedBirthYear ===
          Number(
            data.birth_year,
          ),
      });
    }

    /* =====================================================
       4. NATIONALITY
    ===================================================== */

    if (
      field ===
      "nationality"
    ) {
      const {
        data,
        error,
      } = await supabaseAdmin
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

      if (error) {
        console.error(
          "Player Quiz milliyet okunamadı:",
          error,
        );

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

      if (
        !data?.nationality
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Oyuncunun milliyet bilgisi bulunamadı.",
          },
          {
            status: 404,
          },
        );
      }

      return NextResponse.json({
        ok: true,

        field,

        correct:
          normalizeText(
            rawValue,
          ) ===
          normalizeText(
            data.nationality,
          ),
      });
    }

    /* =====================================================
       5. CLUB
    ===================================================== */

    const solvedClubIds =
      Array.isArray(
        body.solvedClubIds,
      )
        ? body.solvedClubIds
            .map(Number)
            .filter(
              (id) =>
                Number.isInteger(
                  id,
                ) &&
                id > 0,
            )
        : [];

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
        playerId,
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
        "Player Quiz kulüpleri okunamadı:",
        clubsError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Kulüp kontrol edilemedi.",
        },
        {
          status: 500,
        },
      );
    }

    if (
      !rawClubs ||
      rawClubs.length ===
        0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Oyuncunun kulüp bilgileri bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    const seniorCareer =
      buildSeniorCareer(
        rawClubs,
      );

    if (
      seniorCareer.length ===
      0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Oyuncunun A takım kariyeri bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    /* =====================================================
       6. CLUB MATCH
    ===================================================== */

    const matchedClub =
      seniorCareer.find(
        (club) =>
          clubsAreEquivalent(
            club.name,
            rawValue,
          ),
      );

    if (!matchedClub) {
      return NextResponse.json({
        ok: true,

        field,

        correct:
          false,

        duplicate:
          false,

        matchedClub:
          null,
      });
    }

    /* =====================================================
       7. DUPLICATE
    ===================================================== */

    if (
      solvedClubIds.includes(
        matchedClub.id,
      )
    ) {
      return NextResponse.json({
        ok: true,

        field,

        correct:
          false,

        duplicate:
          true,

        matchedClub:
          null,
      });
    }

    /* =====================================================
       8. CORRECT
    ===================================================== */

    return NextResponse.json({
      ok: true,

      field,

      correct:
        true,

      duplicate:
        false,

      matchedClub: {
        id:
          matchedClub.id,

        name:
          matchedClub.name,

        careerOrder:
          matchedClub.careerOrder,
      },
    });
  } catch (error) {
    console.error(
      "Player Quiz guess endpoint hatası:",
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