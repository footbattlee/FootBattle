import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CompetitionLinks from "@/components/football/CompetitionLinks";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { SITE_URL, localizedAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const en = locale === "en";
  return {
    title: en ? "Football Leagues & Tournaments | FootBattle" : "Futbol Ligleri ve Turnuvalar | FootBattle",
    description: en
      ? "Choose a league or tournament to view standings, fixtures and results on FootBattle."
      : "Lig veya turnuva seç; puan durumu, fikstür ve sonuçları FootBattle'da görüntüle.",
    alternates: {
      canonical: `${SITE_URL}/${locale}/competitions`,
      languages: localizedAlternates("/competitions"),
    },
  };
}

export default async function CompetitionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const tr = locale === "tr";

  return (
    <main className="min-h-screen bg-[#07111f] pb-4 text-white">
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <p className="text-xs font-black uppercase tracking-[.22em] text-green-300">
          {tr ? "FOOTBATTLE FUTBOL MERKEZİ" : "FOOTBATTLE FOOTBALL HUB"}
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          {tr ? "Ligler & Turnuvalar" : "Leagues & Tournaments"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          {tr
            ? "Takip etmek istediğin ligi veya turnuvayı seç. Puan durumu, haftalık fikstür ve sonuçlara tek yerden ulaş."
            : "Choose a league or tournament to view standings, matchweek fixtures and results in one place."}
        </p>
      </div>
      <CompetitionLinks locale={locale as Locale} />
    </main>
  );
}
