import { NextResponse } from "next/server";

import {
  footballLocaleFromRequest,
  footballSearchMatches,
  nationalityToDisplayName,
  normalizeFootballText,
} from "@/lib/football/localization";
import { supabaseAdmin } from "@/lib/supabase/server";

const MINIMUM_SEARCH_LENGTH = 3;
const MAXIMUM_RESULTS = 8;

export async function GET(request: Request) {
  try {
    const locale = footballLocaleFromRequest(request);
    const rawQuery = new URL(request.url).searchParams.get("q") ?? "";
    const query = normalizeFootballText(rawQuery);

    if (query.length < MINIMUM_SEARCH_LENGTH) {
      return NextResponse.json({ ok: true, countries: [], minimumSearchLength: MINIMUM_SEARCH_LENGTH });
    }

    const { data, error } = await supabaseAdmin
      .from("challenge_countries")
      .select("nationality_db_value, popularity_score")
      .eq("is_active", true)
      .order("popularity_score", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("Player Quiz milliyet araması başarısız:", error);
      return NextResponse.json({ ok: false, error: locale === "en" ? "Countries could not be searched." : "Milliyetler aranırken bir hata oluştu." }, { status: 500 });
    }

    const matches = (data ?? [])
      .map((row) => String(row.nationality_db_value ?? "").trim())
      .filter(Boolean)
      .filter((canonical) => footballSearchMatches("nationality", canonical, rawQuery, locale))
      .sort((a, b) => {
        const aDisplay = nationalityToDisplayName(a, locale);
        const bDisplay = nationalityToDisplayName(b, locale);
        const aExact = normalizeFootballText(aDisplay) === query || normalizeFootballText(a) === query;
        const bExact = normalizeFootballText(bDisplay) === query || normalizeFootballText(b) === query;
        if (aExact !== bExact) return aExact ? -1 : 1;
        const aStarts = normalizeFootballText(aDisplay).startsWith(query) || normalizeFootballText(a).startsWith(query);
        const bStarts = normalizeFootballText(bDisplay).startsWith(query) || normalizeFootballText(b).startsWith(query);
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
        return aDisplay.localeCompare(bDisplay, locale === "en" ? "en" : "tr");
      });

    const countries = Array.from(new Set(matches.map((canonical) => nationalityToDisplayName(canonical, locale)))).slice(0, MAXIMUM_RESULTS);

    return NextResponse.json({ ok: true, countries, minimumSearchLength: MINIMUM_SEARCH_LENGTH });
  } catch (error) {
    console.error("Player Quiz search-country endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
