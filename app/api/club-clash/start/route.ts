import { NextResponse } from "next/server";

import { getSharedSoloChallengeId } from "@/lib/shared-solo-challenge";
import { supabaseAdmin } from "@/lib/supabase/server";

const GAME_DURATION_SECONDS = 120;
const MAX_PASSES = 3;
const SCORE_PER_CORRECT = 20;
const MINIMUM_POPULARITY_SCORE = 85;
const MINIMUM_TEAM_DUEL_SCORE = 70;
const ROUND_POOL_SIZE = 40;
const PLAYER_PAGE_SIZE = 1000;
const PLAYER_CHUNK_SIZE = 200;
const PAIR_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CANDIDATE_PAIRS = 150;

type TeamRow = { name: string; duel_score: number | null };
type ClubRow = { player_id: number; club_name: string };
type PairCandidate = { clubA: string; clubB: string; answerPlayerIds: number[]; qualityScore: number };
type PairCache = { expiresAt: number; pairs: PairCandidate[] };
type StoredRound = { round_no: number; left_club: string; right_club: string; answer_player_ids: number[] | null };

let pairCache: PairCache | null = null;
let pairBuildPromise: Promise<PairCandidate[]> | null = null;

function shuffleArray<T>(values: T[]) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function makePairKey(clubA: string, clubB: string) {
  return [clubA, clubB].sort((a, b) => a.localeCompare(b, "tr")).join("|||");
}

async function loadEligiblePlayerIds() {
  const playerIds: number[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from("guess_players")
      .select("player_id")
      .eq("is_playable", 1)
      .gte("popularity_score", MINIMUM_POPULARITY_SCORE)
      .order("player_id", { ascending: true })
      .range(from, from + PLAYER_PAGE_SIZE - 1);
    if (error) throw error;
    const rows = data ?? [];
    for (const row of rows) {
      const id = Number(row.player_id);
      if (Number.isInteger(id) && id > 0) playerIds.push(id);
    }
    if (rows.length < PLAYER_PAGE_SIZE) break;
    from += PLAYER_PAGE_SIZE;
    if (from > 100_000) throw new Error("Oyuncu havuzu güvenlik sınırını aştı.");
  }
  return Array.from(new Set(playerIds));
}

async function loadClubRows(playerIds: number[]) {
  const rows: ClubRow[] = [];
  for (let index = 0; index < playerIds.length; index += PLAYER_CHUNK_SIZE) {
    const { data, error } = await supabaseAdmin
      .from("player_quiz_clubs")
      .select("player_id, club_name")
      .in("player_id", playerIds.slice(index, index + PLAYER_CHUNK_SIZE))
      .not("club_name", "is", null);
    if (error) throw error;
    rows.push(...((data ?? []) as ClubRow[]));
  }
  return rows;
}

async function buildPairPool() {
  const startedAt = Date.now();
  const [{ data: teamData, error: teamError }, eligiblePlayerIds] = await Promise.all([
    supabaseAdmin.from("football_teams").select("name, duel_score").eq("duel_enabled", true).gte("duel_score", MINIMUM_TEAM_DUEL_SCORE),
    loadEligiblePlayerIds(),
  ]);
  if (teamError) throw teamError;
  const teams = (teamData ?? []) as TeamRow[];
  if (teams.length < 2) throw new Error("2 Takım 1 Oyuncu için yeterli takım bulunamadı.");
  if (!eligiblePlayerIds.length) throw new Error("Oyun için uygun popüler oyuncu bulunamadı.");

  const teamMap = new Map<string, TeamRow>();
  for (const team of teams) {
    const name = team.name?.trim();
    if (name) teamMap.set(name, team);
  }

  const rawClubRows = await loadClubRows(eligiblePlayerIds);
  const clubsByPlayer = new Map<number, Set<string>>();
  for (const row of rawClubRows) {
    const playerId = Number(row.player_id);
    const clubName = row.club_name?.trim();
    if (!Number.isInteger(playerId) || playerId <= 0 || !clubName || !teamMap.has(clubName)) continue;
    const clubs = clubsByPlayer.get(playerId) ?? new Set<string>();
    clubs.add(clubName);
    clubsByPlayer.set(playerId, clubs);
  }

  const pairMap = new Map<string, PairCandidate>();
  for (const [playerId, clubSet] of clubsByPlayer) {
    const clubs = Array.from(clubSet);
    for (let i = 0; i < clubs.length - 1; i += 1) {
      for (let j = i + 1; j < clubs.length; j += 1) {
        const firstClub = clubs[i];
        const secondClub = clubs[j];
        if (!firstClub || !secondClub || firstClub === secondClub) continue;
        const firstTeam = teamMap.get(firstClub);
        const secondTeam = teamMap.get(secondClub);
        if (!firstTeam || !secondTeam) continue;
        const key = makePairKey(firstClub, secondClub);
        const existing = pairMap.get(key);
        if (existing) {
          if (!existing.answerPlayerIds.includes(playerId)) existing.answerPlayerIds.push(playerId);
          continue;
        }
        const [clubA, clubB] = [firstClub, secondClub].sort((a, b) => a.localeCompare(b, "tr"));
        pairMap.set(key, { clubA, clubB, answerPlayerIds: [playerId], qualityScore: Number(firstTeam.duel_score ?? 0) + Number(secondTeam.duel_score ?? 0) });
      }
    }
  }

  const pairs = Array.from(pairMap.values())
    .filter((pair) => pair.answerPlayerIds.length > 0)
    .sort((a, b) => b.answerPlayerIds.length * 1000 + b.qualityScore - (a.answerPlayerIds.length * 1000 + a.qualityScore))
    .slice(0, MAX_CANDIDATE_PAIRS);
  if (!pairs.length) throw new Error("Ortak oyuncusu bulunan takım eşleşmesi bulunamadı.");
  console.log(`[club-clash-perf] pair pool built in ${Date.now() - startedAt}ms, pairs=${pairs.length}`);
  return pairs;
}

