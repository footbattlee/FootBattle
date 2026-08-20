import Link from "next/link";
import { notFound } from "next/navigation";

import { isLocale } from "@/lib/i18n/config";

const games = [
  { key: "guess", icon: "🕵️", tr: "Guess The Player", en: "Guess The Player", descTr: "Gizli futbolcuyu ipuçlarından bul.", descEn: "Find the hidden player from clues.", href: (l: string) => `/${l}/guess-the-player`, badgeTr: "Günlük", badgeEn: "Daily" },
  { key: "superlig", icon: "🇹🇷", tr: "Süper Lig Guess The Player", en: "Süper Lig Guess The Player", descTr: "Süper Lig oyuncularını zorluk seçerek tahmin et.", descEn: "Guess Süper Lig players by difficulty.", href: (l: string) => `/${l}/guess-the-player/super-lig`, badgeTr: "Yeni", badgeEn: "New" },
  { key: "clubclash", icon: "⚽", tr: "2 Takım 1 Oyuncu", en: "2 Clubs 1 Player", descTr: "İki takımda da oynamış ortak futbolcuyu bul.", descEn: "Find a player who played for both clubs.", href: () => "/club-clash", badgeTr: "120 sn", badgeEn: "120 sec" },
  { key: "tictactoe", icon: "⭕", tr: "Futbol Tic Tac Toe", en: "Football Tic Tac Toe", descTr: "3x3 futbol gridini doğru oyuncularla doldur.", descEn: "Complete the 3x3 football grid.", href: (l: string) => `/${l}/tic-tac-toe`, badgeTr: "Grid", badgeEn: "Grid" },
  { key: "wordle", icon: "🟩", tr: "Wordle", en: "Wordle", descTr: "Futbolcunun soyadını 5 tahminde bul.", descEn: "Guess the footballer's surname in 5 tries.", href: (l: string) => `/${l}/wordle`, badgeTr: "Günlük", badgeEn: "Daily" },
  { key: "career", icon: "🧭", tr: "Career Path", en: "Career Path", descTr: "Kariyer rotasından futbolcuyu tahmin et.", descEn: "Guess the player from the career path.", href: (l: string) => `/${l}/career-path`, badgeTr: "Kariyer", badgeEn: "Career" },
  { key: "survivor", icon: "👑", tr: "O Mu Bu Mu?", en: "This or That?", descTr: "İki futbolcu arasında seçim yap ve sona kal.", descEn: "Choose between players and survive.", href: (l: string) => `/${l}/survivor`, badgeTr: "Survivor", badgeEn: "Survivor" },
  { key: "faceoff", icon: "🔥", tr: "Günün Kapışması", en: "Daily Faceoff", descTr: "Günün futbol eşleşmesinde tarafını seç.", descEn: "Pick your side in today's football faceoff.", href: (l: string) => `/${l}/daily-faceoff`, badgeTr: "Bugün", badgeEn: "Today" },
] as const;

export default async function GamesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const tr = locale === "tr";

  return (
    <main className="min-h-screen bg-[#07111f] pb-28 text-white">
      <div className="mx-auto max-w-xl px-4 pb-8 pt-5">
        <header className="mb-5">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-green-300">FootBattle</p>
          <h1 className="mt-1 text-3xl font-black">{tr ? "Oyunlar" : "Games"}</h1>
          <p className="mt-2 text-sm leading-5 text-slate-400">{tr ? "Oynamak istediğin modu seç. Oyunlar mobilde ayrı ve hızlı bir ekranda." : "Choose a mode. Games now live in a dedicated mobile-friendly hub."}</p>
        </header>

        <section className="space-y-3">
          {games.map((game) => (
            <Link
              key={game.key}
              href={game.href(locale)}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3.5 transition active:scale-[0.99]"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[#0d1828] text-2xl">{game.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-sm font-black">{tr ? game.tr : game.en}</h2>
                  <span className="shrink-0 rounded-full bg-green-400/10 px-2 py-0.5 text-[9px] font-black uppercase text-green-300">{tr ? game.badgeTr : game.badgeEn}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-4 text-slate-500">{tr ? game.descTr : game.descEn}</p>
              </div>
              <span className="shrink-0 text-lg text-slate-600">›</span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
