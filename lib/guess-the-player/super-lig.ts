import { supabaseAdmin } from "@/lib/supabase/server";

export type SuperLigDifficulty = "easy" | "medium" | "hard" | "mixed";

const TURKISH_COMPETITION_ID = "TR1";

// 2026-27 Süper Lig kulüpleri. TFF fikstüründeki güncel 18 takım baz alınır.
// Antalyaspor, Kayserispor ve Fatih Karagümrük artık bu havuzda değildir.
export const CURRENT_SUPER_LIG_CLUB_NAMES = [
  "Alanyaspor",
  "Amed SK",
  "Basaksehir FK",
  "Beşiktaş Jimnastik Kulübü",
  "Caykur Rizespor",
  "Corum FK",
  "Erzurumspor FK",
  "Eyüpspor",
  "Fenerbahce",
  "Galatasaray",
  "Gaziantep FK",
  "Gençlerbirliği Spor Kulübü",
  "Göztepe",
  "Kasimpasa",
  "Kocaelispor",
  "Konyaspor",
  "Samsunspor",
  "Trabzonspor",
] as const;

function readReferrer(request: Request) {
  return request.headers.get("referer") ?? "";
}

export function isSuperLigGuessRequest(request: Request) {
  const requestUrl = new URL(request.url);
  if (requestUrl.searchParams.get("mode") === "super_lig") return true;
  return readReferrer(request).includes("/guess-the-player/super-lig");
}

export function getSuperLigDifficulty(request: Request): SuperLigDifficulty {
  const requestUrl = new URL(request.url);
  const explicit = requestUrl.searchParams.get("difficulty");
  if (explicit === "easy" || explicit === "medium" || explicit === "hard" || explicit === "mixed") return explicit;

  try {
    const url = new URL(readReferrer(request));
    const value = url.searchParams.get("difficulty");
    if (value === "easy" || value === "medium" || value === "hard") return value;
  } catch {}
  return "mixed";
}

export function getPopularityBounds(difficulty: SuperLigDifficulty) {
  if (difficulty === "easy") return { min: 84, max: Number.POSITIVE_INFINITY };
  if (difficulty === "medium") return { min: 68, max: 83.999 };
  if (difficulty === "hard") return { min: 50, max: 67.999 };
  return { min: 50, max: Number.POSITIVE_INFINITY };
}

// Güncel Süper Lig takım whitelist'i + TR1 + aktif oyuncu şartları birlikte kullanılır.
// Böylece eski TR1 etiketi kalmış küme düşen kulüpler hedef havuzuna giremez.
export async function getSuperLigCareerPlayerIds() {
  const { data, error } = await supabaseAdmin
    .from("guess_players")
    .select("player_id")
    .eq("is_playable", 1)
    .eq("is_active", 1)
    .eq("current_competition_id", TURKISH_COMPETITION_ID)
    .in("current_club_name", [...CURRENT_SUPER_LIG_CLUB_NAMES])
    .limit(10000);

  if (error) throw error;
  return Array.from(new Set((data ?? []).map((row) => Number(row.player_id)).filter(Number.isFinite)));
}

export async function filterSuperLigPlayerIdsByDifficulty(playerIds: number[], difficulty: SuperLigDifficulty) {
  if (playerIds.length === 0) return [];
  const { min, max } = getPopularityBounds(difficulty);
  const output: number[] = [];

  for (let index = 0; index < playerIds.length; index += 300) {
    const batch = playerIds.slice(index, index + 300);
    let query = supabaseAdmin
      .from("guess_players")
      .select("player_id")
      .in("player_id", batch)
      .eq("is_playable", 1)
      .eq("is_active", 1)
      .eq("current_competition_id", TURKISH_COMPETITION_ID)
      .in("current_club_name", [...CURRENT_SUPER_LIG_CLUB_NAMES])
      .gte("popularity_score", min);

    if (Number.isFinite(max)) {
      query = query.lte("popularity_score", max);
    }

    const { data, error } = await query;
    if (error) throw error;
    for (const row of data ?? []) output.push(Number(row.player_id));
  }

  return output;
}
