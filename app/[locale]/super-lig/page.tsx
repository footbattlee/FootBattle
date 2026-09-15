import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CompetitionHub from "@/components/football/CompetitionHub";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { SITE_URL, localizedAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const en = locale === "en";
  return {
    title: en ? "Turkish Süper Lig Standings, Fixtures & Results | FootBattle" : "Süper Lig Puan Durumu, Fikstür ve Maç Sonuçları | FootBattle",
    description: en
      ? "Follow the 2026/27 Turkish Süper Lig standings, fixtures, results, team pages, squads and score predictions on FootBattle."
      : "2026/27 Süper Lig puan durumu, fikstür, maç sonuçları, takım kadroları ve skor tahminlerini FootBattle'da takip et.",
    keywords: en
      ? ["Turkish Super Lig standings", "Super Lig fixtures", "Super Lig results", "Turkish Super Lig teams"]
      : ["süper lig puan durumu", "süper lig fikstür", "süper lig maç sonuçları", "süper lig takımları", "süper lig kadroları"],
    alternates: { canonical: `${SITE_URL}/${locale}/super-lig`, languages: localizedAlternates("/super-lig") },
    openGraph: {
      type: "website",
      siteName: "FootBattle",
      title: en ? "Turkish Süper Lig Standings, Fixtures & Results" : "Süper Lig Puan Durumu, Fikstür ve Maç Sonuçları",
      description: en
        ? "2026/27 Turkish Süper Lig standings, fixtures, results, teams and score predictions."
        : "2026/27 Süper Lig puan durumu, fikstür, maç sonuçları, takımlar ve skor tahminleri.",
      url: `${SITE_URL}/${locale}/super-lig`,
    },
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <CompetitionHub competition="super-lig" locale={locale as Locale} />;
}
