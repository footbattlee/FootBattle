import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CompetitionHub from "@/components/football/CompetitionHub";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { SITE_URL, localizedAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const en = locale === "en";
  return { title: en ? "Conference League Standings & Fixtures | FootBattle" : "Konferans Ligi Puan Durumu ve Fikstür | FootBattle", description: en ? "Follow UEFA Conference League standings, results and fixtures on FootBattle." : "UEFA Konferans Ligi puan durumu, sonuçlar ve fikstürü FootBattle'da takip et.", alternates: { canonical: `${SITE_URL}/${locale}/conference-league`, languages: localizedAlternates("/conference-league") } };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <CompetitionHub competition="conference-league" locale={locale as Locale} />;
}
