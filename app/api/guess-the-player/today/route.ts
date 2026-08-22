import { NextResponse } from "next/server";

import {
  CURRENT_SUPER_LIG_CLUB_NAMES,
  getPopularityBounds,
  getSuperLigDifficulty,
  isSuperLigGuessRequest,
  type SuperLigDifficulty,
} from "@/lib/guess-the-player/super-lig";
import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 7;
const MINIMUM_SEARCH_LENGTH = 3;
const MINIMUM_POPULARITY_SCORE = 84;
const SUPER_LIG_COMPETITION_ID = "TR1";
const PLAYER_POOL_CACHE_TTL_MS = 5 * 60 * 1000;
const PLAYER_PAGE_SIZE = 1000;

type CandidatePlayer = {
  player_id: number;
  nationality: string | null;
  position: string | null;
  sub_position: string | null;
  age: number | string | null;
  current_club_name: string | null;
  current_competition_id: string | null;
  preferred_foot: string | null;
  popularity_score: number | null;
};

type PoolCache = {
  expiresAt: number;
  players: CandidatePlayer[];
};

const PLAYER_SELECT = `
  player_id,
  nationality,
  position,
  sub_position,
  age,
  current_club_name,
  current_competition_id,
  preferred_foot,
  popularity_score
`;

let normalPoolCache: PoolCache | null = null;
const superLigPoolCache = new Map<SuperLigDifficulty, PoolCache>();

function getTurkeyDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isCompletePlayer(player: CandidatePlayer) {
  return Boolean(
    player.nationality &&
      player.position &&
      player.age !== null &&
      player.current_club_name &&
      player.current_competition_id &&
      player.preferred_foot,
  );
}

function randomFromPool(players: CandidatePlayer[]) {
  if (!players.length) return null;
  return players[Math.floor(Math.random() * players.length)] ?? null;
}

async function loadPagedPlayers(buildQuery: (from: number, to: number) => Promise<{ data: unknown; error: unknown }>) {
  const players: CandidatePlayer[] = [];
  let from = 0;

  while (true) {
    const to = from + PLAYER_PAGE_SIZE - 1;
    const { data, error } = await buildQuery(from, to);
    if (error) throw error;

    const page = ((data ?? []) as CandidatePlayer[]).filter(isCompletePlayer);
    players.push(...page);

    const rawLength = Array.isArray(data) ? data.length : 0;
    if (rawLength < PLAYER_PAGE_SIZE) break;
    from += PLAYER_PAGE_SIZE;
    if (from > 100_000) break;
  }

  return players;
}

async function getNormalPool() {
  const now = Date.now();
  if (normalPoolCache && normalPoolCache.expiresAt > now) return normalPoolCache.players;

  const players = await loadPagedPlayers(async (from, to) => {
    const { data, error } = await supabaseAdmin
      .from("guess_players")
      .select(PLAYER_SELECT)
      .eq("is_playable", 1)
      .gte("popularity_score", MINIMUM_POPULARITY_SCORE)
      .order("player_id", { ascending: true })
      .range(from, to);
    return { data, error };
  });

  normalPoolCache = { expiresAt: now + PLAYER_POOL_CACHE_TTL_MS, players };
  return players;
}

async function getSuperLigPool(difficulty: SuperLigDifficulty) {
  const now = Date.now();
  const cached = superLigPoolCache.get(difficulty);
  if (cached && cached.expiresAt > now) return cached.players;

  const { min, max } = getPopularityBounds(difficulty);
  const players = await loadPagedPlayers(async (from, to) => {
    let query = supabaseAdmin
      .from("guess_players")
      .select(PLAYER_SELECT)
      .eq("is_playable", 1)
      .eq("is_active", 1)
      .eq("current_competition_id", SUPER_LIG_COMPETITION_ID)
      .in("current_club_name", [...CURRENT_SUPER_LIG_CLUB_NAMES])
      .gte("popularity_score", min);

    if (Number.isFinite(max)) query = query.lte("popularity_score", max);

    const { data, error } = await query
      .order("player_id", { ascending: true })
      .range(from, to);
    return { data, error };
  });

  superLigPoolCache.set(difficulty, {
    expiresAt: now + PLAYER_POOL_CACHE_TTL_MS,
    players,
  });
  return players;
}

async function getNormalRandomPlayer() {
  return randomFromPool(await getNormalPool());
}

async function getSuperLigRandomPlayer(difficulty: SuperLigDifficulty) {
  return randomFromPool(await getSuperLigPool(difficulty));
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const dailyMode = url.searchParams.get("daily") === "1";
    const superLigMode = !dailyMode && isSuperLigGuessRequest(request);
    const difficulty = getSuperLigDifficulty(request);
    let targetPlayer: CandidatePlayer | null = null;

    if (dailyMode) {
      const { data: dailyRow, error: dailyError } = await supabaseAdmin
        .from("daily_guess_player")
        .select("player_id, is_published")
        .eq("play_date", getTurkeyDateKey())
        .eq("is_published", true)
        .maybeSingle();

      if (dailyError) throw dailyError;
      if (!dailyRow) return NextResponse.json({ ok: false, error: "Bugünün Guess The Player oyunu henüz yayınlanmadı." }, { status: 404 });

      const { data, error } = await supabaseAdmin
        .from("guess_players")
        .select(PLAYER_SELECT)
        .eq("player_id", dailyRow.player_id)
        .eq("is_playable", 1)
        .maybeSingle();
      if (error) throw error;
      if (data && isCompletePlayer(data)) targetPlayer = data as CandidatePlayer;
    } else if (superLigMode) {
      targetPlayer = await getSuperLigRandomPlayer(difficulty);
    } else {
      targetPlayer = await getNormalRandomPlayer();
    }

    if (!targetPlayer) {
      return NextResponse.json({ ok: false, error: superLigMode ? "Bu zorlukta aktif Süper Lig oyuncusu bulunamadı." : "Guess the Player için uygun oyuncu seçilemedi." }, { status: 500 });
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("guess_player_sessions")
      .insert({ player_id: targetPlayer.player_id, max_attempts: MAX_ATTEMPTS })
      .select("id, max_attempts")
      .single();

    if (sessionError || !session) throw sessionError ?? new Error("Yeni oyun oluşturulamadı.");

    return NextResponse.json({
      ok: true,
      mode: dailyMode ? "daily" : superLigMode ? "super_lig" : "random",
      daily: dailyMode,
      superLig: superLigMode,
      difficulty: superLigMode ? difficulty : null,
      sessionId: session.id,
      maxAttempts: session.max_attempts,
      minimumSearchLength: MINIMUM_SEARCH_LENGTH,
      minimumPopularityScore: superLigMode ? 50 : MINIMUM_POPULARITY_SCORE,
      board: { columns: ["nationality", "club", "competition", "position", "age", "preferredFoot"] },
    });
  } catch (error) {
    console.error("Guess the Player today endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Yeni oyun hazırlanırken hata oluştu." }, { status: 500 });
  }
}
