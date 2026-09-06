import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LocalizedWordlePage from "@/components/i18n/LocalizedWordlePage";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { GameJsonLd, SITE_URL, localizedAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const isTr = locale === "tr";
  return {
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
  const isTr = locale === "tr";
  const description = isTr
    ? "Gizli futbolcunun soyadını Wordle ipuçlarıyla bul."
    : "Guess the hidden footballer's surname with Wordle-style letter clues.";

  return (
    <div data-game="wordle">
      <GameJsonLd
        name={isTr ? "Futbolcu Wordle" : "Footballer Wordle"}
        description={description}
        path={`/${locale}/wordle`}
        inLanguage={isTr ? "tr-TR" : "en-US"}
      />
      <LocalizedWordlePage locale={locale as Locale} />
    </div>
  );
}
