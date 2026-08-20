import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LocalizedRankPage from "@/components/i18n/LocalizedRankPage";
import MobileRankPage from "@/components/mobile/MobileRankPage";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/seo";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const en = locale === "en";
  return {
    title: en ? "Rank Arena | FootBattle" : "Rank Arenası | FootBattle",
    description: en ? "Climb the FootBattle seasonal LP leaderboard from Bronze to GOAT." : "Bronzdan GOAT'a çık, sezonluk LP sıralamasında yüksel.",
    alternates: {
      canonical: `${SITE_URL}/${locale}/rank`,
      languages: { tr: `${SITE_URL}/tr/rank`, en: `${SITE_URL}/en/rank`, "x-default": `${SITE_URL}/tr/rank` },
    },
  };
}

export default async function RankLocalePage({ params }: { params: Params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  return <>
    <div className="md:hidden"><MobileRankPage locale={typedLocale} /></div>
    <div className="hidden md:block"><LocalizedRankPage locale={typedLocale} /></div>
  </>;
}
