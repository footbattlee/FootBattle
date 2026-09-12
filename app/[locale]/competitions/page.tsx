import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CompetitionLinks from "@/components/football/CompetitionLinks";
import { COMPETITIONS, type CompetitionKey } from "@/lib/football/competition-hubs";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { BreadcrumbJsonLd, JsonLd, SITE_URL, localizedAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const en = locale === "en";
  const title = en ? "Football Leagues, Fixtures & Standings | FootBattle" : "Futbol Ligleri, Fikstür ve Puan Durumu | FootBattle";
  const description = en
    ? "Follow 2026/27 football standings, fixtures, results, team pages and score predictions across major European leagues and UEFA competitions."
    : "2026/27 Süper Lig, Avrupa'nın büyük ligleri ve UEFA turnuvalarında puan durumu, fikstür, sonuçlar, takım sayfaları ve skor tahminlerini takip et.";
  const canonical = `${SITE_URL}/${locale}/competitions`;

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical,
      languages: localizedAlternates("/competitions"),
    },
    openGraph: {
      type: "website",
      siteName: "FootBattle",
      title,
      description,
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CompetitionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const tr = locale === "tr";
  const keys = Object.keys(COMPETITIONS) as CompetitionKey[];
  const pageUrl = `${SITE_URL}/${locale}/competitions`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl}#page`,
    url: pageUrl,
    name: tr ? "FootBattle Futbol Ligleri ve Turnuvaları" : "FootBattle Football Leagues and Tournaments",
    description: tr
      ? "Futbol ligleri ve UEFA turnuvaları için puan durumu, fikstür, sonuçlar ve takım sayfaları."
      : "Standings, fixtures, results and team pages for football leagues and UEFA competitions.",
    inLanguage: tr ? "tr-TR" : "en-US",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: keys.length,
      itemListElement: keys.map((key, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: tr ? COMPETITIONS[key].trName : COMPETITIONS[key].enName,
        url: `${SITE_URL}/${locale}/${key}`,
      })),
    },
  };

  return (
    <main className="min-h-screen bg-[#07111f] pb-4 text-white">
      <JsonLd data={schema} />
      <BreadcrumbJsonLd
        items={[
          { name: "FootBattle", path: `/${locale}` },
          { name: tr ? "Ligler ve Turnuvalar" : "Leagues and Tournaments" },
        ]}
      />
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <p className="text-xs font-black uppercase tracking-[.22em] text-green-300">
          {tr ? "FOOTBATTLE FUTBOL MERKEZİ" : "FOOTBATTLE FOOTBALL HUB"}
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          {tr ? "Ligler & Turnuvalar" : "Leagues & Tournaments"}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          {tr
            ? "2026/27 sezonunda Süper Lig, Avrupa'nın öne çıkan ligleri ve UEFA turnuvalarını takip et. Güncel puan durumuna, hafta veya tur bazlı fikstüre, maç sonuçlarına ve takım sayfalarına tek yerden ulaş; desteklenen maçlarda skor tahmini yap."
            : "Follow the 2026/27 Süper Lig, Europe's major domestic leagues and UEFA competitions. Browse current standings, fixtures by matchweek or round, results and team pages in one place, with score predictions on supported matches."}
        </p>
      </div>
      <CompetitionLinks locale={locale as Locale} />
    </main>
  );
}
