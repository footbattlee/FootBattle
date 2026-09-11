import Link from "next/link";

import type { Locale } from "@/lib/i18n/config";

const ITEMS = [
  { slug: "super-lig", emoji: "🇹🇷", tr: "Süper Lig", en: "Turkish Süper Lig" },
  { slug: "premier-league", emoji: "🏴", tr: "Premier League", en: "Premier League" },
  { slug: "champions-league", emoji: "⭐", tr: "Şampiyonlar Ligi", en: "Champions League" },
] as const;

export default function CompetitionLinks({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  return (
    <section className="bg-[#07111f] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-black uppercase tracking-[.22em] text-cyan-300">{tr ? "LİGLER & TURNUVALAR" : "LEAGUES & TOURNAMENTS"}</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black sm:text-3xl">{tr ? "Fikstürü ve puan durumunu takip et" : "Follow fixtures and standings"}</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">{tr ? "İlk etapta Süper Lig, Premier League ve Şampiyonlar Ligi. Sonraki adımda maç tahminlerini aynı sayfalara bağlayacağız." : "Starting with the Süper Lig, Premier League and Champions League. Match predictions will plug into the same pages next."}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {ITEMS.map((item) => (
            <Link key={item.slug} href={`/${locale}/${item.slug}`} className="group rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-white/[.06]">
              <div className="text-2xl">{item.emoji}</div>
              <h3 className="mt-3 text-lg font-black">{tr ? item.tr : item.en}</h3>
              <p className="mt-2 text-xs text-slate-500">{tr ? "Puan durumu · Fikstür · Sonuçlar" : "Standings · Fixtures · Results"}</p>
              <p className="mt-4 text-xs font-black text-cyan-300">{tr ? "Merkeze git →" : "Open hub →"}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
