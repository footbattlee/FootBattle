import Link from "next/link";

import CompetitionMatchBrowser from "@/components/football/CompetitionMatchBrowser";
import CompetitionSeoContent from "@/components/football/CompetitionSeoContent";
import { COMPETITIONS, getCompetitionSnapshot, type CompetitionKey } from "@/lib/football/competition-hubs";
import type { Locale } from "@/lib/i18n/config";

function TeamLogo({ src, name }: { src: string | null; name: string }) {
  if (!src) return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black">{name.slice(0, 2).toUpperCase()}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" className="h-8 w-8 shrink-0 object-contain" />;
}

function GameSuggestions({ locale, competition }: { locale: Locale; competition: CompetitionKey }) {
  const tr = locale === "tr";
  const primaryHref = competition === "super-lig" ? `/${locale}/guess-the-player/super-lig` : `/${locale}/guess-the-player`;
  const primaryTitle = competition === "super-lig" ? (tr ? "Süper Lig Futbolcuyu Tahmin Et" : "Süper Lig Guess the Player") : "Guess the Player";

  return (
    <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[.08] p-5">
      <p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300">{tr ? "FOOTBATTLE ÖNERİSİ" : "FOOTBATTLE PICK"}</p>
      <h2 className="mt-2 text-lg font-black">{tr ? "Tabloya baktın, şimdi bilgini test et" : "Checked the table? Now test your football knowledge"}</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Link href={primaryHref} className="rounded-xl bg-emerald-400 px-4 py-3 text-center text-xs font-black text-[#07111f] transition hover:bg-emerald-300">⚽ {primaryTitle}</Link>
        <Link href={`/${locale}/games`} className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-center text-xs font-black text-white transition hover:bg-white/[.08]">🎮 {tr ? "Tüm Oyunları Gör" : "See All Games"}</Link>
      </div>
    </section>
  );
}

export default async function CompetitionHub({ competition, locale }: { competition: CompetitionKey; locale: Locale }) {
  const tr = locale === "tr";
  const config = COMPETITIONS[competition];
  const snapshot = await getCompetitionSnapshot(competition);
  const name = tr ? config.trName : config.enName;
  const hasData = snapshot.standings.length || snapshot.matches.length;

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        <section className={`overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${config.accent} p-6 sm:p-8`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-emerald-300">{config.emoji} FootBattle {tr ? "Lig Merkezi" : "Competition Hub"}</p>
              <h1 className="mt-3 text-3xl font-black sm:text-5xl">{name}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                {tr ? `${name} puan durumu, hafta hafta fikstür, sonuçlar ve skor tahminleri. Bir takıma dokunarak sadece o takımın maçlarını da görebilirsin.` : `${name} standings, matchweek fixtures, results and score predictions. Tap any team to view only that club's matches.`}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={`/${locale}/predictions`} className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-2.5 text-xs font-black text-emerald-200">🎯 {tr ? "Tahminlerim" : "My Predictions"}</Link>
                <span className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-2.5 text-xs font-bold text-slate-300">{tr ? "Doğru sonuç +20 XP · Tam skor +100 XP" : "Correct result +20 XP · Exact score +100 XP"}</span>
              </div>
            </div>
            <div className="hidden flex-wrap gap-2 lg:flex">
              <Link href={`/${locale}/guess-the-player`} className="rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-black text-[#07111f] transition hover:bg-emerald-300">{tr ? "Guess the Player Oyna" : "Play Guess the Player"}</Link>
              <Link href={`/${locale}/games`} className="rounded-xl border border-white/15 bg-white/[.05] px-4 py-2.5 text-xs font-black text-white transition hover:bg-white/10">{tr ? "Tüm Oyunlar" : "All Games"}</Link>
            </div>
          </div>
        </section>

        {!hasData ? (
          <section className="mt-8 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5 text-sm text-amber-100">
            {tr ? "Canlı lig verisi şu anda alınamadı. Sayfayı biraz sonra yenileyebilirsin." : "Live competition data is temporarily unavailable. Please refresh again shortly."}
          </section>
        ) : null}

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.1fr_.9fr]">
          <div className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.025]">
              <div className="border-b border-white/10 p-5">
                <h2 className="text-xl font-black">{tr ? "Puan Durumu" : "Standings"}</h2>
                <p className="mt-1 text-xs text-slate-500">{tr ? "2026/27 sezonu güncel tablo · Takıma dokun" : "Current 2026/27 table · Tap a team"}</p>
              </div>
              {snapshot.standings.length ? (
                <>
                  <div className="sm:hidden">
                    <div className="grid grid-cols-[30px_minmax(0,1fr)_36px_38px] items-center gap-2 border-b border-white/10 px-3 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500"><span>#</span><span>{tr ? "Takım" : "Team"}</span><span className="text-center">O</span><span className="text-right">P</span></div>
                    {snapshot.standings.map((row) => (
                      <Link key={`${row.position}-${row.teamId}-mobile`} href={`/${locale}/${competition}/team/${row.teamId}`} className="grid grid-cols-[30px_minmax(0,1fr)_36px_38px] items-center gap-2 border-b border-white/5 px-3 py-3.5 transition active:bg-white/[.06]">
                        <span className="font-black text-slate-400">{row.position}</span>
                        <span className="flex min-w-0 items-center gap-2.5"><TeamLogo src={row.logo} name={row.teamName} /><span className="min-w-0 truncate text-sm font-black text-white">{row.teamName}</span></span>
                        <span className="text-center text-sm text-slate-300">{row.played}</span>
                        <span className="text-right text-base font-black text-white">{row.points}</span>
                      </Link>
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto sm:block">
                    <table className="w-full min-w-[660px] text-left text-sm">
                      <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-4">#</th><th>{tr ? "Takım" : "Team"}</th><th>O</th><th>G</th><th>B</th><th>M</th><th>AV</th><th className="pr-4 text-right">P</th></tr></thead>
                      <tbody>
                        {snapshot.standings.map((row) => (
                          <tr key={`${row.position}-${row.teamId}`} className="border-t border-white/5">
                            <td className="p-4 font-black text-slate-400">{row.position}</td>
                            <td><Link href={`/${locale}/${competition}/team/${row.teamId}`} className="flex items-center gap-3 font-black hover:text-emerald-300"><TeamLogo src={row.logo} name={row.teamName} /><span>{row.teamName}</span></Link></td>
                            <td>{row.played}</td><td>{row.won}</td><td>{row.drawn}</td><td>{row.lost}</td><td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td><td className="pr-4 text-right text-base font-black">{row.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : <p className="p-5 text-sm text-slate-500">{tr ? "Puan durumu verisi henüz hazır değil." : "Standings data is not available yet."}</p>}
            </section>
            <GameSuggestions locale={locale} competition={competition} />
          </div>

          <CompetitionMatchBrowser competition={competition} locale={locale} matches={snapshot.matches} />
        </div>

        <CompetitionSeoContent competition={competition} locale={locale} snapshot={snapshot} />
      </div>
    </main>
  );
}
