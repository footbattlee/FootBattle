import { supabaseAdmin } from "@/lib/supabase/server";
import {
  generateTicTacToeGrid,
  type TicTacToeAxisItem,
  type TicTacToeGrid,
} from "@/lib/tic-tac-toe/grid-generator";

const MIN_TEAM_SCORE = 80;
const MIN_CELL_PLAYERS = 2;
const MAX_TEAMS = 70;
const TEAM_QUERY_CHUNK = 30;
const PLAYER_QUERY_CHUNK = 200;
const DB_PAGE_SIZE = 1000;

type ClubHistoryRow = {
  player_id: number;
  club_name: string | null;
};

type PairInfo = {
  playerIds: number[];
};

function normalize(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function shuffle<T>(values: T[]) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function pairKey(first: string, second: string) {
  return [first, second]
    .sort((left, right) => left.localeCompare(right, "tr"))
    .join("|||");
}

function intersect(first: Set<string>, second: Set<string>) {
  const result = new Set<string>();
  const [small, large] = first.size <= second.size ? [first, second] : [second, first];
  for (const value of small) {
    if (large.has(value)) result.add(value);
  }
  return result;
}

async function loadEligibleTeamNames() {
  const { data, error } = await supabaseAdmin
    .from("football_teams")
    .select("name, duel_score")
    .eq("duel_enabled", true)
    .gte("duel_score", MIN_TEAM_SCORE)
    .order("duel_score", { ascending: false })
    .limit(MAX_TEAMS);

  if (error) throw error;
  return Array.from(
    new Set((data ?? []).map((row) => normalize(row.name)).filter(Boolean)),
  );
}

async function loadClubHistory(teamNames: string[]) {
  const rows: ClubHistoryRow[] = [];

  for (let teamIndex = 0; teamIndex < teamNames.length; teamIndex += TEAM_QUERY_CHUNK) {
    const teamChunk = teamNames.slice(teamIndex, teamIndex + TEAM_QUERY_CHUNK);
    let from = 0;

    while (true) {
      const { data, error } = await supabaseAdmin
        .from("player_quiz_clubs")
        .select("player_id, club_name")
        .in("club_name", teamChunk)
        .not("club_name", "is", null)
        .range(from, from + DB_PAGE_SIZE - 1);

      if (error) throw error;
      const page = (data ?? []) as ClubHistoryRow[];
      rows.push(...page);
      if (page.length < DB_PAGE_SIZE) break;
      from += DB_PAGE_SIZE;
      if (from > 100_000) break;
    }
  }

  return rows;
}

async function loadPlayableIds(playerIds: number[]) {
  const playable = new Set<number>();

  for (let index = 0; index < playerIds.length; index += PLAYER_QUERY_CHUNK) {
    const chunk = playerIds.slice(index, index + PLAYER_QUERY_CHUNK);
    const { data, error } = await supabaseAdmin
      .from("guess_players")
      .select("player_id")
      .eq("is_playable", 1)
      .in("player_id", chunk);

    if (error) throw error;
    for (const row of data ?? []) {
      const id = Number(row.player_id);
      if (Number.isInteger(id) && id > 0) playable.add(id);
    }
  }

  return playable;
}

function gridQuality(playerCounts: number[]) {
  return playerCounts.reduce((total, count) => {
    if (count <= 2) return total + 3;
    if (count <= 4) return total + 6;
    if (count <= 8) return total + 9;
    if (count <= 15) return total + 10;
    return total + 9;
  }, 0);
}

async function generateTeamTeamGrid(): Promise<TicTacToeGrid | null> {
  const teamNames = await loadEligibleTeamNames();
  if (teamNames.length < 6) return null;

  const history = await loadClubHistory(teamNames);
  const relevantPlayerIds = Array.from(
    new Set(
      history
        .map((row) => Number(row.player_id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  );
  const playableIds = await loadPlayableIds(relevantPlayerIds);

  const clubsByPlayer = new Map<number, Set<string>>();
  for (const row of history) {
    const playerId = Number(row.player_id);
    if (!playableIds.has(playerId)) continue;
    const club = normalize(row.club_name);
    if (!club) continue;
    if (!clubsByPlayer.has(playerId)) clubsByPlayer.set(playerId, new Set<string>());
    clubsByPlayer.get(playerId)!.add(club);
  }

  const pairMap = new Map<string, PairInfo>();
  for (const [playerId, clubSet] of clubsByPlayer) {
    const clubs = Array.from(clubSet);
    for (let first = 0; first < clubs.length - 1; first += 1) {
      for (let second = first + 1; second < clubs.length; second += 1) {
        if (clubs[first] === clubs[second]) continue;
        const key = pairKey(clubs[first], clubs[second]);
        const pair = pairMap.get(key) ?? { playerIds: [] };
        if (!pair.playerIds.includes(playerId)) pair.playerIds.push(playerId);
        pairMap.set(key, pair);
      }
    }
  }

  const adjacency = new Map<string, Set<string>>();
  for (const [key, pair] of pairMap) {
    if (pair.playerIds.length < MIN_CELL_PLAYERS) continue;
    const [firstClub, secondClub] = key.split("|||");
    if (!adjacency.has(firstClub)) adjacency.set(firstClub, new Set<string>());
    if (!adjacency.has(secondClub)) adjacency.set(secondClub, new Set<string>());
    adjacency.get(firstClub)!.add(secondClub);
    adjacency.get(secondClub)!.add(firstClub);
  }

  const candidates = shuffle(
    Array.from(adjacency.keys())
      .filter((club) => (adjacency.get(club)?.size ?? 0) >= 3)
      .sort(
        (first, second) =>
          (adjacency.get(second)?.size ?? 0) - (adjacency.get(first)?.size ?? 0),
      )
      .slice(0, 50),
  );

  let best: TicTacToeGrid | null = null;

  for (let firstIndex = 0; firstIndex < candidates.length - 2; firstIndex += 1) {
    const firstClub = candidates[firstIndex];
    const firstNeighbors = adjacency.get(firstClub);
    if (!firstNeighbors) continue;

    for (let secondIndex = firstIndex + 1; secondIndex < candidates.length - 1; secondIndex += 1) {
      const secondClub = candidates[secondIndex];
      const secondNeighbors = adjacency.get(secondClub);
      if (!secondNeighbors) continue;

      const commonFirstTwo = intersect(firstNeighbors, secondNeighbors);
      if (commonFirstTwo.size < 3) continue;

      for (let thirdIndex = secondIndex + 1; thirdIndex < candidates.length; thirdIndex += 1) {
        const thirdClub = candidates[thirdIndex];
        const thirdNeighbors = adjacency.get(thirdClub);
        if (!thirdNeighbors) continue;

        const common = intersect(commonFirstTwo, thirdNeighbors);
        common.delete(firstClub);
        common.delete(secondClub);
        common.delete(thirdClub);
        if (common.size < 3) continue;

        const rowClubs = [firstClub, secondClub, thirdClub];
        const columnClubs = shuffle(Array.from(common)).slice(0, 3);
        const rows: TicTacToeAxisItem[] = rowClubs.map((value) => ({ type: "club", value }));
        const columns: TicTacToeAxisItem[] = columnClubs.map((value) => ({ type: "club", value }));
        const cells: TicTacToeGrid["cells"] = [];
        const counts: number[] = [];
        let valid = true;

        for (let rowIndex = 0; rowIndex < 3; rowIndex += 1) {
          for (let columnIndex = 0; columnIndex < 3; columnIndex += 1) {
            const pair = pairMap.get(pairKey(rowClubs[rowIndex], columnClubs[columnIndex]));
            if (!pair || pair.playerIds.length < MIN_CELL_PLAYERS) {
              valid = false;
              break;
            }
            counts.push(pair.playerIds.length);
            cells.push({
              rowIndex,
              columnIndex,
              row: rows[rowIndex],
              column: columns[columnIndex],
              validPlayerIds: [...pair.playerIds],
              validPlayerCount: pair.playerIds.length,
            });
          }
          if (!valid) break;
        }

        if (!valid || cells.length !== 9) continue;

        const grid: TicTacToeGrid = {
          mode: "club_club",
          rows,
          columns,
          cells,
          qualityScore: gridQuality(counts),
        };

        if (!best || grid.qualityScore > best.qualityScore) best = grid;
        if (grid.qualityScore >= 48) return grid;
      }
    }
  }

  return best;
}

/**
 * Random Tic Tac Toe grids are deliberately split between sensible modes:
 * - Takım x Ülke
 * - Takım x Takım
 * There is intentionally no Ülke x Ülke mode.
 */
export async function generateBalancedTicTacToeGrid(): Promise<TicTacToeGrid> {
  const preferTeamTeam = Math.random() < 0.5;

  if (preferTeamTeam) {
    try {
      const teamTeam = await generateTeamTeamGrid();
      if (teamTeam) return teamTeam;
    } catch (error) {
      console.error("TTT team-team generator fallback:", error);
    }
  }

  return generateTicTacToeGrid();
}
