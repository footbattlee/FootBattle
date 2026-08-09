import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

const MINIMUM_SEARCH_LENGTH = 3;
const MAXIMUM_RESULTS = 15;

/* =========================================================
   NORMALIZE
========================================================= */

function normalizeSearch(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]/g, "");
}

/* =========================================================
   YOUTH FILTER
========================================================= */

function isYouthClub(value: string) {
  const name = value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u");

  return (
    /\bu[\s-]?\d{2}\b/.test(name) ||
    /\byth\b/.test(name) ||
    /\byouth\b/.test(name) ||
    /\bacademy\b/.test(name) ||
    /\bakademi\b/.test(name) ||
    /\breserve\b/.test(name) ||
    /\breserves\b/.test(name) ||
    /\bprimavera\b/.test(name) ||
    /\bjuvenil\b/.test(name) ||
    /\bjuniors?\b/.test(name)
  );
}

/* =========================================================
   GET
========================================================= */

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const rawQuery =
      url.searchParams.get("q") ?? "";

    const query =
      normalizeSearch(rawQuery);

    /* =====================================================
       MINIMUM LENGTH
    ===================================================== */

    if (
      query.length <
      MINIMUM_SEARCH_LENGTH
    ) {
      return NextResponse.json({
        ok: true,
        clubs: [],
        minimumSearchLength:
          MINIMUM_SEARCH_LENGTH,

        debug: {
          routeVersion:
            "CAREER_SEARCH_V3",
          query,
          reason:
            "minimum-length",
        },
      });
    }

    /* =====================================================
       FOOTBALL_TEAMS

       normalized_name örnekleri:

       realmadrid
       benfica
       besiktas
       brightonhovealbion
    ===================================================== */

    const {
      data: teams,
      error: teamsError,
    } = await supabaseAdmin
      .from("football_teams")
      .select(`
        name,
        normalized_name
      `)
      .ilike(
        "normalized_name",
        `%${query}%`,
      )
      .limit(100);

    if (teamsError) {
      console.error(
        "football_teams search error:",
        teamsError,
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            "Kulüpler aranırken hata oluştu.",

          debug: {
            routeVersion:
              "CAREER_SEARCH_V3",

            query,

            databaseError:
              teamsError.message,
          },
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       FILTER + UNIQUE
    ===================================================== */

    const seen =
      new Set<string>();

    const clubs: string[] =
      [];

    for (
      const team of
        teams ?? []
    ) {
      const name =
        team.name?.trim();

      if (!name) {
        continue;
      }

      if (
        isYouthClub(name)
      ) {
        continue;
      }

      const normalized =
        normalizeSearch(name);

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

    /* =====================================================
       RANK

       Exact > startsWith > contains
    ===================================================== */

    clubs.sort(
      (
        first,
        second,
      ) => {
        const firstNormalized =
          normalizeSearch(
            first,
          );

        const secondNormalized =
          normalizeSearch(
            second,
          );

        /* EXACT */

        if (
          firstNormalized ===
            query &&
          secondNormalized !==
            query
        ) {
          return -1;
        }

        if (
          secondNormalized ===
            query &&
          firstNormalized !==
            query
        ) {
          return 1;
        }

        /* STARTS */

        const firstStarts =
          firstNormalized.startsWith(
            query,
          );

        const secondStarts =
          secondNormalized.startsWith(
            query,
          );

        if (
          firstStarts &&
          !secondStarts
        ) {
          return -1;
        }

        if (
          !firstStarts &&
          secondStarts
        ) {
          return 1;
        }

        /*
         * Daha kısa takım adı
         * önce gelsin.
         */

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

    const finalClubs =
      clubs.slice(
        0,
        MAXIMUM_RESULTS,
      );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      clubs:
        finalClubs,

      minimumSearchLength:
        MINIMUM_SEARCH_LENGTH,

      debug: {
        routeVersion:
          "CAREER_SEARCH_V3",

        rawQuery,

        normalizedQuery:
          query,

        databaseMatches:
          teams?.length ??
          0,

        returned:
          finalClubs.length,
      },
    });
  } catch (error) {
    console.error(
      "Career Path search club error:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Beklenmeyen bir hata oluştu.",

        debug: {
          routeVersion:
            "CAREER_SEARCH_V3",
        },
      },
      {
        status: 500,
      },
    );
  }
}