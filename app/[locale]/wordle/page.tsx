import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GeoAnswerSection from "@/components/GeoAnswerSection";
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
      {!isTr ? (
        <GeoAnswerSection
          title="What is Footballer Wordle?"
          summary="Footballer Wordle is a free football word puzzle on FootBattle. The goal is to identify a hidden footballer's surname by using Wordle-style letter feedback and progressively refining each attempt."
          howItWorks={[
            "Enter a footballer's surname as a guess.",
            "Read the letter feedback to see which characters are correct or misplaced.",
            "Use the pattern from previous attempts to solve the hidden surname.",
          ]}
          faqs={[
            {
              question: "Is Footballer Wordle the same as regular Wordle?",
              answer: "It uses a similar letter-feedback idea, but the answers are footballer surnames rather than general dictionary words.",
            },
            {
              question: "Is Footballer Wordle free?",
              answer: "Yes. FootBattle's Footballer Wordle is playable for free in a web browser.",
            },
            {
              question: "What knowledge helps in Footballer Wordle?",
              answer: "Knowing footballers from different leagues, clubs and eras helps because the possible answers are player surnames.",
            },
          ]}
        />
      ) : null}
    </div>
  );
}
