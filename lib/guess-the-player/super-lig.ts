import { supabaseAdmin } from "@/lib/supabase/server";

export type SuperLigDifficulty = "easy" | "medium" | "hard" | "mixed";

const TURKISH_COMPETITION_ID = "TR1";

function readReferrer(request: Request) {
  return request.headers.get("referer") ?? "";
}

export function isSuperLigGuessRequest(request: Request) {
  return readReferrer(request).includes("/guess-the-player/super-lig");
}

export function getSuperLigDifficulty(request: Request): SuperLigDifficulty {
  try {
    const url = new URL(readReferrer(request));
    const value = url.searchParams.get("difficulty");
    if (value === "easy" || value === "medium" || value === "hard") return value;
  } catch {}
  return "mixed";
}

export function getPopularityBounds(difficulty: SuperLigDifficulty) {
  if (difficulty === "easy") return { min: 84, max: 100 };
  if (difficulty === "medium") return { min: 68, max: 83.999 };
  if (difficulty === "hard") return { min: 50, max: 67.999 };
  return { min: 50, max: 100 };
}

// Adı geriye dönük uyumluluk için korunuyor. Artık sadece şu anda Süper Lig'de
// (TR1) oynayan aktif oyuncuları döndürüyor; eski Süper Lig kariyeri yeterli değil.
export async function getSuperLigCareerPlayerIds() {
  const { data, error } = await supabaseAdmin
    .from("guess_players")
    .select("player_id")
    .eq("is_playable", 1)
    .eq("current_competition_id", TURKISH_COMPETITION_ID)
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
    const { data, error } = await supabaseAdmin
      .from("guess_players")
      .select("player_id")
      .in("player_id", batch)
      .eq("is_playable", 1)
      .eq("current_competition_id", TURKISH_COMPETITION_ID)
      .gte("popularity_score", min)
      .lte("popularity_score", max);
    if (error) throw error;
    for (const row of data ?? []) output.push(Number(row.player_id));
  }

  return output;
}
