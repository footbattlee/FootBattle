import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

const MINIMUM_SEARCH_LENGTH = 3;
const MAXIMUM_RESULTS = 8;

function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9\s'-]/g, "")
    .replace(/\s+/g, " ");
}

export async function GET(request: Request) {
  try {
    const requestUrl =
      new URL(request.url);

    const rawQuery =
      requestUrl.searchParams.get("q") ?? "";

    const query =
      normalizeSearchText(rawQuery);

    if (
      query.length <
      MINIMUM_SEARCH_LENGTH
    ) {
      return NextResponse.json({
        ok: true,
        trophies: [],
        minimumSearchLength:
          MINIMUM_SEARCH_LENGTH,
      });
    }

    const safeQuery = query
      .replace(/%/g, "")
      .replace(/_/g, "");

    /*
     * Herhangi bir yerden eşleşme:
     *
     * "league" ->
     * Champions League
     * Premier League
     * Europa League
     *
     * gibi sonuçları bulabilir.
     */
    const { data, error } =
      await supabaseAdmin
        .from(
          "player_quiz_trophies",
        )
        .select("trophy_name")
        .not(
          "trophy_name",
          "is",
          null,
        )
        .ilike(
          "trophy_name",
          `%${safeQuery}%`,
        )
        .limit(300);

    if (error) {
      console.error(
        "Player Quiz kupa araması başarısız:",
        error,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Kupalar aranırken bir hata oluştu.",
        },
        { status: 500 },
      );
    }

    /*
     * Aynı kupa binlerce oyuncuda
     * bulunduğu için tekrarları kaldır.
     */
    const trophies = Array.from(
      new Set(
        (data ?? [])
          .map((row) =>
            row.trophy_name?.trim(),
          )
          .filter(
            (
              trophy,
            ): trophy is string =>
              typeof trophy ===
                "string" &&
              trophy.length > 0,
          ),
      ),
    )
      .sort((a, b) =>
        a.localeCompare(b, "tr"),
      )
      .slice(
        0,
        MAXIMUM_RESULTS,
      );

    return NextResponse.json({
      ok: true,
      trophies,
      minimumSearchLength:
        MINIMUM_SEARCH_LENGTH,
    });
  } catch (error) {
    console.error(
      "Player Quiz search-trophy endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Beklenmeyen bir hata oluştu.",
      },
      { status: 500 },
    );
  }
}