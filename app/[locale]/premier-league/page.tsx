import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CompetitionHub from "@/components/football/CompetitionHub";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { SITE_URL, localizedAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const en = locale === "en";
  const canonical = `${SITE_URL}/${locale}/premier-league`;
  const title = en ? "Premier League Standings, Fixtures & Results 2026/27 | FootBattle" : "Premier League Puan Durumu, Fikstür ve Maç Sonuçları | FootBattle";
  const description = en ? "Follow the 2026/27 Premier League standings, fixtures, results, teams, squads and score predictions on FootBattle." : "2026/27 Premier League puan durumu, fikstür, maç sonuçları, takım kadroları ve skor tahminlerini FootBattle'da takip et.";
  return {
    title, description,
    keywords: en ? ["Premier League standings", "Premier League fixtures", "Premier League results", "Premier League teams", "Premier League table"] : ["premier league puan durumu", "premier league fikstür", "premier league maç sonuçları", "premier league maçları", "premier league takımları"],
    alternates: { canonical, languages: localizedAlternates("/premier-league") },
    openGraph: { type: "website", siteName: "FootBattle", title, description, url: canonical },
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <CompetitionHub competition="premier-league" locale={locale as Locale} />;
}
