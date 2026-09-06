import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GeoAnswerSection from "@/components/GeoAnswerSection";
import LocalizedTicTacToePage from "@/components/i18n/LocalizedTicTacToePage";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { GameJsonLd, SITE_URL, localizedAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const isTr = locale === "tr";
  return {
    title: isTr ? "Futbol Tic Tac Toe | FootBattle" : "Football Tic Tac Toe | FootBattle",
    description: isTr ? "Kulüp ve ülke kesişimlerinde doğru futbolcuları bul ve 3x3 futbol gridini tamamla." : "Find footballers who match club and country intersections and complete the 3x3 football grid.",
    alternates: {
      canonical: `${SITE_URL}/${locale}/tic-tac-toe`,
      languages: localizedAlternates("/tic-tac-toe"),
    },
  };
}

export default async function TicTacToeLocalePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const isTr = locale === "tr";
  const description = isTr
    ? "Kulüp ve ülke kesişimlerinde doğru futbolcuları bul ve 3x3 futbol gridini tamamla."
    : "Find footballers who match club and country intersections and complete the 3x3 football grid.";

  return (
    <div data-game="tic-tac-toe">
      <GameJsonLd
        name={isTr ? "Futbol Tic Tac Toe" : "Football Tic Tac Toe"}
        description={description}
        path={`/${locale}/tic-tac-toe`}
        inLanguage={isTr ? "tr-TR" : "en-US"}
      />
      <LocalizedTicTacToePage locale={locale as Locale} />
      {!isTr ? (
        <GeoAnswerSection
          title="What is Football Tic Tac Toe?"
          summary="Football Tic Tac Toe is a free 3x3 football grid game on FootBattle. Each square combines two football criteria, such as clubs or nationalities, and you must name a player who satisfies both conditions to claim the square."
          howItWorks={[
            "Choose an empty square on the 3x3 grid.",
            "Read the row and column criteria that meet at that square.",
            "Name a footballer who matches both criteria to complete the cell.",
          ]}
          faqs={[
            {
              question: "What counts as a correct Football Tic Tac Toe answer?",
              answer: "A correct answer is a footballer who satisfies both the row and column conditions for the selected grid square.",
            },
            {
              question: "Is Football Tic Tac Toe free?",
              answer: "Yes. FootBattle's Football Tic Tac Toe can be played for free in a browser.",
            },
            {
              question: "What knowledge helps with football grids?",
              answer: "Knowledge of transfers, former clubs, national teams and players who represented multiple teams is especially useful for solving football grids.",
            },
          ]}
        />
      ) : null}
    </div>
  );
}
