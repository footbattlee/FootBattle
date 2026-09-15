import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CompetitionHub from "@/components/football/CompetitionHub";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { SITE_URL, localizedAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const en = locale === "en";
  const canonical = `${SITE_URL}/${locale}/champions-league`;
  const title = en ? "Champions League Standings, Fixtures & Results 2026/27 | FootBattle" : "Şampiyonlar Ligi Puan Durumu, Fikstür ve Maç Sonuçları | FootBattle";
  const description = en ? "Follow the 2026/27 UEFA Champions League standings, fixtures, results, teams and score predictions on FootBattle." : "2026/27 UEFA Şampiyonlar Ligi puan durumu, fikstür, maç sonuçları, takımlar ve skor tahminlerini FootBattle'da takip et.";
  return {
    title, description,
    keywords: en ? ["Champions League standings", "Champions League fixtures", "Champions League results", "UCL fixtures", "UCL standings"] : ["şampiyonlar ligi puan durumu", "şampiyonlar ligi fikstür", "şampiyonlar ligi maç sonuçları", "şampiyonlar ligi maçları", "ucl fikstür"],
    alternates: { canonical, languages: localizedAlternates("/champions-league") },
    openGraph: { type: "website", siteName: "FootBattle", title, description, url: canonical },
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <CompetitionHub competition="champions-league" locale={locale as Locale} />;
}
