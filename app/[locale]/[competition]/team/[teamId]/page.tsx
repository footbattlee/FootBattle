import Link from "next/link";
import { notFound } from "next/navigation";

import CompetitionMatchBrowser from "@/components/football/CompetitionMatchBrowser";
import TeamOrganizationSelector from "@/components/football/TeamOrganizationSelector";
import { COMPETITIONS, getCompetitionSnapshot, type CompetitionKey, type MatchRow } from "@/lib/football/competition-hubs";
import { getTeamOrganizations, getTeamRoster } from "@/lib/football/team-hub";
import { isLocale, type Locale } from "@/lib/i18n/config";

function isCompetition(value: string): value is CompetitionKey {
  return value in COMPETITIONS;
}

function uniqueMatches(matches: MatchRow[]) {
  return Array.from(new Map(matches.map((match) => [match.id, match])).values())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export default async function TeamCompetitionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; competition: string; teamId: string }>;
  searchParams: Promise<{ org?: string }>;
}) {
  const { locale, competition, teamId } = await params;
  const { org } = await searchParams;
  if (!isLocale(locale) || !isCompetition(competition)) notFound();

  const snapshot = await getCompetitionSnapshot(competition);
  const standing = snapshot.standings.find((row) => row.teamId === teamId);
  const teamMatch = snapshot.matches.find((match) => match.home.id === teamId || match.away.id === teamId);
  const teamName = standing?.teamName ?? (teamMatch?.home.id === teamId ? teamMatch.home.name : teamMatch?.away.name);
  const teamLogo = standing?.logo ?? (teamMatch?.home.id === teamId ? teamMatch.home.logo : teamMatch?.away.logo) ?? null;
  if (!teamName) notFound();

  const tr = locale === "tr";
  const leagueName = tr ? COMPETITIONS[competition].trName : COMPETITIONS[competition].enName;

  const [organizations, roster] = await Promise.all([
    getTeamOrganizations(teamId, teamName),
    getTeamRoster(competition, teamId),
  ]);

  const requestedOrg = org && organizations.some((item) => item.key === org) ? org : competition;
  const selectedOrg = organizations.find((item) => item.key === requestedOrg) ?? organizations[0];
  const allMatches = uniqueMatches(organizations.flatMap((item) => item.matches));
  const showingAll = org === "all";
  const teamMatches = showingAll ? allMatches : (selectedOrg?.matches ?? snapshot.matches.filter((match) => match.home.id === teamId || match.away.id === teamId));
  const browserCompetition: CompetitionKey = showingAll
    ? "champions-league"
    : selectedOrg?.competitionKey ?? "champions-league";

  const seasonFirstMatchDate = browserCompetition === "champions-league"
    ? null
    : (await getCompetitionSnapshot(browserCompetition)).matches[0]?.date ?? null;

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
        <Link href={`/${locale}/${competition}`} className="inline-flex items-center gap-2 text-xs font-black text-emerald-300">
          ← {tr ? `${leagueName} merkezine dön` : `Back to ${leagueName}`}
        </Link>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-7">
          <div className="flex items-center gap-4">
            {teamLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={teamLogo} alt="" className="h-16 w-16 object-contain sm:h-20 sm:w-20" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-lg font-black">{teamName.slice(0, 2).toUpperCase()}</div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[.18em] text-cyan-300">{leagueName}</p>
              <h1 className="mt-1 truncate text-2xl font-black sm:text-4xl">{teamName}</h1>
              {standing ? (
                <p className="mt-2 text-sm text-slate-400">
                  {tr ? `${standing.position}. sıra · ${standing.played} maç · ${standing.points} puan` : `${standing.position}${standing.position === 1 ? "st" : standing.position === 2 ? "nd" : standing.position === 3 ? "rd" : "th"} · ${standing.played} played · ${standing.points} pts`}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <TeamOrganizationSelector
          tr={tr}
          current={showingAll ? "all" : (selectedOrg?.key ?? competition)}
          options={organizations.map((item) => ({
            key: item.key,
            emoji: item.emoji,
            label: tr ? item.trName : item.enName,
          }))}
        />

        <div className="mt-8">
          <CompetitionMatchBrowser
            competition={browserCompetition}
            locale={locale as Locale}
            matches={teamMatches}
            seasonFirstMatchDateOverride={seasonFirstMatchDate}
            preferCalculatedWeeks={browserCompetition !== "champions-league"}
          />
        </div>

        <section className="mt-10">
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-300">{tr ? "KADRO" : "SQUAD"}</p>
            <h2 className="mt-1 text-2xl font-black">{tr ? "Oyuncular" : "Players"}</h2>
          </div>
          {roster.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {roster.map((player) => (
                <article key={player.id} className="min-w-0 rounded-2xl border border-white/10 bg-white/[.035] p-3">
                  <div className="flex items-center gap-3">
                    {player.headshot ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={player.headshot} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-full bg-white/5 object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black">{player.name.slice(0, 2).toUpperCase()}</div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{player.name}</p>
                      <p className="mt-0.5 truncate text-[10px] text-slate-500">
                        {[player.jersey ? `#${player.jersey}` : null, player.position].filter(Boolean).join(" · ") || (tr ? "Oyuncu" : "Player")}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-white/10 bg-white/[.025] p-5 text-sm text-slate-500">
              {tr ? "Kadro verisi şu anda alınamadı." : "Squad data is currently unavailable."}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
