import { NextResponse } from "next/server";

import { nationalityToDisplayName } from "@/lib/football/localization";
import { supabaseAdmin } from "@/lib/supabase/server";

const MINIMUM_SEARCH_LENGTH = 2;
const MAXIMUM_RESULTS = 12;

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
    const rawQuery =
      requestUrl.searchParams.get("q") ?? "";

    const query = normalizeSearchText(rawQuery);

    if (query.length < MINIMUM_SEARCH_LENGTH) {
      return NextResponse.json({
        ok: true,
        teams: [],
        minimumSearchLength:
          MINIMUM_SEARCH_LENGTH,
      });
    }

    const safeQuery = query
      .replace(/%/g, "")
      .replace(/_/g, "");

    const { data, error } = await supabaseAdmin
      .from("football_teams")
      .select(`
        id,
        name,
        normalized_name,
        logo_url,
        country,
        competition_id
      `)
      .eq("is_active", true)
      .ilike(
        "normalized_name",
        `%${safeQuery}%`,
      )
      .order("name", {
        ascending: true,
      })
      .limit(MAXIMUM_RESULTS);

    if (error) {
      console.error(
        "Takım araması başarısız:",
        error,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Takımlar aranırken hata oluştu.",
        },
        { status: 500 },
      );
    }

    const teams = (data ?? []).map(
      (team) => ({
        id: Number(team.id),
        name: team.name,
        logoUrl: team.logo_url ?? null,
        country: team.country
          ? nationalityToDisplayName(team.country)
          : null,
        competitionId:
          team.competition_id ?? null,
      }),
    );

    return NextResponse.json({
      ok: true,
      teams,
      minimumSearchLength:
        MINIMUM_SEARCH_LENGTH,
    });
  } catch (error) {
    console.error(
      "Search-team endpoint hatası:",
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