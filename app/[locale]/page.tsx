import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { isLocale, type Locale } from "@/lib/i18n/config";

type GameItem = {
  icon: string;
  title: string;
  description: string;
  href: string;
  tag: string;
};

function localHref(locale: Locale, path: string, localized = true) {
  return localized ? `/${locale}${path}` : path;
}

function getContent(locale: Locale) {
  const tr = locale === "tr";

  const games: GameItem[] = [
    {
      icon: "🟩",
      title: "Wordle",
      description: tr
        ? "Futbolcunun soyadını 5 tahminde bul ve serini koru."
        : "Find the footballer's surname in 5 guesses and keep your streak alive.",
      href: localHref(locale, "/wordle"),
      tag: "Wordle",
    },
    {
      icon: "🕵️",
      title: tr ? "Futbolcuyu Tahmin Et" : "Guess the Player",
      description: tr
        ? "İpuçlarını karşılaştır, gizli futbolcuyu mümkün olduğunca az tahminde bul."
        : "Compare the clues and find the hidden footballer in as few guesses as possible.",
      href: localHref(locale, "/guess-the-player"),
      tag: tr ? "Tahmin" : "Guess",
    },
    {
      icon: "🧠",
      title: "Player Quiz",
      description: tr
        ? "Doğum yılı, milliyet ve kariyer kulüplerini tamamla."
        : "Complete the player's birth year, nationality and career clubs.",
      href: localHref(locale, "/player-quiz", false),
      tag: "Quiz",
    },
    {
      icon: "🔥",
      title: "Transfer Quiz",
      description: tr
        ? "Transfer gündemindeki yıldızı kariyer ipuçlarından çöz."
        : "Identify the transfer-market star from career clues.",
      href: localHref(locale, "/transfer-quiz", false),
      tag: tr ? "Transfer" : "Transfer",
    },
    {
      icon: "⭕",
      title: tr ? "Futbol Tic Tac Toe" : "Football Tic Tac Toe",
      description: tr
        ? "Takım ve ülke kesişimlerine uygun futbolcularla 3x3 grid'i tamamla."
        : "Complete the 3x3 grid with players matching the club and country clues.",
      href: localHref(locale, "/tic-tac-toe"),
      tag: "Grid",
    },
    {
      icon: "⚔️",
      title: tr ? "2 Takım 1 Oyuncu" : "2 Clubs 1 Player",
      description: tr
        ? "İki takımda da forma giymiş futbolcuyu bul ve süreye karşı skor yap."
        : "Find a player who represented both clubs and score against the clock.",
      href: localHref(locale, "/club-clash", false),
      tag: tr ? "Kapışma" : "Clash",
    },
    {
      icon: "🌍",
      title: tr ? "1 Takım 1 Millet" : "1 Club 1 Nation",
      description: tr
        ? "Verilen takım ve millet kombinasyonuna uyan futbolcuları bul."
        : "Find players matching the given club and nationality combination.",
      href: localHref(locale, "/club-nation", false),
      tag: tr ? "Kesişim" : "Match",
    },
    {
      icon: "🛣️",
      title: tr ? "Kariyer Yolu" : "Career Path",
      description: tr
        ? "Oyuncunun kariyer yolunu çöz ve forma giydiği kulüpleri tamamla."
        : "Solve the player's career path and complete the clubs they played for.",
      href: localHref(locale, "/career-path"),
      tag: tr ? "Kariyer" : "Career",
    },
  ];

  return {
    tr,
    games,
    arena: tr ? "Arena sistemi aktif" : "Arena system is live",
    arenaText: tr
      ? "Oyna, XP kazan, seviye atla ve rozet topla."
      : "Play, earn XP, level up and collect badges.",
    leaderboard: tr ? "Sıralama" : "Leaderboard",
    achievements: tr ? "Başarımlar" : "Achievements",
    login: tr ? "Giriş Yap" : "Sign In",
    eyebrow: tr ? "FUTBOLU BİLEN KAZANIR" : "FOOTBALL KNOWLEDGE WINS",
    title: tr ? "Futbol bilginle kapış." : "Put your football knowledge to the test.",
    subtitle: tr
      ? "8 oyunun tamamı tek yerde. Tahmin et, süreye karşı yarış, arkadaşına meydan oku ve rank kas."
      : "All 8 games in one place. Guess, race the clock, challenge friends and climb the ranks.",
    play: tr ? "Hemen Oyna" : "Play Now",
    gamesEyebrow: tr ? "TÜM OYUNLAR" : "ALL GAMES",
    gamesTitle: tr ? "8 oyun. Tek arena." : "8 games. One arena.",
    gamesSubtitle: tr
      ? "Mobilde de tüm oyunlara tek ekrandan rahatça ulaş."
      : "Reach every game easily from one mobile-friendly screen.",
    dailyEyebrow: tr ? "HER GÜN GERİ DÖN" : "COME BACK DAILY",
    dailyTitle: tr ? "Günün kapışmaları" : "Daily battles",
    dailyText: tr
      ? "Günün Kapışması ve Survivor ile her gün yeni bir rekabet aç."
      : "Start a fresh competition every day with Daily Faceoff and Survivor.",
    faceoff: tr ? "Günün Kapışması" : "Daily Faceoff",
    survivor: "Survivor",
    rankTitle: tr ? "Rank Arenası" : "Rank Arena",
    rankText: tr
      ? "XP ve puan topla, sıralamada yüksel ve futbol bilgini kanıtla."
      : "Earn XP and points, climb the leaderboard and prove your football knowledge.",
    rankCta: tr ? "Rank'e Git" : "Open Rank",
    footer: tr ? "Futbolu bilen kazanır." : "Football knowledge wins.",
  };
}

