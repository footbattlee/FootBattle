import { NextResponse } from "next/server";

import {
  buildPlayerQuizSeniorCareer,
  playerQuizClubsAreEquivalent,
  type RawPlayerQuizClub,
} from "@/lib/player-quiz/clubs";

import { supabaseAdmin } from "@/lib/supabase/server";

type FieldType =
  | "birthYear"
  | "nationality"
  | "club";

type GuessRequest = {
  sessionId?: string;

  field?: FieldType;

  value?:
    | string
    | number;

  solvedClubIds?: number[];
};

const ALLOWED_FIELDS:
  FieldType[] = [
    "birthYear",
    "nationality",
    "club",
  ];

function normalizeNationality(
  value:
    | string
    | number
    | null
    | undefined,
) {
  return String(
    value ?? "",
  )
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
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-z0-9]/g,
      "",
    );
}

export async function POST(
  request: Request,
) {
  try {
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
      rawValue ===
        undefined ||
      rawValue ===
        null ||
      String(
        rawValue,
      ).trim() === ""
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
       SESSION
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
        completed
      `)
      .eq(
        "id",
        sessionId,
      )
      .maybeSingle();

    if (
      sessionError ||
      !session
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Transfer Quiz oturumu bulunamadı.",
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
            "Bu Transfer Quiz zaten tamamlandı.",
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
       BIRTH YEAR
    ===================================================== */

    if (
      field ===
      "birthYear"
    ) {
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

      if (
        error ||
        !data
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
       NATIONALITY

       Kullanıcı Türkçe yazabilir:
       Serbia -> Sırbistan
       Belgium -> Belçika
       Turkey -> Türkiye
    ===================================================== */

    if (
      field ===
      "nationality"
    ) {
      const {
        data: player,
        error: playerError,
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

      if (
        playerError ||
        !player?.nationality
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

      const dbNationality =
        player.nationality.trim();

      const {
        data: countryRow,
      } =
        await supabaseAdmin
          .from(
            "challenge_countries",
          )
          .select(`
            country_name,
            nationality_db_value
          `)
          .eq(
            "nationality_db_value",
            dbNationality,
          )
          .maybeSingle();

      const dbNormalized =
        normalizeNationality(
          dbNationality,
        );

      const trNormalized =
        normalizeNationality(
          countryRow
            ?.country_name ??
            dbNationality,
        );

      const guessedNormalized =
        normalizeNationality(
          rawValue,
        );

      return NextResponse.json({
        ok: true,
        field,

        correct:
          guessedNormalized ===
            dbNormalized ||
          guessedNormalized ===
            trNormalized,
      });
    }

    /* =====================================================
       CLUB
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
            "Oyuncunun A takım kariyeri bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    const matchedClub =
      seniorCareer.find(
        (club) =>
          playerQuizClubsAreEquivalent(
            club.name,
            rawValue,
          ),
      );

    if (!matchedClub) {
      return NextResponse.json({
        ok: true,
        field,
        correct: false,
        duplicate: false,
        matchedClub: null,
      });
    }

    if (
      solvedClubIds.includes(
        matchedClub.id,
      )
    ) {
      return NextResponse.json({
        ok: true,
        field,
        correct: false,
        duplicate: true,
        matchedClub: null,
      });
    }

    return NextResponse.json({
      ok: true,
      field,
      correct: true,
      duplicate: false,
      matchedClub,
    });
  } catch (error) {
    console.error(
      "Transfer Quiz guess endpoint hatası:",
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
