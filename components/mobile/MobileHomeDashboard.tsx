"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Game = {
  icon: string;
  titleTr: string;
  titleEn: string;
  tr: string;
  en: string;
  href: (locale: "tr" | "en") => string;
  tag?: string;
};

const GAMES: Game[] = [
  { icon: "🇹🇷", titleTr: "Süper Lig Futbolcuyu Tahmin Et", titleEn: "Süper Lig Guess The Player", tr: "Süper Lig oyuncusunu ipuçlarından bul.", en: "Guess the Süper Lig player from clues.", href: (locale) => `/${locale}/guess-the-player/super-lig`, tag: "Yeni" },
  { icon: "🕵️", titleTr: "Futbolcuyu Tahmin Et", titleEn: "Guess The Player", tr: "Gizli futbolcuyu mümkün olduğunca az tahminde bul.", en: "Find the hidden player in as few guesses as possible.", href: (locale) => `/${locale}/guess-the-player` },
  { icon: "🧠", titleTr: "Player Quiz", titleEn: "Player Quiz", tr: "Doğum yılı, milliyet ve kariyer kulüplerini tamamla.", en: "Complete the birth year, nationality and career clubs.", href: () => "/player-quiz", tag: "Yeni" },
  { icon: "⭕", titleTr: "Futbol Tic Tac Toe", titleEn: "Football Tic Tac Toe", tr: "3×3 futbol gridini doğru oyuncularla doldur.", en: "Complete the 3×3 football grid.", href: (locale) => `/${locale}/tic-tac-toe` },
  { icon: "🟩", titleTr: "Futbol Wordle", titleEn: "Football Wordle", tr: "Futbolcunun soyadını 5 tahminde bul.", en: "Guess the footballer's surname in 5 tries.", href: (locale) => `/${locale}/wordle` },
  { icon: "⚔️", titleTr: "2 Takım 1 Oyuncu", titleEn: "2 Clubs 1 Player", tr: "İki takımda da oynamış futbolcuyu bul.", en: "Find a player who represented both clubs.", href: () => "/club-clash" },
  { icon: "⚽", titleTr: "Halısaha Kadro", titleEn: "Pickup Squad", tr: "Arkadaşlarını sahaya diz, kadronu paylaş.", en: "Build and share your pickup squad.", href: () => "/halisaha-kadro" },
  { icon: "🏆", titleTr: "O mu Bu mu?", titleEn: "Survivor", tr: "Futbol dünyasının ikilemlerinde seçimini yap.", en: "Test your football knowledge in elimination rounds.", href: (locale) => `/${locale}/survivor` },
  { icon: "🔥", titleTr: "Günün Kapışması", titleEn: "Daily Faceoff", tr: "Günün futbol sorusunda kapış.", en: "Take on today's football faceoff.", href: (locale) => `/${locale}/daily-faceoff` },
];

export default function MobileHomeDashboard() {
  const pathname = usePathname();
  const locale: "tr" | "en" = pathname === "/en" || pathname.startsWith("/en/") ? "en" : "tr";
  if (pathname !== "/tr" && pathname !== "/en") return null;
  const tr = locale === "tr";

  return (
    <main className="mobile-home-dashboard min-h-screen bg-[#07111f] px-3 pb-24 pt-2.5 text-white md:hidden">
      <header className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/${locale}`} aria-label="FootBattle" className="inline-flex">
            <Image src="/footbattle-logo.png" alt="FootBattle" width={180} height={55} priority className="h-auto w-[102px] object-contain" />
          </Link>
          <h1 className="mt-0.5 text-[20px] font-black leading-tight">{tr ? "Ne oynayacaksın?" : "What will you play?"}</h1>
        </div>
        <div className="flex shrink-0 rounded-xl border border-white/10 bg-white/[0.03] p-0.5 text-[10px] font-black">
          <Link href="/tr" className={`rounded-lg px-2 py-1.5 ${locale === "tr" ? "bg-green-500 text-[#07111f]" : "text-slate-500"}`}>TR</Link>
          <Link href="/en" className={`rounded-lg px-2 py-1.5 ${locale === "en" ? "bg-green-500 text-[#07111f]" : "text-slate-500"}`}>EN</Link>
        </div>
      </header>

      <Link href={`/${locale}/daily`} className="mt-2.5 flex items-center justify-between rounded-xl border border-yellow-400/20 bg-yellow-400/[0.07] px-3 py-2">
        <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-yellow-300">🔥 {tr ? "Günlük Görev" : "Daily Challenge"}</p><p className="mt-0.5 text-[12px] font-black">{tr ? "Bugünkü bonusunu kaçırma" : "Don't miss today's bonus"}</p></div>
        <span className="ml-2 text-base text-yellow-300">→</span>
      </Link>

      <section className="mt-2.5">
        <div className="flex items-end justify-between"><h2 className="text-base font-black">{tr ? "Hemen oyna" : "Play now"}</h2><span className="text-[9px] font-bold text-slate-600">{GAMES.length} {tr ? "oyun" : "games"}</span></div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {GAMES.map((game) => {
            const title = tr ? game.titleTr : game.titleEn;
            return (
              <Link key={game.titleEn} href={game.href(locale)} className="relative flex min-h-[94px] flex-col justify-between rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3 active:scale-[0.99]">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xl">{game.icon}</span>
                  {game.tag ? <span className="rounded-full bg-yellow-400/15 px-1.5 py-0.5 text-[7px] font-black uppercase text-yellow-300">{game.tag}</span> : <span className="text-xs font-black text-green-300">→</span>}
                </div>
                <div className="mt-2 min-w-0">
                  <p className="line-clamp-2 text-[12px] font-black leading-[15px]">{title}</p>
                  <p className="mt-1 line-clamp-1 text-[9px] leading-3 text-slate-500">{tr ? game.tr : game.en}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
