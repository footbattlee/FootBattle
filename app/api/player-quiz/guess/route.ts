import { NextResponse } from "next/server";

import {
  buildPlayerQuizSeniorCareer,
  normalizePlayerQuizText,
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

const ALLOWED_FIELDS: FieldType[] =
  [
    "birthYear",
    "nationality",
    "club",
  ];

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

      if (
        error ||
        !data?.nationality
      ) {
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

      return NextResponse.json({
        ok: true,

        field,

        correct:
          normalizePlayerQuizText(
            rawValue,
          ) ===
          normalizePlayerQuizText(
            data.nationality,
          ),
      });
    }

    /* =====================================================
       5. CLUBS
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

    /* =====================================================
       6. MATCH
    ===================================================== */

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

        correct:
          false,

        duplicate:
          false,

        matchedClub:
          null,
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

        correct:
          false,

        duplicate:
          true,

        matchedClub:
          null,
      });
    }

    return NextResponse.json({
      ok: true,

      field,

      correct:
        true,

      duplicate:
        false,

      matchedClub,
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