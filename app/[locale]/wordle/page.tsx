import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LocalizedWordlePage from "@/components/i18n/LocalizedWordlePage";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { NO_INDEX_METADATA, SITE_URL, localizedAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const isTr = locale === "tr";
  return {
    ...NO_INDEX_METADATA,
    title: isTr ? "Futbolcu Wordle | FootBattle" : "Footballer Wordle | FootBattle",
    description: isTr ? "Gizli futbolcunun soyadını Wordle ipuçlarıyla bul." : "Guess the hidden footballer's surname with Wordle-style letter clues.",
    alternates: {
      canonical: `${SITE_URL}/${locale}/wordle`,
      languages: localizedAlternates("/wordle"),
    },
  };
}

export default async function WordleLocalePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <div data-game="wordle"><LocalizedWordlePage locale={locale as Locale} /></div>;
}
