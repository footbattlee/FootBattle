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
        clubs: [],
        minimumSearchLength: MINIMUM_SEARCH_LENGTH,
      });
    }

    const safeQuery = query
      .replace(/%/g, "")
      .replace(/_/g, "");

    const { data, error } = await supabaseAdmin
      .from("guess_players")
      .select("current_club_name")
      .eq("is_playable", 1)
      .not("current_club_name", "is", null)
      .ilike("current_club_name", `${safeQuery}%`)
      .limit(100);

    if (error) {
      console.error(
        "Player Quiz kulüp araması başarısız:",
        error,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Kulüpler aranırken bir hata oluştu.",
        },
        { status: 500 },
      );
    }

    const clubs = Array.from(
      new Set(
        (data ?? [])
          .map((row) => row.current_club_name)
          .filter(
            (club): club is string =>
              typeof club === "string" &&
              club.trim().length > 0,
          ),
      ),
    )
      .sort((a, b) => a.localeCompare(b, "tr"))
      .slice(0, MAXIMUM_RESULTS);

    return NextResponse.json({
      ok: true,
      clubs,
      minimumSearchLength: MINIMUM_SEARCH_LENGTH,
    });
  } catch (error) {
    console.error(
      "Player Quiz search-club endpoint hatası:",
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