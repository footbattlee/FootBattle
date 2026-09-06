import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

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
    </div>
  );
}