export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  const c = getContent(locale);

  return (
    <main className="min-h-screen bg-[#07111f] pb-24 text-white sm:pb-10">
      <div className="border-b border-green-400/15 bg-gradient-to-r from-green-500/[0.08] via-transparent to-yellow-300/[0.05]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-3 text-center text-xs font-bold text-slate-300 sm:justify-start sm:px-6 sm:text-sm lg:px-8">
          <span className="font-black text-green-300">⚡ {c.arena}</span>
          <span>{c.arenaText}</span>
          <Link href={`/${locale}/rank`} className="font-black text-yellow-300 hover:text-yellow-200">🏆 {c.leaderboard}</Link>
          <Link href="/achievements" className="font-black text-green-300 hover:text-green-200">⭐ {c.achievements}</Link>
        </div>
      </div>

      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link href={`/${locale}`} className="min-w-0 shrink">
            <Image
              src="/footbattle-logo.png"
              alt="FootBattle"
              width={360}
              height={110}
              priority
              className="h-auto w-[170px] sm:w-[230px]"
            />
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.035] p-1 text-xs font-black sm:text-sm">
              <Link
                href="/tr"
                className={`rounded-lg px-2.5 py-2 transition sm:px-3 ${locale === "tr" ? "bg-green-500 text-[#07111f]" : "text-slate-400 hover:text-white"}`}
              >
                TR
              </Link>
              <Link
                href="/en"
                className={`rounded-lg px-2.5 py-2 transition sm:px-3 ${locale === "en" ? "bg-green-500 text-[#07111f]" : "text-slate-400 hover:text-white"}`}
              >
                EN
              </Link>
            </div>
            <Link
              href="/login"
              className="hidden rounded-xl bg-green-500 px-4 py-2.5 text-sm font-black text-[#07111f] transition hover:bg-green-400 sm:inline-flex"
            >
              {c.login}
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-10 pt-10 sm:px-6 sm:pb-14 sm:pt-16 lg:px-8">
        <div className="overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-white/[0.055] to-green-400/[0.035] px-5 py-9 shadow-2xl shadow-black/20 sm:px-9 sm:py-12 lg:px-12">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-300">{c.eyebrow}</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl lg:text-7xl">{c.title}</h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-400 sm:text-lg">{c.subtitle}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a href="#games" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-green-500 px-6 text-sm font-black text-[#07111f] transition hover:bg-green-400">⚽ {c.play}</a>
            <Link href={`/${locale}/rank`} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-yellow-300/25 bg-yellow-300/10 px-6 text-sm font-black text-yellow-100 transition hover:bg-yellow-300/15">🏆 {c.rankTitle}</Link>
          </div>
        </div>
      </section>

      <section id="games" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-green-300">{c.gamesEyebrow}</p>
        <h2 className="mt-2 text-3xl font-black sm:text-4xl">{c.gamesTitle}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">{c.gamesSubtitle}</p>

        <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {c.games.map((game) => (
            <Link
              key={game.title}
              href={game.href}
              className="group flex min-h-[168px] flex-col rounded-3xl border border-white/10 bg-[#0b1726] p-5 transition hover:-translate-y-0.5 hover:border-green-400/30 hover:bg-[#0e1d2f]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-2xl">{game.icon}</span>
                <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">{game.tag}</span>
              </div>
              <h3 className="mt-4 text-lg font-black group-hover:text-green-200">{game.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">{game.description}</p>
              <p className="mt-4 text-xs font-black text-green-300">{c.play} →</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-[30px] border border-yellow-300/20 bg-yellow-300/[0.055] p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-300">🔥 {c.dailyEyebrow}</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">{c.dailyTitle}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{c.dailyText}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link href={`/${locale}/daily-faceoff`} className="rounded-2xl border border-white/10 bg-black/15 p-5 font-black transition hover:border-yellow-300/30">🔥 {c.faceoff}<span className="mt-2 block text-xs text-yellow-200">{c.play} →</span></Link>
              <Link href={`/${locale}/survivor`} className="rounded-2xl border border-white/10 bg-black/15 p-5 font-black transition hover:border-green-300/30">👑 {c.survivor}<span className="mt-2 block text-xs text-green-200">{c.play} →</span></Link>
            </div>
          </div>

          <div className="rounded-[30px] border border-green-400/20 bg-green-400/[0.055] p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-green-300">🏆 FOOTBATTLE</p>
            <h2 className="mt-3 text-2xl font-black">{c.rankTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">{c.rankText}</p>
            <Link href={`/${locale}/rank`} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-green-500 px-5 text-sm font-black text-[#07111f] transition hover:bg-green-400">{c.rankCta} →</Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto mt-6 flex max-w-7xl flex-col gap-3 border-t border-white/10 px-4 py-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <span>© FootBattle · {c.footer}</span>
        <div className="flex flex-wrap gap-4">
          <Link href={`/${locale}/profile`} className="font-bold text-slate-400 hover:text-white">{locale === "tr" ? "Profil" : "Profile"}</Link>
          <Link href={`/${locale}/rank`} className="font-bold text-slate-400 hover:text-white">{c.rankTitle}</Link>
          <Link href={locale === "tr" ? "/en" : "/tr"} className="font-bold text-green-300 hover:text-green-200">{locale === "tr" ? "English" : "Türkçe"} →</Link>
        </div>
      </footer>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-[#081421]/95 p-2 shadow-2xl shadow-black/50 backdrop-blur sm:hidden">
        <Link href={`/${locale}/rank`} className="flex min-h-12 items-center justify-center rounded-xl border border-yellow-300/20 bg-yellow-300/[0.08] px-2 text-center text-xs font-black text-yellow-100">🏆 {locale === "tr" ? "Rank" : "Rank"}</Link>
        <a href="#games" className="flex min-h-12 items-center justify-center rounded-xl bg-green-500 px-2 text-center text-xs font-black text-[#07111f]">⚽ {locale === "tr" ? "Oyunlar" : "Games"}</a>
        <Link href="/login" className="flex min-h-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-2 text-center text-xs font-black text-slate-200">👤 {c.login}</Link>
      </nav>
    </main>
  );
}
