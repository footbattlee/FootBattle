import type { Metadata } from "next";
import { notFound } from "next/navigation";

import LocalizedGuessThePlayer from "@/components/i18n/LocalizedGuessThePlayer";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { SITE_URL, localizedAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const en = locale === "en";
  return {
    title: en ? "Guess the Player | FootBattle" : "Futbolcuyu Tahmin Et | FootBattle",
    description: en ? "Guess the hidden footballer using country, club, league, position, age and foot clues." : "Ülke, takım, lig, pozisyon, yaş ve ayak ipuçlarıyla gizli futbolcuyu tahmin et.",
    alternates: {
      canonical: `${SITE_URL}/${locale}/guess-the-player`,
      languages: localizedAlternates("/guess-the-player"),
    },
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <LocalizedGuessThePlayer locale={locale as Locale} />;
}
