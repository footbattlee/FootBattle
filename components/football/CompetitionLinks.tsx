import Link from "next/link";

import type { Locale } from "@/lib/i18n/config";

const ITEMS = [
  { slug: "super-lig", emoji: "🇹🇷", tr: "Süper Lig", en: "Turkish Süper Lig" },
  { slug: "premier-league", emoji: "🏴", tr: "Premier League", en: "Premier League" },
  { slug: "la-liga", emoji: "🇪🇸", tr: "La Liga", en: "La Liga" },
  { slug: "serie-a", emoji: "🇮🇹", tr: "Serie A", en: "Serie A" },
  { slug: "bundesliga", emoji: "🇩🇪", tr: "Bundesliga", en: "Bundesliga" },
  { slug: "ligue-1", emoji: "🇫🇷", tr: "Ligue 1", en: "Ligue 1" },
  { slug: "primeira-liga", emoji: "🇵🇹", tr: "Primeira Liga", en: "Primeira Liga" },
  { slug: "champions-league", emoji: "⭐", tr: "Şampiyonlar Ligi", en: "Champions League" },
  { slug: "europa-league", emoji: "🟠", tr: "Avrupa Ligi", en: "Europa League" },
  { slug: "conference-league", emoji: "🟢", tr: "Konferans Ligi", en: "Conference League" },
] as const;

export default function CompetitionLinks({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  return (
    <section className="bg-[#07111f] px-4 py-6 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="hidden sm:block">
          <p className="text-xs font-black uppercase tracking-[.22em] text-cyan-300">{tr ? "LİGLER & TURNUVALAR" : "LEAGUES & TOURNAMENTS"}</p>
          <h2 className="mt-3 text-2xl font-black sm:text-3xl">{tr ? "Fikstürü ve puan durumunu takip et" : "Follow fixtures and standings"}</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">{tr ? "Süper Lig, Avrupa'nın öne çıkan ligleri ve UEFA turnuvalarında puan durumu, fikstür ve sonuçları takip et." : "Follow standings, fixtures and results across the Süper Lig, Europe's major leagues and UEFA competitions."}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:mt-5 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <Link key={item.slug} href={`/${locale}/${item.slug}`} className="group min-h-[146px] rounded-2xl border border-white/10 bg-[#101a29] p-4 transition active:scale-[.98] sm:min-h-0 sm:p-5 sm:hover:-translate-y-0.5 sm:hover:border-cyan-300/30 sm:hover:bg-white/[.06]">
              <div className="flex items-start justify-between gap-2"><span className="text-2xl">{item.emoji}</span><span className="text-lg font-black text-emerald-300">→</span></div>
              <h3 className="mt-5 text-base font-black leading-tight sm:mt-3 sm:text-lg">{tr ? item.tr : item.en}</h3>
              <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-slate-500 sm:text-xs">{tr ? "Puan durumu · Fikstür · Sonuçlar" : "Standings · Fixtures · Results"}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
