import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
    </div>
  );
}
