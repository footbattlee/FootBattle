export type CompetitionKey = "super-lig" | "premier-league" | "champions-league";

export type CompetitionConfig = {
  key: CompetitionKey;
  espnSlug: string;
  trName: string;
  enName: string;
  emoji: string;
  accent: string;
};

export type StandingRow = {
  position: number;
  teamId: string;
  teamName: string;
  abbreviation: string;
  logo: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export type MatchRow = {
  id: string;
  date: string;
  state: "pre" | "in" | "post";
  statusText: string;
  home: { id: string; name: string; abbreviation: string; logo: string | null; score: string | null };
  away: { id: string; name: string; abbreviation: string; logo: string | null; score: string | null };
};

export type CompetitionSnapshot = {
  standings: StandingRow[];
  recentMatches: MatchRow[];
  upcomingMatches: MatchRow[];
  fetchedAt: string;
};

export const COMPETITIONS: Record<CompetitionKey, CompetitionConfig> = {
  "super-lig": {
    key: "super-lig",
    espnSlug: "tur.1",
    trName: "Trendyol Süper Lig",
    enName: "Turkish Süper Lig",
    emoji: "🇹🇷",
    accent: "from-red-500/20 to-white/5",
  },
  "premier-league": {
    key: "premier-league",
    espnSlug: "eng.1",
    trName: "Premier League",
    enName: "Premier League",
    emoji: "🏴",
    accent: "from-violet-500/20 to-cyan-400/5",
  },
  "champions-league": {
    key: "champions-league",
    espnSlug: "uefa.champions",
    trName: "UEFA Şampiyonlar Ligi",
    enName: "UEFA Champions League",
    emoji: "⭐",
    accent: "from-blue-500/20 to-indigo-400/5",
  },
};

const ESPN_BASE = "https://site.api.espn.com/apis";

function numericStat(stats: Array<{ name?: string; value?: number; displayValue?: string }> | undefined, names: string[]) {
  const stat = stats?.find((item) => item.name && names.includes(item.name));
  if (!stat) return 0;
  if (typeof stat.value === "number" && Number.isFinite(stat.value)) return stat.value;
  const parsed = Number(stat.displayValue ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function flattenStandingsChildren(input: unknown): unknown[] {
  if (!input || typeof input !== "object") return [];
  const obj = input as { standings?: { entries?: unknown[] }; children?: unknown[] };
  const direct = obj.standings?.entries ?? [];
  const nested = (obj.children ?? []).flatMap((child) => flattenStandingsChildren(child));
  return [...direct, ...nested];
}

function parseStandings(payload: unknown): StandingRow[] {
  const entries = flattenStandingsChildren(payload) as Array<{
    team?: { id?: string; displayName?: string; abbreviation?: string; logos?: Array<{ href?: string }> };
    stats?: Array<{ name?: string; value?: number; displayValue?: string }>;
  }>;

  return entries
    .map((entry, index) => {
      const stats = entry.stats ?? [];
      const position = numericStat(stats, ["rank", "rankCurrent", "position"]) || index + 1;
      return {
        position,
        teamId: entry.team?.id ?? String(index + 1),
        teamName: entry.team?.displayName ?? "-",
        abbreviation: entry.team?.abbreviation ?? "-",
        logo: entry.team?.logos?.[0]?.href ?? null,
        played: numericStat(stats, ["gamesPlayed", "gamesplayed"]),
        won: numericStat(stats, ["wins"]),
        drawn: numericStat(stats, ["ties", "draws"]),
        lost: numericStat(stats, ["losses"]),
        goalsFor: numericStat(stats, ["pointsFor", "goalsFor"]),
        goalsAgainst: numericStat(stats, ["pointsAgainst", "goalsAgainst"]),
        goalDifference: numericStat(stats, ["pointDifferential", "goalDifference"]),
        points: numericStat(stats, ["points"]),
      } satisfies StandingRow;
    })
    .filter((row) => row.teamName !== "-")
    .sort((a, b) => a.position - b.position);
}

function parseMatches(payload: unknown): MatchRow[] {
  const events = ((payload as { events?: unknown[] } | null)?.events ?? []) as Array<{
    id?: string;
    date?: string;
    status?: { type?: { state?: string; shortDetail?: string; detail?: string } };
    competitions?: Array<{
      competitors?: Array<{
        homeAway?: "home" | "away";
        score?: string;
        team?: { id?: string; displayName?: string; abbreviation?: string; logo?: string; logos?: Array<{ href?: string }> };
      }>;
    }>;
  }>;

  return events.flatMap((event) => {
    const competitors = event.competitions?.[0]?.competitors ?? [];
    const home = competitors.find((team) => team.homeAway === "home");
    const away = competitors.find((team) => team.homeAway === "away");
    if (!event.id || !event.date || !home?.team || !away?.team) return [];
    const rawState = event.status?.type?.state;
    const state: MatchRow["state"] = rawState === "post" ? "post" : rawState === "in" ? "in" : "pre";
    return [{
      id: event.id,
      date: event.date,
      state,
      statusText: event.status?.type?.shortDetail ?? event.status?.type?.detail ?? "",
      home: {
        id: home.team.id ?? "",
        name: home.team.displayName ?? "-",
        abbreviation: home.team.abbreviation ?? "-",
        logo: home.team.logo ?? home.team.logos?.[0]?.href ?? null,
        score: home.score ?? null,
      },
      away: {
        id: away.team.id ?? "",
        name: away.team.displayName ?? "-",
        abbreviation: away.team.abbreviation ?? "-",
        logo: away.team.logo ?? away.team.logos?.[0]?.href ?? null,
        score: away.score ?? null,
      },
    } satisfies MatchRow];
  });
}

function ymd(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export async function getCompetitionSnapshot(key: CompetitionKey): Promise<CompetitionSnapshot> {
  const config = COMPETITIONS[key];
  const now = new Date();
  const from = new Date(now.getTime() - 21 * 86400000);
  const to = new Date(now.getTime() + 21 * 86400000);

  const standingsUrl = `${ESPN_BASE}/v2/sports/soccer/${config.espnSlug}/standings`;
  const scoreboardUrl = `${ESPN_BASE}/site/v2/sports/soccer/${config.espnSlug}/scoreboard?dates=${ymd(from)}-${ymd(to)}&limit=200`;

  const [standingsResult, matchesResult] = await Promise.allSettled([
    fetch(standingsUrl, { next: { revalidate: 900 } }).then((r) => {
      if (!r.ok) throw new Error(`Standings ${r.status}`);
      return r.json();
    }),
    fetch(scoreboardUrl, { next: { revalidate: 300 } }).then((r) => {
      if (!r.ok) throw new Error(`Scoreboard ${r.status}`);
      return r.json();
    }),
  ]);

  const standings = standingsResult.status === "fulfilled" ? parseStandings(standingsResult.value) : [];
  const matches = matchesResult.status === "fulfilled" ? parseMatches(matchesResult.value) : [];
  const sorted = [...matches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const recentMatches = sorted.filter((match) => match.state === "post").slice(-10).reverse();
  const upcomingMatches = sorted.filter((match) => match.state !== "post").slice(0, 12);

  return { standings, recentMatches, upcomingMatches, fetchedAt: new Date().toISOString() };
}
