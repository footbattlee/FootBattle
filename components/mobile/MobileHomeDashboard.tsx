"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const GAMES = [
  { icon: "🇹🇷", title: "Süper Lig Guess The Player", tr: "Süper Lig oyuncusunu ipuçlarından bul.", en: "Guess the Süper Lig player from clues.", path: "/guess-the-player/super-lig", tag: "Yeni" },
  { icon: "🕵️", title: "Guess The Player", tr: "Gizli futbolcuyu mümkün olduğunca az tahminde bul.", en: "Find the hidden player in as few guesses as possible.", path: "/guess-the-player" },
  { icon: "⭕", title: "Tic Tac Toe", tr: "3×3 futbol gridini doğru oyuncularla doldur.", en: "Complete the 3×3 football grid.", path: "/tic-tac-toe" },
  { icon: "🟩", title: "Wordle", tr: "Futbolcunun soyadını 5 tahminde bul.", en: "Guess the footballer's surname in 5 tries.", path: "/wordle" },
  { icon: "⚔️", title: "2 Takım 1 Oyuncu", tr: "İki takımda da oynamış futbolcuyu bul.", en: "Find a player who represented both clubs.", path: "/club-clash" },
  { icon: "🛣️", title: "Career Path", tr: "Futbolcunun kariyer yolunu çöz.", en: "Solve the player's career path.", path: "/career-path" },
  { icon: "🏆", title: "Survivor", tr: "Futbol bilgini eleme turlarında test et.", en: "Test your football knowledge in elimination rounds.", path: "/survivor" },
  { icon: "🔥", title: "Günün Kapışması", tr: "Günün futbol sorusunda kapış.", en: "Take on today's football faceoff.", path: "/daily-faceoff" },
];

export default function MobileHomeDashboard() {
  const pathname = usePathname();
  const locale = pathname === "/en" || pathname.startsWith("/en/") ? "en" : "tr";
  if (pathname !== "/tr" && pathname !== "/en") return null;
  const tr = locale === "tr";

  return (
    <main className="mobile-home-dashboard min-h-screen bg-[#07111f] px-4 pb-24 pt-5 text-white md:hidden">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-green-400">FootBattle</p>
          <h1 className="mt-1 text-[24px] font-black leading-tight">{tr ? "Ne oynayacaksın?" : "What will you play?"}</h1>
        </div>
        <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1 text-[11px] font-black">
          <Link href="/tr" className={`rounded-lg px-2.5 py-2 ${locale === "tr" ? "bg-green-500 text-[#07111f]" : "text-slate-500"}`}>TR</Link>
          <Link href="/en" className={`rounded-lg px-2.5 py-2 ${locale === "en" ? "bg-green-500 text-[#07111f]" : "text-slate-500"}`}>EN</Link>
        </div>
      </header>

      <Link href={`/${locale}/daily`} className="mt-5 flex items-center justify-between rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.07] px-4 py-3">
        <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-yellow-300">🔥 {tr ? "Günlük Görev" : "Daily Challenge"}</p><p className="mt-1 text-sm font-black">{tr ? "Bugünkü bonusunu kaçırma" : "Don't miss today's bonus"}</p></div>
        <span className="ml-3 text-lg text-yellow-300">→</span>
      </Link>

      <section className="mt-5">
        <div className="flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{tr ? "Oyunlar" : "Games"}</p><h2 className="mt-1 text-lg font-black">{tr ? "Hemen oyna" : "Play now"}</h2></div><span className="text-[10px] font-bold text-slate-600">{GAMES.length} {tr ? "oyun" : "games"}</span></div>
        <div className="mt-3 space-y-2.5">
          {GAMES.map((game) => (
            <Link key={game.path} href={`/${locale}${game.path}`} className="flex min-h-[76px] items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3.5 py-3 active:scale-[0.99]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-xl">{game.icon}</div>
              <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-black">{game.title}</p>{game.tag ? <span className="rounded-full bg-yellow-400/15 px-2 py-0.5 text-[8px] font-black uppercase text-yellow-300">{game.tag}</span> : null}</div><p className="mt-1 line-clamp-1 text-[11px] leading-4 text-slate-500">{tr ? game.tr : game.en}</p></div>
              <span className="shrink-0 text-sm font-black text-green-300">→</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
