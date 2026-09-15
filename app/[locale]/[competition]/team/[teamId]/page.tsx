import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import CompetitionMatchBrowser from "@/components/football/CompetitionMatchBrowser";
import TeamOrganizationSelector from "@/components/football/TeamOrganizationSelector";
import { COMPETITIONS, getCompetitionSnapshot, type CompetitionKey, type MatchRow } from "@/lib/football/competition-hubs";
import { getTeamOrganizations, getTeamRoster } from "@/lib/football/team-hub";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { BreadcrumbJsonLd, JsonLd, localizedAlternates, SITE_URL } from "@/lib/seo";

function isCompetition(value: string): value is CompetitionKey { return value in COMPETITIONS; }
function isUefaCompetition(value: CompetitionKey) { return value === "champions-league" || value === "europa-league" || value === "conference-league"; }
function uniqueMatches(matches: MatchRow[]) { return Array.from(new Map(matches.map((match) => [match.id, match])).values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); }

async function getTeamIdentity(competition: CompetitionKey, teamId: string) {
  const snapshot = await getCompetitionSnapshot(competition);
  const standing = snapshot.standings.find((row) => row.teamId === teamId);
  const teamMatch = snapshot.matches.find((match) => match.home.id === teamId || match.away.id === teamId);
  const teamName = standing?.teamName ?? (teamMatch?.home.id === teamId ? teamMatch.home.name : teamMatch?.away.name);
  const teamLogo = standing?.logo ?? (teamMatch?.home.id === teamId ? teamMatch.home.logo : teamMatch?.away.logo) ?? null;
  return { snapshot, standing, teamName, teamLogo };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; competition: string; teamId: string }> }): Promise<Metadata> {
  const { locale, competition, teamId } = await params;
  if (!isLocale(locale) || !isCompetition(competition)) return {};
  const { teamName, teamLogo } = await getTeamIdentity(competition, teamId);
  if (!teamName) return {};
  const tr = locale === "tr";
  const competitionName = tr ? COMPETITIONS[competition].trName : COMPETITIONS[competition].enName;
  const title = tr ? `${teamName} Fikstür, Kadro ve Maç Sonuçları 2026/27 | FootBattle` : `${teamName} Fixtures, Squad & Results 2026/27 | FootBattle`;
  const description = tr ? `${teamName} 2026/27 fikstürü, son maç sonuçları, ${competitionName} puan durumu, güncel oyuncu kadrosu ve yaklaşan maçları FootBattle'da.` : `${teamName} 2026/27 fixtures, recent results, ${competitionName} position, current squad and upcoming matches on FootBattle.`;
  const canonical = `${SITE_URL}/${locale}/${competition}/team/${teamId}`;
  return {
    title: { absolute: title }, description,
    keywords: tr ? [`${teamName} fikstür`, `${teamName} maçları`, `${teamName} maç sonuçları`, `${teamName} kadro`, `${teamName} puan durumu`] : [`${teamName} fixtures`, `${teamName} results`, `${teamName} squad`, `${teamName} matches`],
    alternates: { canonical, languages: localizedAlternates(`/${competition}/team/${teamId}`) },
    openGraph: { type: "website", siteName: "FootBattle", title, description, url: canonical, ...(teamLogo ? { images: [{ url: teamLogo, alt: teamName }] } : {}) },
    twitter: { card: "summary_large_image", title, description, ...(teamLogo ? { images: [teamLogo] } : {}) },
  };
}

