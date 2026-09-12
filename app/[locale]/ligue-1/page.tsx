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
    title: en ? "Ligue 1 Standings & Fixtures | FootBattle" : "Ligue 1 Puan Durumu ve Fikstür | FootBattle",
    description: en ? "Follow Ligue 1 standings, results and fixtures on FootBattle." : "Ligue 1 puan durumu, sonuçları ve fikstürünü FootBattle'da takip et.",
    alternates: { canonical: `${SITE_URL}/${locale}/ligue-1`, languages: localizedAlternates("/ligue-1") },
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <CompetitionHub competition="ligue-1" locale={locale as Locale} />;
}
