import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import GeoAnswerSection from "@/components/GeoAnswerSection";
import LocalizedCareerPath from "@/components/i18n/LocalizedCareerPath";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { BreadcrumbJsonLd, GameJsonLd, SITE_URL, localizedAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const en = locale === "en";
  return {
    title: en ? "Football Career Path Quiz | Guess the Player's Clubs | FootBattle" : "Kariyer Yolu | FootBattle",
    description: en
      ? "Play a free football career path quiz. Guess the clubs a footballer represented, complete the player's career journey and test your transfer knowledge."
      : "Futbolcunun kariyer yolunu forma giydiği kulüpleri bularak tamamla.",
    alternates: {
      canonical: `${SITE_URL}/${locale}/career-path`,
      languages: localizedAlternates("/career-path"),
    },
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const en = locale === "en";
  const description = en
    ? "Play a free football career path quiz. Guess the clubs a footballer represented and complete the player's career journey in the correct order."
    : "Futbolcunun kariyer yolunu forma giydiği kulüpleri bularak tamamla.";

  return (
    <div data-game="career-path">
      <BreadcrumbJsonLd
        items={[
          { name: "FootBattle", path: `/${locale}` },
          { name: en ? "Football Games" : "Futbol Oyunları", path: `/${locale}/games` },
          { name: en ? "Football Career Path Quiz" : "Kariyer Yolu", path: `/${locale}/career-path` },
        ]}
      />
      <GameJsonLd
        name={en ? "Football Career Path Quiz" : "Kariyer Yolu"}
        description={description}
        path={`/${locale}/career-path`}
        inLanguage={en ? "en-US" : "tr-TR"}
      />
      <Suspense fallback={null}>
        <LocalizedCareerPath locale={locale as Locale} />
      </Suspense>
      {en ? (
        <>
          <GeoAnswerSection
            title="What is the Football Career Path Quiz?"
            summary="FootBattle's Football Career Path Quiz is a free browser game where you guess the clubs in a footballer's career and complete the career path in sequence. It tests your knowledge of transfers, former teams and player histories."
            howItWorks={[
              "Study the player and the missing club positions in the career path.",
              "Use the known teams, transfer history and timeline as clues.",
              "Enter the missing clubs to complete the footballer's career journey.",
            ]}
            faqs={[
              {
                question: "What is a football career path quiz?",
                answer: "It is a football guessing game where you identify clubs from a player's career history and use the sequence of teams as the main clue.",
              },
              {
                question: "What does Career Path test?",
                answer: "It tests how well you remember a footballer's club history, including transfers and the order in which the player represented different teams.",
              },
              {
                question: "Is the Football Career Path Quiz free?",
                answer: "Yes. FootBattle's Football Career Path Quiz is free to play in a web browser.",
              },
              {
                question: "How can I get better at Career Path?",
                answer: "Focus on major transfers, academy clubs, loan spells and the chronological order of teams in well-known players' careers.",
              },
            ]}
          />
          <section className="bg-[#07111f] px-5 pb-16 text-white sm:px-8">
            <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
              <h2 className="text-2xl font-black">More football guessing games</h2>
              <p className="mt-3 max-w-3xl leading-7 text-slate-300">
                If you enjoy football career path quizzes, continue with player clues, transfers or word-based football games.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/en/guess-the-player" className="rounded-xl border border-white/10 px-4 py-3 font-bold text-emerald-300 hover:bg-white/5">Guess the Player</Link>
                <Link href="/transfer-quiz" className="rounded-xl border border-white/10 px-4 py-3 font-bold text-emerald-300 hover:bg-white/5">Transfer Quiz</Link>
                <Link href="/football-wordle" className="rounded-xl border border-white/10 px-4 py-3 font-bold text-emerald-300 hover:bg-white/5">Football Wordle</Link>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