export default async function TeamCompetitionPage({ params, searchParams }: { params: Promise<{ locale: string; competition: string; teamId: string }>; searchParams: Promise<{ org?: string }> }) {
  const { locale, competition, teamId } = await params;
  const { org } = await searchParams;
  if (!isLocale(locale) || !isCompetition(competition)) notFound();
  const { snapshot, standing, teamName, teamLogo } = await getTeamIdentity(competition, teamId);
  if (!teamName) notFound();
  const tr = locale === "tr";
  const leagueName = tr ? COMPETITIONS[competition].trName : COMPETITIONS[competition].enName;
  const [organizations, roster] = await Promise.all([getTeamOrganizations(teamId, teamName), getTeamRoster(competition, teamId)]);
  const requestedOrg = org && organizations.some((item) => item.key === org) ? org : competition;
  const selectedOrg = organizations.find((item) => item.key === requestedOrg) ?? organizations[0];
  const allMatches = uniqueMatches(organizations.flatMap((item) => item.matches));
  const showingAll = org === "all";
  const teamMatches = showingAll ? allMatches : (selectedOrg?.matches ?? snapshot.matches.filter((match) => match.home.id === teamId || match.away.id === teamId));
  const browserCompetition: CompetitionKey = showingAll ? "champions-league" : selectedOrg?.competitionKey ?? "champions-league";
  const predictionsEnabled = !showingAll && selectedOrg?.competitionKey != null;
  const seasonFirstMatchDate = isUefaCompetition(browserCompetition) ? null : (await getCompetitionSnapshot(browserCompetition)).matches[0]?.date ?? null;
  const teamUrl = `${SITE_URL}/${locale}/${competition}/team/${teamId}`;
  const teamSchema = { "@context": "https://schema.org", "@type": "SportsTeam", "@id": `${teamUrl}#team`, name: teamName, sport: "Football", url: teamUrl, ...(teamLogo ? { logo: teamLogo, image: teamLogo } : {}), memberOf: { "@type": "SportsOrganization", name: leagueName, url: `${SITE_URL}/${locale}/${competition}` }, athlete: roster.slice(0, 40).map((player) => ({ "@type": "Person", name: player.name, ...(player.headshot ? { image: player.headshot } : {}), ...(player.position ? { jobTitle: player.position } : {}) })) };

  return <main className="min-h-screen bg-[#07111f] text-white">
    <JsonLd data={teamSchema} />
    <BreadcrumbJsonLd items={[{ name: "FootBattle", path: `/${locale}` }, { name: tr ? "Ligler ve Turnuvalar" : "Leagues and Tournaments", path: `/${locale}/competitions` }, { name: leagueName, path: `/${locale}/${competition}` }, { name: teamName }]} />
    <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
      <Link href={`/${locale}/${competition}`} className="inline-flex items-center gap-2 text-xs font-black text-emerald-300">← {tr ? `${leagueName} merkezine dön` : `Back to ${leagueName}`}</Link>
      <section className="mt-5 rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-7">
        <div className="flex items-center gap-4">{teamLogo ? <img src={teamLogo} alt={`${teamName} logo`} className="h-16 w-16 object-contain sm:h-20 sm:w-20" /> : <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-lg font-black">{teamName.slice(0, 2).toUpperCase()}</div>}<div className="min-w-0"><p className="text-[11px] font-black uppercase tracking-[.18em] text-cyan-300">{leagueName}</p><h1 className="mt-1 text-2xl font-black sm:text-4xl">{tr ? `${teamName} Fikstür, Kadro ve Maç Sonuçları` : `${teamName} Fixtures, Squad & Results`}</h1>{standing ? <p className="mt-2 text-sm text-slate-400">{tr ? `${standing.position}. sıra · ${standing.played} maç · ${standing.points} puan` : `${standing.position}. place · ${standing.played} played · ${standing.points} pts`}</p> : null}</div></div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">{tr ? `${teamName} 2026/27 fikstürünü, son maç sonuçlarını, organizasyon bazlı karşılaşmalarını ve güncel oyuncu kadrosunu takip et. Yaklaşan desteklenen maçlarda skor tahminini maç başlamadan kaydedebilirsin.` : `Follow ${teamName}'s 2026/27 fixtures, recent results, matches by competition and current squad. You can submit score predictions for supported upcoming matches before kickoff.`}</p>
      </section>
      <TeamOrganizationSelector tr={tr} current={showingAll ? "all" : (selectedOrg?.key ?? competition)} options={organizations.map((item) => ({ key: item.key, emoji: item.emoji, label: tr ? item.trName : item.enName }))} />
      <div className="mt-8"><CompetitionMatchBrowser competition={browserCompetition} locale={locale as Locale} matches={teamMatches} seasonFirstMatchDateOverride={seasonFirstMatchDate} preferCalculatedWeeks={!isUefaCompetition(browserCompetition)} predictionsEnabled={predictionsEnabled} /></div>
      <section className="mt-10"><div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-300">{tr ? "2026/27 KADRO" : "2026/27 SQUAD"}</p><h2 className="mt-1 text-2xl font-black">{tr ? `${teamName} Güncel Oyuncu Kadrosu` : `${teamName} Current Squad`}</h2></div>{roster.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{roster.map((player) => <article key={player.id} className="min-w-0 rounded-2xl border border-white/10 bg-white/[.035] p-3"><div className="flex items-center gap-3">{player.headshot ? <img src={player.headshot} alt={`${player.name} football player`} loading="lazy" className="h-11 w-11 shrink-0 rounded-full bg-white/5 object-cover" /> : <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black">{player.name.slice(0, 2).toUpperCase()}</div>}<div className="min-w-0"><p className="truncate text-sm font-black text-white">{player.name}</p><p className="mt-0.5 truncate text-[10px] text-slate-500">{[player.jersey ? `#${player.jersey}` : null, player.position].filter(Boolean).join(" · ") || (tr ? "Oyuncu" : "Player")}</p></div></div></article>)}</div> : <p className="rounded-2xl border border-white/10 bg-white/[.025] p-5 text-sm text-slate-500">{tr ? "Kadro verisi şu anda alınamadı." : "Squad data is currently unavailable."}</p>}</section>
      <section className="mt-10 rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6"><h2 className="text-lg font-black">{tr ? `${teamName} ve ${leagueName}` : `${teamName} and ${leagueName}`}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{tr ? `${teamName} maçlarını takip ettikten sonra ${leagueName} puan durumu ve tüm lig fikstürüne dönebilir, FootBattle futbol oyunlarında bilgini test edebilirsin.` : `After following ${teamName}, return to the ${leagueName} standings and full fixture list or test your football knowledge in FootBattle games.`}</p><div className="mt-4 flex flex-wrap gap-2"><Link href={`/${locale}/${competition}`} className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-2.5 text-xs font-black hover:text-emerald-300">{tr ? `${leagueName} Puan Durumu ve Fikstür` : `${leagueName} Standings & Fixtures`}</Link>{competition === "super-lig" ? <Link href={`/${locale}/guess-the-player/super-lig`} className="rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-black text-[#07111f] hover:bg-emerald-300">{tr ? "Süper Lig Futbolcu Tahmin Oyunu" : "Süper Lig Guess the Player"}</Link> : null}</div></section>
    </div>
  </main>;
}
