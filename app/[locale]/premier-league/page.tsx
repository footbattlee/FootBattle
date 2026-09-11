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
    title: en ? "Premier League Standings & Fixtures | FootBattle" : "Premier League Puan Durumu ve Fikstür | FootBattle",
    description: en ? "Follow Premier League standings, recent results and upcoming fixtures on FootBattle." : "Premier League puan durumu, son sonuçlar ve yaklaşan maçları FootBattle'da takip et.",
    alternates: { canonical: `${SITE_URL}/${locale}/premier-league`, languages: localizedAlternates("/premier-league") },
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <CompetitionHub competition="premier-league" locale={locale as Locale} />;
}
