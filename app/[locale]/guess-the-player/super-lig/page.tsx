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

type DifficultyKey = (typeof DIFFICULTIES)[number]["key"];

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const en = locale === "en";
  return {
    title: en ? "Süper Lig Guess the Player | FootBattle" : "Süper Lig Futbolcuyu Tahmin Et | FootBattle",
    description: en
      ? "Guess footballers currently playing in Turkey's Süper Lig. Choose easy, medium, hard or mixed difficulty."
      : "Şu anda Süper Lig'de oynayan futbolcuları tahmin et. Kolay, orta, zor veya karışık zorluk seç.",
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
  const selectedDifficulty = DIFFICULTIES.some((item) => item.key === difficulty)
    ? (difficulty as DifficultyKey)
    : null;
  const selectedDifficultyItem = selectedDifficulty
    ? DIFFICULTIES.find((item) => item.key === selectedDifficulty) ?? null
    : null;

  return (
    <div className="min-h-screen bg-[#07111f] text-white" data-game="guess-the-player-super-lig">
      {!selectedDifficulty ? (
        <section className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8">
          <div className="rounded-3xl border border-red-400/20 bg-gradient-to-r from-red-500/10 to-white/[0.03] p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-red-300">🇹🇷 SÜPER LİG MODE</p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              {en ? "Süper Lig Guess the Player" : "Süper Lig Futbolcuyu Tahmin Et"}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              {en
                ? "First choose a difficulty. The hidden player is created only after your selection and is limited to active Süper Lig players."
                : "Önce zorluk seç. Gizli futbolcu yalnızca seçimini yaptıktan sonra oluşturulur ve aktif Süper Lig oyuncularından gelir."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {DIFFICULTIES.map((item) => (
                <Link
                  key={item.key}
                  href={`/${locale}/guess-the-player/super-lig?difficulty=${item.key}`}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-black text-slate-300 transition hover:border-red-300/30 hover:bg-red-500/10 hover:text-white"
                >
                  {item.icon} {en ? item.en : item.tr}
                </Link>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {en
                ? "Difficulty is based on player popularity: Easy 84+, Medium 68–83, Hard 50–67. Mixed uses all eligible active players."
                : "Zorluk oyuncu popülerliğine göre belirlenir: Kolay 84+, Orta 68–83, Zor 50–67. Karışık tüm uygun aktif oyuncuları kullanır."}
            </p>
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-6xl px-4 pt-3 sm:px-6 sm:pt-5">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-400/15 bg-red-500/[0.06] px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-300">🇹🇷 SÜPER LİG</p>
              <p className="mt-0.5 truncate text-sm font-black text-white">
                {en ? "Difficulty" : "Zorluk"}: {selectedDifficultyItem?.icon} {selectedDifficultyItem ? (en ? selectedDifficultyItem.en : selectedDifficultyItem.tr) : selectedDifficulty}
              </p>
            </div>
            <Link
              href={`/${locale}/guess-the-player/super-lig`}
              className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-slate-300 transition hover:text-white"
            >
              {en ? "Change" : "Değiştir"}
            </Link>
          </div>
        </section>
      )}

      {selectedDifficulty ? (
        <LocalizedGuessThePlayer key={`super-lig-${selectedDifficulty}`} locale={locale as Locale} />
      ) : (
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
          <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-[#0c1929] p-6 text-center sm:p-8">
            <p className="text-4xl">🎯</p>
            <h2 className="mt-3 text-xl font-black sm:text-2xl">
              {en ? "Choose difficulty to start" : "Oyunu başlatmak için zorluk seç"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {en
                ? "No player has been selected yet. Your game session will be created after you choose a difficulty above."
                : "Henüz hiçbir futbolcu seçilmedi. Yukarıdan zorluk seçtiğinde oyun oturumu ve gizli futbolcu oluşturulacak."}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
