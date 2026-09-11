import Link from "next/link";

import {
  COMPETITIONS,
  getCompetitionSnapshot,
  type CompetitionKey,
  type MatchRow,
} from "@/lib/football/competition-hubs";
import type { Locale } from "@/lib/i18n/config";

function matchDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-GB", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function TeamLogo({ src, name }: { src: string | null; name: string }) {
  if (!src) return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-black">{name.slice(0, 2).toUpperCase()}</span>;
  // ESPN club crests are remote and vary by league. Plain img avoids coupling this content hub to next/image host allowlists.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" className="h-8 w-8 object-contain" />;
}

function MatchCard({ match, locale }: { match: MatchRow; locale: Locale }) {
  const tr = locale === "tr";
  const live = match.state === "in";
  const finished = match.state === "post";
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <div className="mb-3 flex items-center justify-between gap-3 text-[11px] font-bold text-slate-400">
        <span>{matchDate(match.date, locale)}</span>
        <span className={live ? "text-emerald-300" : finished ? "text-slate-400" : "text-cyan-300"}>
          {live ? (tr ? "CANLI" : "LIVE") : finished ? (tr ? "BİTTİ" : "FT") : (tr ? "YAKLAŞAN" : "UPCOMING")}
        </span>
      </div>
      <div className="space-y-3">
        {[match.home, match.away].map((team) => (
          <div key={`${match.id}-${team.id}`} className="flex items-center gap-3">
            <TeamLogo src={team.logo} name={team.name} />
            <span className="min-w-0 flex-1 truncate text-sm font-black text-white">{team.name}</span>
            {(finished || live) && <span className="text-xl font-black text-white">{team.score ?? "-"}</span>}
          </div>
        ))}
      </div>
    </article>
  );
}

export default async function CompetitionHub({ competition, locale }: { competition: CompetitionKey; locale: Locale }) {
  const tr = locale === "tr";
  const config = COMPETITIONS[competition];
  const snapshot = await getCompetitionSnapshot(competition);
  const name = tr ? config.trName : config.enName;
  const hasData = snapshot.standings.length || snapshot.recentMatches.length || snapshot.upcomingMatches.length;

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        <section className={`overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${config.accent} p-6 sm:p-8`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-emerald-300">{config.emoji} FootBattle {tr ? "Lig Merkezi" : "Competition Hub"}</p>
              <h1 className="mt-3 text-3xl font-black sm:text-5xl">{name}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                {tr
                  ? `${name} puan durumu, son sonuçlar ve yaklaşan maçlar. Maç tahminleri de bir sonraki aşamada bu merkeze bağlanacak.`
                  : `${name} standings, recent results and upcoming fixtures. Match predictions will plug into this hub in the next phase.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/${locale}/guess-the-player`} className="rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-black text-[#07111f] transition hover:bg-emerald-300">
                {tr ? "Guess the Player Oyna" : "Play Guess the Player"}
              </Link>
              <Link href={`/${locale}/games`} className="rounded-xl border border-white/15 bg-white/[.05] px-4 py-2.5 text-xs font-black text-white transition hover:bg-white/10">
                {tr ? "Tüm Oyunlar" : "All Games"}
              </Link>
            </div>
          </div>
        </section>

        {!hasData ? (
          <section className="mt-8 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5 text-sm text-amber-100">
            {tr ? "Canlı lig verisi şu anda alınamadı. Sayfayı biraz sonra yenileyebilirsin." : "Live competition data is temporarily unavailable. Please refresh again shortly."}
          </section>
        ) : null}

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.1fr_.9fr]">
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.025]">
            <div className="border-b border-white/10 p-5">
              <h2 className="text-xl font-black">{tr ? "Puan Durumu" : "Standings"}</h2>
              <p className="mt-1 text-xs text-slate-500">{tr ? "2026/27 sezonu güncel tablo" : "Current 2026/27 season table"}</p>
            </div>
            {snapshot.standings.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[660px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-slate-500">
                    <tr><th className="p-4">#</th><th>{tr ? "Takım" : "Team"}</th><th>O</th><th>G</th><th>B</th><th>M</th><th>AV</th><th className="pr-4 text-right">P</th></tr>
                  </thead>
                  <tbody>
                    {snapshot.standings.map((row) => (
                      <tr key={`${row.position}-${row.teamId}`} className="border-t border-white/5">
                        <td className="p-4 font-black text-slate-400">{row.position}</td>
                        <td><div className="flex items-center gap-3"><TeamLogo src={row.logo} name={row.teamName} /><span className="font-black">{row.teamName}</span></div></td>
                        <td>{row.played}</td><td>{row.won}</td><td>{row.drawn}</td><td>{row.lost}</td><td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td><td className="pr-4 text-right text-base font-black">{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="p-5 text-sm text-slate-500">{tr ? "Puan durumu verisi henüz hazır değil." : "Standings data is not available yet."}</p>}
          </section>

          <div className="space-y-8">
            <section>
              <div className="mb-4 flex items-end justify-between gap-4"><div><h2 className="text-xl font-black">{tr ? "Yaklaşan Maçlar" : "Upcoming Fixtures"}</h2><p className="mt-1 text-xs text-slate-500">{tr ? "Türkiye saatiyle" : "Times shown in Türkiye time"}</p></div></div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {snapshot.upcomingMatches.length ? snapshot.upcomingMatches.slice(0, 6).map((match) => <MatchCard key={match.id} match={match} locale={locale} />) : <p className="rounded-2xl border border-white/10 p-5 text-sm text-slate-500">{tr ? "Yaklaşan maç bulunamadı." : "No upcoming fixtures found."}</p>}
              </div>
            </section>
            <section>
              <h2 className="mb-4 text-xl font-black">{tr ? "Son Sonuçlar" : "Recent Results"}</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {snapshot.recentMatches.length ? snapshot.recentMatches.slice(0, 6).map((match) => <MatchCard key={match.id} match={match} locale={locale} />) : <p className="rounded-2xl border border-white/10 p-5 text-sm text-slate-500">{tr ? "Sonuç bulunamadı." : "No recent results found."}</p>}
              </div>
            </section>
          </div>
        </div>

        <section className="mt-10 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[.2em] text-emerald-300">{tr ? "SIRADAKİ ADIM" : "NEXT PHASE"}</p>
          <h2 className="mt-2 text-2xl font-black">{tr ? "Maç Tahminleri" : "Match Predictions"}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{tr ? "Bu fikstür altyapısının üstüne skor ve maç sonucu tahmini ekleyeceğiz. Doğru sonuç ve doğru skor XP kazandıracak; haftalık tahmin sıralaması da aynı sistemden beslenecek." : "We will add score and result predictions on top of this fixture layer. Correct picks will earn XP and feed a weekly prediction leaderboard."}</p>
        </section>
      </div>
    </main>
  );
}
