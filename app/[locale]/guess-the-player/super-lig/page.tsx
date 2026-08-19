import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import LocalizedGuessThePlayer from "@/components/i18n/LocalizedGuessThePlayer";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/seo";

const DIFFICULTIES = [
  { key: "mixed", tr: "Karışık", en: "Mixed", icon: "🎲" },
  { key: "easy", tr: "Kolay", en: "Easy", icon: "🟢" },
  { key: "medium", tr: "Orta", en: "Medium", icon: "🟡" },
  { key: "hard", tr: "Zor", en: "Hard", icon: "🔴" },
] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const en = locale === "en";
  return {
    title: en ? "Süper Lig Guess the Player | FootBattle" : "Süper Lig Futbolcuyu Tahmin Et | FootBattle",
    description: en
      ? "Guess footballers who currently play or previously played in Turkey's Süper Lig. Choose easy, medium, hard or mixed difficulty."
      : "Süper Lig'de oynayan veya geçmişte oynamış futbolcuları tahmin et. Kolay, orta, zor veya karışık zorluk seç.",
    alternates: {
      canonical: `${SITE_URL}/${locale}/guess-the-player/super-lig`,
      languages: {
        tr: `${SITE_URL}/tr/guess-the-player/super-lig`,
        en: `${SITE_URL}/en/guess-the-player/super-lig`,
        "x-default": `${SITE_URL}/tr/guess-the-player/super-lig`,
      },
    },
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ difficulty?: string }>;
}) {
  const { locale } = await params;
  const { difficulty } = await searchParams;
  if (!isLocale(locale)) notFound();

  const en = locale === "en";
  const active = DIFFICULTIES.some((item) => item.key === difficulty) ? difficulty : "mixed";

  return (
    <div className="min-h-screen bg-[#07111f] text-white" data-game="guess-the-player-super-lig">
      <section className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8">
        <div className="rounded-3xl border border-red-400/20 bg-gradient-to-r from-red-500/10 to-white/[0.03] p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-red-300">🇹🇷 SÜPER LİG MODE</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">
            {en ? "Süper Lig Guess the Player" : "Süper Lig Futbolcuyu Tahmin Et"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            {en
              ? "The hidden player has played in Turkey's Süper Lig at some point in his career. Career history is used, so former league stars are included too."
              : "Gizli futbolcu kariyerinin bir döneminde Süper Lig'de oynadı. Kariyer geçmişini kullandığımız için eski lig efsaneleri de havuzda."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {DIFFICULTIES.map((item) => (
              <Link
                key={item.key}
                href={`/${locale}/guess-the-player/super-lig${item.key === "mixed" ? "" : `?difficulty=${item.key}`}`}
                className={`rounded-xl border px-4 py-2 text-sm font-black transition ${
                  active === item.key
                    ? "border-red-300/40 bg-red-500/20 text-white"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-white"
                }`}
              >
                {item.icon} {en ? item.en : item.tr}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {en
              ? "Difficulty is based on player popularity: Easy 84+, Medium 68–83, Hard 50–67. Mixed uses all eligible players."
              : "Zorluk oyuncu popülerliğine göre belirlenir: Kolay 84+, Orta 68–83, Zor 50–67. Karışık tüm uygun havuzu kullanır."}
          </p>
        </div>
      </section>
      <LocalizedGuessThePlayer locale={locale as Locale} />
    </div>
  );
}