async function getPairPool() {
  const now = Date.now();
  if (pairCache && pairCache.expiresAt > now) return pairCache.pairs;
  if (!pairBuildPromise) pairBuildPromise = buildPairPool();
  try {
    const pairs = await pairBuildPromise;
    pairCache = { expiresAt: Date.now() + PAIR_CACHE_TTL_MS, pairs };
    return pairs;
  } finally {
    pairBuildPromise = null;
  }
}

function selectRounds(pairPool: PairCandidate[]) {
  const candidatePairs = shuffleArray(pairPool);
  const selectedPairs: PairCandidate[] = [];
  const usedClubs = new Set<string>();
  const usedPairKeys = new Set<string>();
  for (const pair of candidatePairs) {
    if (usedClubs.has(pair.clubA) || usedClubs.has(pair.clubB)) continue;
    selectedPairs.push(pair);
    usedPairKeys.add(makePairKey(pair.clubA, pair.clubB));
    usedClubs.add(pair.clubA);
    usedClubs.add(pair.clubB);
    if (selectedPairs.length >= ROUND_POOL_SIZE) return selectedPairs;
  }
  for (const pair of candidatePairs) {
    const key = makePairKey(pair.clubA, pair.clubB);
    if (usedPairKeys.has(key)) continue;
    selectedPairs.push(pair);
    usedPairKeys.add(key);
    if (selectedPairs.length >= ROUND_POOL_SIZE) break;
  }
  return selectedPairs;
}

async function loadSharedRounds(challengeId: string): Promise<PairCandidate[] | null> {
  const { data: source, error: sourceError } = await supabaseAdmin.from("club_clash_sessions").select("id").eq("id", challengeId).maybeSingle();
  if (sourceError) throw sourceError;
  if (!source) return null;

  const { data, error } = await supabaseAdmin
    .from("club_clash_rounds")
    .select("round_no, left_club, right_club, answer_player_ids")
    .eq("session_id", challengeId)
    .order("round_no", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as StoredRound[];
  if (!rows.length) return null;
  return rows.map((row) => ({
    clubA: String(row.left_club),
    clubB: String(row.right_club),
    answerPlayerIds: Array.isArray(row.answer_player_ids) ? row.answer_player_ids.map(Number) : [],
    qualityScore: 0,
  })).filter((row) => row.answerPlayerIds.length > 0);
}

export async function POST(request: Request) {
  const requestStartedAt = Date.now();
  try {
    const challengeId = getSharedSoloChallengeId(request);
    const selectedPairs = challengeId ? await loadSharedRounds(challengeId) : selectRounds(await getPairPool());
    if (!selectedPairs?.length) {
      return NextResponse.json({ ok: false, error: challengeId ? "Paylaşılan 2 Takım 1 Oyuncu oyunu bulunamadı." : "Oyun roundları hazırlanamadı." }, { status: challengeId ? 404 : 500 });
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("club_clash_sessions")
      .insert({ score: 0, pass_count: 0, max_passes: MAX_PASSES, duration_seconds: GAME_DURATION_SECONDS, completed: false })
      .select("id, score, pass_count, max_passes, duration_seconds, completed, created_at")
      .single();
    if (sessionError || !session) return NextResponse.json({ ok: false, error: "Yeni oyun oturumu oluşturulamadı." }, { status: 500 });

    const rowsToInsert = selectedPairs.map((pair, index) => ({
      session_id: session.id,
      round_no: index + 1,
      left_club: pair.clubA,
      right_club: pair.clubB,
      answer_player_ids: pair.answerPlayerIds,
      attempt_count: 0,
      completed: false,
      passed: false,
    }));
    const { error: roundsError } = await supabaseAdmin.from("club_clash_rounds").insert(rowsToInsert);
    if (roundsError) {
      await supabaseAdmin.from("club_clash_sessions").delete().eq("id", session.id);
      return NextResponse.json({ ok: false, error: "Oyun roundları oluşturulamadı." }, { status: 500 });
    }

    const firstRound = selectedPairs[0];
    console.log(`[club-clash-perf] start completed in ${Date.now() - requestStartedAt}ms`);
    return NextResponse.json({
      ok: true,
      mode: challengeId ? "challenge" : "random",
      challenge: Boolean(challengeId),
      sessionId: session.id,
      score: 0,
      scorePerCorrect: SCORE_PER_CORRECT,
      durationSeconds: GAME_DURATION_SECONDS,
      maxPasses: MAX_PASSES,
      usedPasses: 0,
      remainingPasses: MAX_PASSES,
      totalPreparedRounds: selectedPairs.length,
      round: { roundNo: 1, leftClub: firstRound.clubA, rightClub: firstRound.clubB },
    });
  } catch (error) {
    console.error("Club Clash solo start endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "2 Takım 1 Oyuncu hazırlanırken hata oluştu." }, { status: 500 });
  }
}
