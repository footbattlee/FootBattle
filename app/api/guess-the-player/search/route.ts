import { NextResponse } from "next/server";

import {
  leagueToDisplayName,
  nationalityToDisplayName,
  positionToDisplayName,
  preferredFootToDisplayName,
} from "@/lib/football/localization";
import { isSuperLigGuessRequest } from "@/lib/guess-the-player/super-lig";
import { supabaseAdmin } from "@/lib/supabase/server";

const MINIMUM_SEARCH_LENGTH = 3;
const MAXIMUM_RESULTS = 10;
const CANDIDATE_LIMIT = 120;
const FALLBACK_LIMIT = 250;
const SUPER_LIG_COMPETITION_ID = "TR1";

const PLAYER_SELECT = `
  player_id,
  name,
  nationality,
  position,
  sub_position,
  age,
  current_club_name,
  current_competition_id,
  preferred_foot,
  image_url,
  popularity_score
`;

function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/đ/g, "d")
    .replace(/ð/g, "d")
    .replace(/ł/g, "l")
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9\s'-]/g, "")
    .replace(/\s+/g, " ");
}

function nameRank(name: string, query: string) {
  const normalized = normalizeSearchText(name);
  const tokens = normalized.split(" ").filter(Boolean);

  if (normalized === query) return 0;
  if (tokens.includes(query)) return 1;
  if (tokens.some((token) => token.startsWith(query))) return 2;
  if (normalized.startsWith(query)) return 3;
  if (normalized.includes(query)) return 4;
  return 5;
}

function mergeRows<T extends { player_id: number | string }>(...groups: T[][]) {
  const seen = new Set<number>();
  const merged: T[] = [];

  for (const group of groups) {
    for (const row of group) {
      const id = Number(row.player_id);
      if (!Number.isFinite(id) || seen.has(id)) continue;
      seen.add(id);
      merged.push(row);
    }
  }

  return merged;
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const rawQuery = requestUrl.searchParams.get("q") ?? "";
    const query = normalizeSearchText(rawQuery);

    if (query.length < MINIMUM_SEARCH_LENGTH) {
      return NextResponse.json({ ok: true, players: [], minimumSearchLength: MINIMUM_SEARCH_LENGTH });
    }

    const safeQuery = query.replace(/%/g, "").replace(/_/g, "");
    const superLigMode = isSuperLigGuessRequest(request);

    if (superLigMode) {
      // Süper Lig modu sadece şu an TR1'de aktif olan oyuncuları arar.
      // Kariyer tablosu + büyük fallback sorgularını tamamen atladığımız için bu yol çok daha hızlıdır.
      const { data, error } = await supabaseAdmin
        .from("guess_players")
        .select(PLAYER_SELECT)
        .eq("is_playable", 1)
        .eq("current_competition_id", SUPER_LIG_COMPETITION_ID)
        .ilike("name_normalized", `%${safeQuery}%`)
        .order("popularity_score", { ascending: false, nullsFirst: false })
        .limit(30);

      if (error) {
        console.error("Süper Lig oyuncu araması başarısız:", error);
        return NextResponse.json({ ok: false, error: "Oyuncular aranırken bir hata oluştu." }, { status: 500 });
      }

      const rows = (data ?? [])
        .filter((player) => normalizeSearchText(player.name ?? "").includes(query))
        .sort((a, b) => {
          const rankDiff = nameRank(a.name ?? "", query) - nameRank(b.name ?? "", query);
          if (rankDiff !== 0) return rankDiff;
          return Number(b.popularity_score ?? 0) - Number(a.popularity_score ?? 0);
        })
        .slice(0, MAXIMUM_RESULTS);

      const players = rows.map((player) => ({
        id: player.player_id,
        fullName: player.name,
        nationality: nationalityToDisplayName(player.nationality),
        position: positionToDisplayName(player.sub_position ?? player.position),
        club: player.current_club_name ?? "Kulüpsüz",
        league: leagueToDisplayName(player.current_competition_id),
        age: typeof player.age === "number" ? player.age : Number(player.age ?? 0),
        preferredFoot: preferredFootToDisplayName(player.preferred_foot),
        imageUrl: player.image_url ?? null,
      }));

      return NextResponse.json({
        ok: true,
        players,
        minimumSearchLength: MINIMUM_SEARCH_LENGTH,
        mode: "super_lig",
      });
    }

    // Standart Guess The Player için mevcut geniş arama davranışı korunur.
    const { data: directRows, error: directError } = await supabaseAdmin
      .from("guess_players")
      .select(PLAYER_SELECT)
      .eq("is_playable", 1)
      .ilike("name_normalized", `%${safeQuery}%`)
      .order("popularity_score", { ascending: false, nullsFirst: false })
      .limit(CANDIDATE_LIMIT);

    if (directError) {
      console.error("Guess the Player doğrudan araması başarısız:", directError);
      return NextResponse.json({ ok: false, error: "Oyuncular aranırken bir hata oluştu." }, { status: 500 });
    }

    const compact = safeQuery.replace(/[^a-z0-9]/g, "");
    let fallbackRows: typeof directRows = [];

    if (compact.length >= 2) {
      const first = compact[0];
      const last = compact[compact.length - 1];
      const fallbackPattern = `%${first}%${last}%`;

      const { data, error } = await supabaseAdmin
        .from("guess_players")
        .select(PLAYER_SELECT)
        .eq("is_playable", 1)
        .ilike("name", fallbackPattern)
        .order("popularity_score", { ascending: false, nullsFirst: false })
        .limit(FALLBACK_LIMIT);

      if (!error) fallbackRows = data ?? [];
      else console.warn("Guess the Player aksan fallback araması başarısız:", error);
    }

    const rows = mergeRows(directRows ?? [], fallbackRows ?? [])
      .filter((player) => normalizeSearchText(player.name ?? "").includes(query))
      .sort((a, b) => {
        const rankDiff = nameRank(a.name ?? "", query) - nameRank(b.name ?? "", query);
        if (rankDiff !== 0) return rankDiff;
        return Number(b.popularity_score ?? 0) - Number(a.popularity_score ?? 0);
      })
      .slice(0, MAXIMUM_RESULTS);

    const players = rows.map((player) => ({
      id: player.player_id,
      fullName: player.name,
      nationality: nationalityToDisplayName(player.nationality),
      position: positionToDisplayName(player.sub_position ?? player.position),
      club: player.current_club_name ?? "Kulüpsüz",
      league: leagueToDisplayName(player.current_competition_id),
      age: typeof player.age === "number" ? player.age : Number(player.age ?? 0),
      preferredFoot: preferredFootToDisplayName(player.preferred_foot),
      imageUrl: player.image_url ?? null,
    }));

    return NextResponse.json({
      ok: true,
      players,
      minimumSearchLength: MINIMUM_SEARCH_LENGTH,
      mode: "standard",
    });
  } catch (error) {
    console.error("Guess the Player search endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
