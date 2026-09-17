export type MatchState = "pre" | "in" | "post";

export type FootballMatch = {
  id: string;
  date: string;
  state: MatchState;
  statusText: string;
  roundNumber: number | null;
  roundLabel: string | null;
  home: { id: string; name: string; abbreviation: string; logo: string | null; score: string | null };
  away: { id: string; name: string; abbreviation: string; logo: string | null; score: string | null };
};

const ESPN_SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const SEASON_START = new Date("2026-07-01T00:00:00Z");
const SEASON_END = new Date("2027-06-30T23:59:59Z");

function ymd(date: Date) {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

function windows() {
  const result: Array<{ start: Date; end: Date }> = [];
  let cursor = new Date(SEASON_START);
  while (cursor <= SEASON_END) {
    const start = new Date(cursor);
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0, 23, 59, 59));
    if (end > SEASON_END) end.setTime(SEASON_END.getTime());
    result.push({ start, end });
    cursor = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() + 1));
  }
  return result;
}

function normalizeState(event: any, competition: any): MatchState {
  const status = competition?.status ?? event?.status;
  const type = status?.type ?? {};
  if (type.completed === true || status?.completed === true || type.state === "post") return "post";
  if (type.state === "in") return "in";
  return "pre";
}

export function parseEspnMatches(payload: unknown): FootballMatch[] {
  const events = ((payload as any)?.events ?? []) as any[];
  return events.flatMap((event) => {
    const competition = event?.competitions?.[0];
    const competitors = competition?.competitors ?? [];
    const home = competitors.find((item: any) => item.homeAway === "home");
    const away = competitors.find((item: any) => item.homeAway === "away");
    if (!event?.id || !event?.date || !home?.team || !away?.team) return [];
    const status = competition?.status ?? event?.status;
    const type = status?.type ?? {};
    const week = event?.week ?? competition?.week;
    return [{
      id: String(event.id),
      date: String(event.date),
      state: normalizeState(event, competition),
      statusText: type.shortDetail ?? type.detail ?? "",
      roundNumber: typeof week?.number === "number" ? week.number : null,
      roundLabel: week?.text ?? competition?.notes?.find((note: any) => note?.headline)?.headline ?? null,
      home: { id: String(home.team.id ?? ""), name: home.team.displayName ?? "-", abbreviation: home.team.abbreviation ?? "-", logo: home.team.logo ?? home.team.logos?.[0]?.href ?? null, score: home.score == null ? null : String(home.score) },
      away: { id: String(away.team.id ?? ""), name: away.team.displayName ?? "-", abbreviation: away.team.abbreviation ?? "-", logo: away.team.logo ?? away.team.logos?.[0]?.href ?? null, score: away.score == null ? null : String(away.score) },
    } satisfies FootballMatch];
  });
}

async function fetchWindow(slug: string, start: Date, end: Date): Promise<FootballMatch[]> {
  const url = `${ESPN_SITE}/${slug}/scoreboard?dates=${ymd(start)}-${ymd(end)}&limit=200`;
  const response = await fetch(url, { next: { revalidate: 300 } });
  if (!response.ok) return [];
  return parseEspnMatches(await response.json());
}

export async function getSeasonMatches(slug: string): Promise<FootballMatch[]> {
  const settled = await Promise.allSettled(windows().map(({ start, end }) => fetchWindow(slug, start, end)));
  const byId = new Map<string, FootballMatch>();
  for (const item of settled) {
    if (item.status !== "fulfilled") continue;
    for (const match of item.value) byId.set(match.id, match);
  }
  return [...byId.values()].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

export function matchesTeam(match: FootballMatch, teamId: string) {
  return match.home.id === teamId || match.away.id === teamId;
}
