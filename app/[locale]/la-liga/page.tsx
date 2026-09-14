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
    title: en ? "La Liga Standings & Fixtures | FootBattle" : "La Liga Puan Durumu ve Fikstür | FootBattle",
    description: en ? "Follow La Liga standings, results and fixtures on FootBattle." : "La Liga puan durumu, sonuçları ve fikstürünü FootBattle'da takip et.",
    alternates: { canonical: `${SITE_URL}/${locale}/la-liga`, languages: localizedAlternates("/la-liga") },
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <CompetitionHub competition="la-liga" locale={locale as Locale} />;
}
