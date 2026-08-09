import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

type GuessRequest = {
  sessionId?: string;
  clubName?: string;
  solvedClubIds?: number[];
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
    .replace(/&/g, " ")
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

   Kulüp adındaki genel ekleri temizliyoruz.

   Sunderland AFC
   -> Sunderland

   Real Madrid CF
   -> Real Madrid

   FC Barcelona
   -> Barcelona
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
        !removableWords.has(
          word,
        ),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================================================
   CLUB EQUIVALENCE

   Önce birebir normalize eşleşme.

   Sonra uzun/kısa isim kontrolü:

   Brighton
   Brighton Hove Albion

   Sunderland
   Sunderland AFC

   gibi farklara izin veriyoruz.
========================================================= */

function clubsAreEquivalent(
  firstValue: unknown,
  secondValue: unknown,
) {
  const first =
    normalizeClubName(
      firstValue,
    );

  const second =
    normalizeClubName(
      secondValue,
    );

  if (
    !first ||
    !second
  ) {
    return false;
  }

  /* =======================================================
     1. EXACT
  ======================================================= */

  if (
    first === second
  ) {
    return true;
  }

  /* =======================================================
     2. WORD BASED PREFIX/SUFFIX

     Brighton
     Brighton Hove Albion

     Uzunluğu en az 6 karakter olan kısa isimlerde.
  ======================================================= */

  const shorter =
    first.length <=
    second.length
      ? first
      : second;

  const longer =
    first.length >
    second.length
      ? first
      : second;

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

  /* =======================================================
     3. TOKEN CHECK

     Örnek:
     Brighton
     Brighton Hove Albion

     Kısa isim tek kelimeyse ve uzun isimde
     tam kelime olarak bulunuyorsa eşleştir.

     Ama minimum 6 karakter kuralı var.
     Bu "Inter" gibi çok genel isimlerin
     yanlış eşleşmesini azaltır.
  ======================================================= */

  const shorterWords =
    shorter.split(" ");

  const longerWords =
    longer.split(" ");

  if (
    shorter.length >= 6 &&
    shorterWords.every(
      (word) =>
        longerWords.includes(
          word,
        ),
    )
  ) {
    return true;
  }

  return false;
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

    const clubName =
      body.clubName?.trim() ??
      "";

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

    if (!clubName) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Kulüp seçimi boş olamaz.",
        },
        {
          status: 400,
        },
      );
    }

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

    /* =====================================================
       2. SESSION
    ===================================================== */

    const {
      data: session,
      error: sessionError,
    } = await supabaseAdmin
      .from(
        "career_path_sessions",
      )
      .select(`
        id,
        player_id,
        max_wrong_guesses,
        completed
      `)
      .eq(
        "id",
        sessionId,
      )
      .maybeSingle();

    if (sessionError) {
      console.error(
        "Career Path session okunamadı:",
        sessionError,
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            "Oyun oturumu kontrol edilemedi.",
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
            "Career Path oyunu bulunamadı.",
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
            "Bu Career Path oyunu zaten tamamlandı.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       3. RAW CAREER CLUBS
    ===================================================== */

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
        session.player_id,
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
        "Career Path kulüpleri okunamadı:",
        clubsError,
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            "Kulüp bilgileri kontrol edilemedi.",
        },
        {
          status: 500,
        },
      );
    }

    if (
      !rawClubs ||
      rawClubs.length === 0
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Oyuncunun kariyer kulüpleri bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    /* =====================================================
       4. ONLY SENIOR CLUBS
    ===================================================== */

    const seniorClubs =
      rawClubs.filter(
        (club) =>
          !isYouthClubName(
            club.club_name,
          ),
      );

    if (
      seniorClubs.length === 0
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
       5. SORT ORIGINAL CAREER
    ===================================================== */

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

    /* =====================================================
       6. UNIQUE CLUBS

       Aynı kulübe tekrar dönmüşse bir kere say.
    ===================================================== */

    const uniqueClubMap =
      new Map<
        string,
        {
          id: number;
          club_name: string;
          original_order: number;
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

      /*
       * Burada normal exact normalize yeterli.
       *
       * Aynı kariyerde:
       * Sunderland
       * Sunderland AFC
       *
       * gibi iki farklı varyant varsa
       * normalized isim üzerinden tek kulüp sayılır.
       */
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

          club_name:
            club.club_name,

          original_order:
            Number(
              club.career_order ??
                0,
            ),
        },
      );
    }

    /* =====================================================
       7. REBUILD CAREER ORDER

       Youth çıktıktan sonra:

       4 Doncaster
       6 Aston Villa
       7 Newcastle

       yerine:

       1 Doncaster
       2 Aston Villa
       3 Newcastle
    ===================================================== */

    const careerClubs =
      Array.from(
        uniqueClubMap.values(),
      )
        .sort(
          (
            first,
            second,
          ) =>
            first.original_order -
            second.original_order,
        )
        .map(
          (
            club,
            index,
          ) => ({
            id:
              club.id,

            club_name:
              club.club_name,

            career_order:
              index + 1,
          }),
        );

    if (
      careerClubs.length === 0
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Oyuncunun geçerli A takım kariyer kulüpleri bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    /* =====================================================
       8. MATCH

       Artık sadece exact normalize değil,
       clubsAreEquivalent kullanıyoruz.

       Brighton & Hove Albion
       ↔ Brighton

       Sunderland AFC
       ↔ Sunderland

       Real Madrid CF
       ↔ Real Madrid
    ===================================================== */

    const matchedClub =
      careerClubs.find(
        (club) =>
          clubsAreEquivalent(
            club.club_name,
            clubName,
          ),
      );

    /* =====================================================
       9. WRONG
    ===================================================== */

    if (!matchedClub) {
      return NextResponse.json({
        ok: true,

        correct:
          false,

        duplicate:
          false,

        matchedClub:
          null,

        /*
         * Geçici debug.
         * Testler bitince kaldırabiliriz.
         */
        debug: {
          guessedClub:
            clubName,

          normalizedGuess:
            normalizeClubName(
              clubName,
            ),
        },
      });
    }

    /* =====================================================
       10. DUPLICATE
    ===================================================== */

    if (
      solvedClubIds.includes(
        matchedClub.id,
      )
    ) {
      return NextResponse.json({
        ok: true,

        correct:
          false,

        duplicate:
          true,

        matchedClub:
          null,
      });
    }

    /* =====================================================
       11. CORRECT
    ===================================================== */

    return NextResponse.json({
      ok: true,

      correct:
        true,

      duplicate:
        false,

      matchedClub: {
        id:
          matchedClub.id,

        name:
          matchedClub.club_name,

        careerOrder:
          matchedClub.career_order,
      },
    });
  } catch (error) {
    console.error(
      "Career Path guess endpoint hatası:",
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