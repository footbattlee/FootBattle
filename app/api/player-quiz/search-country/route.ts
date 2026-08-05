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
    const requestUrl = new URL(request.url);
    const rawQuery = requestUrl.searchParams.get("q") ?? "";
    const query = normalizeSearchText(rawQuery);

    if (query.length < MINIMUM_SEARCH_LENGTH) {
      return NextResponse.json({
        ok: true,
        countries: [],
        minimumSearchLength: MINIMUM_SEARCH_LENGTH,
      });
    }

    const safeQuery = query
      .replace(/%/g, "")
      .replace(/_/g, "");

    const { data, error } = await supabaseAdmin
      .from("guess_players")
      .select("nationality")
      .eq("is_playable", 1)
      .not("nationality", "is", null)
      .ilike("nationality", `${safeQuery}%`)
      .limit(100);

    if (error) {
      console.error(
        "Player Quiz milliyet araması başarısız:",
        error,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Milliyetler aranırken bir hata oluştu.",
        },
        { status: 500 },
      );
    }

    const countries = Array.from(
      new Set(
        (data ?? [])
          .map((row) => row.nationality)
          .filter(
            (country): country is string =>
              typeof country === "string" &&
              country.trim().length > 0,
          ),
      ),
    )
      .sort((a, b) => a.localeCompare(b, "tr"))
      .slice(0, MAXIMUM_RESULTS);

    return NextResponse.json({
      ok: true,
      countries,
      minimumSearchLength: MINIMUM_SEARCH_LENGTH,
    });
  } catch (error) {
    console.error(
      "Player Quiz search-country endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Beklenmeyen bir hata oluştu.",
      },
      { status: 500 },
    );
  }
}