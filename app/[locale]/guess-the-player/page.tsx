import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import GeoAnswerSection from "@/components/GeoAnswerSection";
import LocalizedGuessThePlayer from "@/components/i18n/LocalizedGuessThePlayer";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { GameJsonLd, SITE_URL, localizedAlternates } from "@/lib/seo";

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
  const en = locale === "en";
  const description = en
    ? "Guess the hidden footballer using country, club, league, position, age and foot clues."
    : "Ülke, takım, lig, pozisyon, yaş ve ayak ipuçlarıyla gizli futbolcuyu tahmin et.";

  return (
    <div data-game="guess-the-player" className="bg-[#07111f]">
      <GameJsonLd
        name={en ? "Guess the Player" : "Futbolcuyu Tahmin Et"}
        description={description}
        path={`/${locale}/guess-the-player`}
        inLanguage={en ? "en-US" : "tr-TR"}
      />
      <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
        <Link
          href={`/${locale}/guess-the-player/super-lig`}
          className="flex items-center justify-between gap-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 transition hover:bg-red-500/15"
        >
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-red-300">🇹🇷 {en ? "NEW MODE" : "YENİ MOD"}</p>
            <p className="mt-1 font-black text-white">{en ? "Süper Lig Guess the Player" : "Süper Lig Futbolcuyu Tahmin Et"}</p>
          </div>
          <span className="shrink-0 text-sm font-black text-red-200">{en ? "Play →" : "Oyna →"}</span>
        </Link>
      </div>
      <LocalizedGuessThePlayer locale={locale as Locale} />
      {en ? (
        <GeoAnswerSection
          title="What is Guess the Player?"
          summary="Guess the Player is a free browser football guessing game on FootBattle. You identify a hidden footballer by comparing clues such as nationality, club, league, position, age and preferred foot, then use each guess to narrow the possibilities."
          howItWorks={[
            "Enter a footballer's name as your first guess.",
            "Compare the clue feedback for country, club, league, position, age and foot.",
            "Use the new information to narrow the field and identify the hidden player.",
          ]}
          faqs={[
            {
              question: "Is Guess the Player free to play?",
              answer: "Yes. FootBattle's Guess the Player runs in the browser and can be played for free without installing a separate game.",
            },
            {
              question: "What clues are used in Guess the Player?",
              answer: "The game uses footballer attributes including nationality, club, league, position, age and preferred foot to help you compare each guess with the hidden player.",
            },
            {
              question: "Does FootBattle have a Süper Lig version?",
              answer: "Yes. FootBattle also has a Süper Lig Guess the Player mode focused on active players in Turkey's top division, with multiple difficulty levels.",
            },
          ]}
        />
      ) : null}
    </div>
  );
}
