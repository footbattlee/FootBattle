import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LocalizedWordlePage from "@/components/i18n/LocalizedWordlePage";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const isTr = locale === "tr";
  return {
    title: isTr ? "Futbolcu Wordle | FootBattle" : "Footballer Wordle | FootBattle",
    description: isTr ? "Gizli futbolcunun soyadını Wordle ipuçlarıyla bul." : "Guess the hidden footballer's surname with Wordle-style letter clues.",
    alternates: {
      canonical: `${SITE_URL}/${locale}/wordle`,
      languages: { "tr-TR": `${SITE_URL}/tr/wordle`, "en-US": `${SITE_URL}/en/wordle` },
    },
  };
}

export default async function WordleLocalePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <LocalizedWordlePage locale={locale as Locale} />;
}
