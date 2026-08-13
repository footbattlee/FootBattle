import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

const MINIMUM_SEARCH_LENGTH = 3;
const MAXIMUM_RESULTS = 8;

function normalizeSearchText(
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

export async function GET(
  request: Request,
) {
  try {
    const requestUrl =
      new URL(
        request.url,
      );

    const rawQuery =
      requestUrl.searchParams.get(
        "q",
      ) ?? "";

    const query =
      normalizeSearchText(
        rawQuery,
      );

    if (
      query.length <
      MINIMUM_SEARCH_LENGTH
    ) {
      return NextResponse.json({
        ok: true,
        countries: [],

        minimumSearchLength:
          MINIMUM_SEARCH_LENGTH,
      });
    }

    /*
     * challenge_countries:
     * country_name = Türkçe görünen değer
     * nationality_db_value = guess_players.nationality
     */

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "challenge_countries",
        )
        .select(`
          country_name,
          nationality_db_value,
          popularity_score
        `)
        .eq(
          "is_active",
          true,
        )
        .order(
          "popularity_score",
          {
            ascending: false,
            nullsFirst: false,
          },
        );

    if (error) {
      console.error(
        "Transfer Quiz ülke araması başarısız:",
        error,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Milliyetler aranırken bir hata oluştu.",
        },
        {
          status: 500,
        },
      );
    }

    const matches =
      (
        data ??
        []
      )
        .map(
          (row) => {
            const turkish =
              row.country_name?.trim() ??
              "";

            const database =
              row.nationality_db_value?.trim() ??
              "";

            return {
              turkish,
              database,

              normalizedTurkish:
                normalizeSearchText(
                  turkish,
                ),

              normalizedDatabase:
                normalizeSearchText(
                  database,
                ),
            };
          },
        )
        .filter(
          (item) =>
            Boolean(
              item.turkish,
            ) &&
            (
              item.normalizedTurkish.includes(
                query,
              ) ||
              item.normalizedDatabase.includes(
                query,
              )
            ),
        );

    matches.sort(
      (
        first,
        second,
      ) => {
        const firstExact =
          first.normalizedTurkish ===
            query ||
          first.normalizedDatabase ===
            query;

        const secondExact =
          second.normalizedTurkish ===
            query ||
          second.normalizedDatabase ===
            query;

        if (
          firstExact &&
          !secondExact
        ) {
          return -1;
        }

        if (
          !firstExact &&
          secondExact
        ) {
          return 1;
        }

        const firstStarts =
          first.normalizedTurkish.startsWith(
            query,
          ) ||
          first.normalizedDatabase.startsWith(
            query,
          );

        const secondStarts =
          second.normalizedTurkish.startsWith(
            query,
          ) ||
          second.normalizedDatabase.startsWith(
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

        return first.turkish.localeCompare(
          second.turkish,
          "tr-TR",
        );
      },
    );

    const countries =
      Array.from(
        new Set(
          matches
            .map(
              (item) =>
                item.turkish,
            )
            .filter(Boolean),
        ),
      ).slice(
        0,
        MAXIMUM_RESULTS,
      );

    return NextResponse.json({
      ok: true,
      countries,

      minimumSearchLength:
        MINIMUM_SEARCH_LENGTH,
    });
  } catch (error) {
    console.error(
      "Transfer Quiz search-country endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Beklenmeyen bir hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}
