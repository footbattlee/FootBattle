import { COMPETITIONS, getCompetitionSnapshot, type CompetitionKey, type MatchRow } from "@/lib/football/competition-hubs";

export type TeamOrganization = {
  key: string;
  trName: string;
  enName: string;
  emoji: string;
  matches: MatchRow[];
  competitionKey: CompetitionKey | null;
};

export type TeamPlayer = {
  id: string;
  name: string;
  position: string | null;
  jersey: string | null;
  headshot: string | null;
  nationality: string | null;
};

const EXTRA_ORGANIZATIONS = [
  { key: "europa-league", espnSlug: "uefa.europa", trName: "UEFA Avrupa Ligi", enName: "UEFA Europa League", emoji: "🟠" },
  { key: "conference-league", espnSlug: "uefa.europa.conf", trName: "UEFA Konferans Ligi", enName: "UEFA Conference League", emoji: "🟢" },
  { key: "turkish-cup", espnSlug: "tur.cup", trName: "Türkiye Kupası", enName: "Turkish Cup", emoji: "🏆" },
  { key: "fa-cup", espnSlug: "eng.fa", trName: "FA Cup", enName: "FA Cup", emoji: "🏆" },
  { key: "copa-del-rey", espnSlug: "esp.copa_del_rey", trName: "Copa del Rey", enName: "Copa del Rey", emoji: "🏆" },
  { key: "coppa-italia", espnSlug: "ita.coppa_italia", trName: "Coppa Italia", enName: "Coppa Italia", emoji: "🏆" },
  { key: "dfb-pokal", espnSlug: "ger.dfb_pokal", trName: "DFB-Pokal", enName: "DFB-Pokal", emoji: "🏆" },
  { key: "coupe-de-france", espnSlug: "fra.coupe_de_france", trName: "Coupe de France", enName: "Coupe de France", emoji: "🏆" },
  { key: "taca-portugal", espnSlug: "por.taca.portugal", trName: "Taça de Portugal", enName: "Taça de Portugal", emoji: "🏆" },
] as const;

const ESPN_BASE = "https://site.api.espn.com/apis";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(fc|cf|ac|sc|sk|fk|club|spor|futbol|football|calcio)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseMatches(payload: unknown): MatchRow[] {
  const events = ((payload as { events?: unknown[] } | null)?.events ?? []) as Array<{
    id?: string;
    date?: string;
    week?: { number?: number; text?: string };
    status?: { type?: { state?: string; shortDetail?: string; detail?: string } };
    competitions?: Array<{
      notes?: Array<{ headline?: string }>;
      competitors?: Array<{
        homeAway?: "home" | "away";
        score?: string;
        team?: { id?: string; displayName?: string; abbreviation?: string; logo?: string; logos?: Array<{ href?: string }> };
      }>;
    }>;
  }>;

  return events.flatMap((event) => {
    const competition = event.competitions?.[0];
    const competitors = competition?.competitors ?? [];
    const home = competitors.find((team) => team.homeAway === "home");
    const away = competitors.find((team) => team.homeAway === "away");
    if (!event.id || !event.date || !home?.team || !away?.team) return [];
    const rawState = event.status?.type?.state;
    const state: MatchRow["state"] = rawState === "post" ? "post" : rawState === "in" ? "in" : "pre";
    const noteHeadline = competition?.notes?.find((note) => note.headline)?.headline ?? null;
    return [{
      id: event.id,
      date: event.date,
      state,
      statusText: event.status?.type?.shortDetail ?? event.status?.type?.detail ?? "",
      roundNumber: typeof event.week?.number === "number" ? event.week.number : null,
      roundLabel: event.week?.text ?? noteHeadline,
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

async function getMatchesForSlug(slug: string) {
  const seasonStart = new Date("2026-07-01T00:00:00Z");
  const seasonEnd = new Date("2027-06-30T23:59:59Z");
  const url = `${ESPN_BASE}/site/v2/sports/soccer/${slug}/scoreboard?dates=${ymd(seasonStart)}-${ymd(seasonEnd)}&limit=500`;
  try {
    const response = await fetch(url, { next: { revalidate: 300 } });
    if (!response.ok) return [];
    return parseMatches(await response.json());
  } catch {
    return [];
  }
}

function matchesTeam(match: MatchRow, teamId: string, teamName: string) {
  if (match.home.id === teamId || match.away.id === teamId) return true;
  const target = normalize(teamName);
  return normalize(match.home.name) === target || normalize(match.away.name) === target;
}

export async function getTeamOrganizations(teamId: string, teamName: string): Promise<TeamOrganization[]> {
  const mainEntries: Array<TeamOrganization | null> = await Promise.all(
    (Object.keys(COMPETITIONS) as CompetitionKey[]).map(async (key): Promise<TeamOrganization | null> => {
      const snapshot = await getCompetitionSnapshot(key);
      const matches = snapshot.matches.filter((match) => matchesTeam(match, teamId, teamName));
      if (!matches.length) return null;
      const config = COMPETITIONS[key];
      return { key, trName: config.trName, enName: config.enName, emoji: config.emoji, matches, competitionKey: key };
    }),
  );

  const extras: Array<TeamOrganization | null> = await Promise.all(
    EXTRA_ORGANIZATIONS.map(async (config): Promise<TeamOrganization | null> => {
      const matches = (await getMatchesForSlug(config.espnSlug)).filter((match) => matchesTeam(match, teamId, teamName));
      if (!matches.length) return null;
      return { key: config.key, trName: config.trName, enName: config.enName, emoji: config.emoji, matches, competitionKey: null };
    }),
  );

  const organizations: Array<TeamOrganization | null> = [...mainEntries, ...extras];
  return organizations.filter((item): item is TeamOrganization => item !== null);
}

export async function getTeamRoster(competition: CompetitionKey, teamId: string): Promise<TeamPlayer[]> {
  const slug = COMPETITIONS[competition].espnSlug;
  const urls = [
    `${ESPN_BASE}/site/v2/sports/soccer/${slug}/teams/${teamId}/roster`,
    `https://site.web.api.espn.com/apis/common/v3/sports/soccer/${slug}/athletes?team=${teamId}`,
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, { next: { revalidate: 3600 } });
      if (!response.ok) continue;
      const payload = await response.json() as {
        athletes?: Array<any>;
        items?: Array<any>;
      };
      const raw = payload.athletes ?? payload.items ?? [];
      const players = raw.flatMap((entry: any) => {
        const athlete = entry?.athlete ?? entry;
        if (!athlete?.id || !athlete?.displayName) return [];
        return [{
          id: String(athlete.id),
          name: athlete.displayName,
          position: athlete.position?.displayName ?? athlete.position?.name ?? entry?.position?.displayName ?? null,
          jersey: athlete.jersey ? String(athlete.jersey) : entry?.jersey ? String(entry.jersey) : null,
          headshot: athlete.headshot?.href ?? athlete.headshot ?? null,
          nationality: athlete.citizenship ?? athlete.country?.displayName ?? null,
        } satisfies TeamPlayer];
      });
      if (players.length) return players;
    } catch {}
  }
  return [];
}
