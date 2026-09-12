import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CompetitionHub from "@/components/football/CompetitionHub";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { SITE_URL, localizedAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const en = locale === "en";
  return {
    title: en ? "Turkish Süper Lig Standings & Fixtures | FootBattle" : "Süper Lig Puan Durumu ve Fikstür | FootBattle",
    description: en ? "Follow Turkish Süper Lig standings, recent results and upcoming fixtures on FootBattle." : "Süper Lig puan durumu, son sonuçlar ve yaklaşan maçları FootBattle'da takip et.",
    alternates: { canonical: `${SITE_URL}/${locale}/super-lig`, languages: localizedAlternates("/super-lig") },
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <CompetitionHub competition="super-lig" locale={locale as Locale} />;
}
