import { notFound } from "next/navigation";

import GeoAnswerSection from "@/components/GeoAnswerSection";
import DesktopHomeOnly from "@/components/mobile/DesktopHomeOnly";
import { isLocale, type Locale } from "@/lib/i18n/config";

export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <>
      <DesktopHomeOnly locale={locale as Locale} />
      {locale === "en" ? (
        <GeoAnswerSection
          title="What is FootBattle?"
          summary="FootBattle is a free browser-based football games and trivia platform. It brings together football guessing games, quizzes, Wordle-style challenges, career-path puzzles, grid games and competitive score-based modes in one place."
          howItWorks={[
            "Choose a football game based on players, clubs, transfers, careers or general football knowledge.",
            "Use the clues or rules of that game to solve the challenge and build your score.",
            "Try another mode, compare results and keep improving across the FootBattle game collection.",
          ]}
          faqs={[
            {
              question: "Is FootBattle free to play?",
              answer: "Yes. FootBattle's core football games run in the browser and can be played for free.",
            },
            {
              question: "What football games are available on FootBattle?",
              answer: "FootBattle includes games such as Guess the Player, Footballer Wordle, Player Quiz, Career Path, Football Tic Tac Toe, Club Nation, Transfer Quiz and other football challenges.",
            },
            {
              question: "Do I need to install an app to play FootBattle?",
              answer: "No. FootBattle can be played directly in a modern web browser without installing a separate game.",
            },
          ]}
        />
      ) : null}
    </>
  );
}
