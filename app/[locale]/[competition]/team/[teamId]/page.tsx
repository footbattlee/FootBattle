import Link from "next/link";
import { notFound } from "next/navigation";

import CompetitionMatchBrowser from "@/components/football/CompetitionMatchBrowser";
import { COMPETITIONS, getCompetitionSnapshot, type CompetitionKey } from "@/lib/football/competition-hubs";
import { isLocale, type Locale } from "@/lib/i18n/config";

function isCompetition(value: string): value is CompetitionKey {
  return value in COMPETITIONS;
}

export default async function TeamCompetitionPage({
  params,
}: {
  params: Promise<{ locale: string; competition: string; teamId: string }>;
}) {
  const { locale, competition, teamId } = await params;
  if (!isLocale(locale) || !isCompetition(competition)) notFound();

  const snapshot = await getCompetitionSnapshot(competition);
  const standing = snapshot.standings.find((row) => row.teamId === teamId);
  const teamMatch = snapshot.matches.find((match) => match.home.id === teamId || match.away.id === teamId);
  const teamName = standing?.teamName ?? (teamMatch?.home.id === teamId ? teamMatch.home.name : teamMatch?.away.name);
  const teamLogo = standing?.logo ?? (teamMatch?.home.id === teamId ? teamMatch.home.logo : teamMatch?.away.logo) ?? null;
  if (!teamName) notFound();

  const tr = locale === "tr";
  const leagueName = tr ? COMPETITIONS[competition].trName : COMPETITIONS[competition].enName;
  const teamMatches = snapshot.matches.filter((match) => match.home.id === teamId || match.away.id === teamId);
  const seasonFirstMatchDate = competition === "champions-league"
    ? null
    : snapshot.matches[0]?.date ?? null;

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

        <div className="mt-8">
          <CompetitionMatchBrowser
            competition={competition}
            locale={locale as Locale}
            matches={teamMatches}
            seasonFirstMatchDateOverride={seasonFirstMatchDate}
          />
        </div>
      </div>
    </main>
  );
}
