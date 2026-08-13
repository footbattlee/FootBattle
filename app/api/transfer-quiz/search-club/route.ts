import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

const MINIMUM_SEARCH_LENGTH = 3;
const MAXIMUM_RESULTS = 15;

function normalizeSearch(
  value: string,
) {
  return value
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
    .replace(
      /[^a-z0-9]/g,
      "",
    );
}

function isYouthClub(
  value: string,
) {
  const name =
    value
      .toLocaleLowerCase(
        "tr-TR",
      )
      .replace(/ı/g, "i")
      .replace(/ç/g, "c")
      .replace(/ğ/g, "g")
      .replace(/ö/g, "o")
      .replace(/ş/g, "s")
      .replace(/ü/g, "u");

  return (
    /\bu[\s-]?\d{2}\b/.test(
      name,
    ) ||
    /\byth\b/.test(
      name,
    ) ||
    /\byouth\b/.test(
      name,
    ) ||
    /\bacademy\b/.test(
      name,
    ) ||
    /\bakademi\b/.test(
      name,
    ) ||
    /\breserve\b/.test(
      name,
    ) ||
    /\breserves\b/.test(
      name,
    ) ||
    /\bprimavera\b/.test(
      name,
    ) ||
    /\bjuvenil\b/.test(
      name,
    ) ||
    /\bjuniors?\b/.test(
      name,
    )
  );
}

export async function GET(
  request: Request,
) {
  try {
    const url =
      new URL(
        request.url,
      );

    const rawQuery =
      url.searchParams.get(
        "q",
      ) ?? "";

    const query =
      normalizeSearch(
        rawQuery,
      );

    if (
      query.length <
      MINIMUM_SEARCH_LENGTH
    ) {
      return NextResponse.json({
        ok: true,
        clubs: [],

        minimumSearchLength:
          MINIMUM_SEARCH_LENGTH,
      });
    }

    const {
      data: teams,
      error: teamsError,
    } =
      await supabaseAdmin
        .from(
          "football_teams",
        )
        .select(`
          name,
          normalized_name
        `)
        .ilike(
          "normalized_name",
          `%${query}%`,
        )
        .limit(
          100,
        );

    if (teamsError) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Kulüpler aranırken hata oluştu.",
        },
        {
          status: 500,
        },
      );
    }

    const seen =
      new Set<string>();

    const clubs:
      string[] =
      [];

    for (
      const team of
        teams ?? []
    ) {
      const name =
        team.name?.trim();

      if (
        !name ||
        isYouthClub(
          name,
        )
      ) {
        continue;
      }

      const normalized =
        normalizeSearch(
          name,
        );

      if (
        seen.has(
          normalized,
        )
      ) {
        continue;
      }

      seen.add(
        normalized,
      );

      clubs.push(
        name,
      );
    }

    clubs.sort(
      (
        first,
        second,
      ) => {
        const a =
          normalizeSearch(
            first,
          );

        const b =
          normalizeSearch(
            second,
          );

        if (
          a === query &&
          b !== query
        ) {
          return -1;
        }

        if (
          b === query &&
          a !== query
        ) {
          return 1;
        }

        const aStarts =
          a.startsWith(
            query,
          );

        const bStarts =
          b.startsWith(
            query,
          );

        if (
          aStarts &&
          !bStarts
        ) {
          return -1;
        }

        if (
          !aStarts &&
          bStarts
        ) {
          return 1;
        }

        if (
          first.length !==
          second.length
        ) {
          return (
            first.length -
            second.length
          );
        }

        return first.localeCompare(
          second,
          "tr-TR",
        );
      },
    );

    return NextResponse.json({
      ok: true,

      clubs:
        clubs.slice(
          0,
          MAXIMUM_RESULTS,
        ),

      minimumSearchLength:
        MINIMUM_SEARCH_LENGTH,
    });
  } catch (error) {
    console.error(
      "Transfer Quiz search-club endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Beklenmeyen bir hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}
