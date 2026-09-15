import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import GeoAnswerSection from "@/components/GeoAnswerSection";
import LocalizedGuessThePlayer from "@/components/i18n/LocalizedGuessThePlayer";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { FAQJsonLd, GameJsonLd, SITE_URL } from "@/lib/seo";

const DIFFICULTIES = [
  { key: "mixed", tr: "Karışık", en: "Mixed", icon: "🎲" },
  { key: "easy", tr: "Kolay", en: "Easy", icon: "🟢" },
  { key: "medium", tr: "Orta", en: "Medium", icon: "🟡" },
  { key: "hard", tr: "Zor", en: "Hard", icon: "🔴" },
] as const;

type DifficultyKey = (typeof DIFFICULTIES)[number]["key"];

const trFaqs = [
  { question: "Süper Lig futbolcu tahmin oyunu ücretsiz mi?", answer: "Evet. FootBattle Süper Lig Futbolcu Tahmin Oyunu tarayıcı üzerinden ücretsiz oynanabilir." },
  { question: "Oyunda hangi futbolcular çıkıyor?", answer: "Bu mod, Türkiye Süper Lig'de aktif olarak oynayan uygun futbolculara odaklanır." },
  { question: "Hangi zorluk seviyeleri var?", answer: "Kolay, Orta, Zor ve Karışık seçenekleri bulunur. Zorluk seviyesi futbolcuların popülerliğine göre belirlenir." },
  { question: "Guess the Player Süper Lig modu nasıl oynanır?", answer: "Bir zorluk seviyesi seç, Süper Lig'den bir futbolcu tahmin et ve kulüp, milliyet, pozisyon, yaş ve ayak ipuçlarını kullanarak gizli oyuncuyu bul." },
];

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const en = locale === "en";
  return {
    title: en ? "Süper Lig Guess the Player Game | FootBattle" : "Süper Lig Futbolcu Tahmin Oyunu – Guess the Player | FootBattle",
    description: en
      ? "Play Süper Lig Guess the Player free. Guess active footballers in Turkey's Süper Lig from club, nationality, position, age and foot clues."
      : "Süper Lig futbolcu tahmin oyunu oyna. Aktif Süper Lig oyuncularını kulüp, milliyet, pozisyon, yaş ve ayak ipuçlarıyla bul. Ücretsiz Guess the Player.",
    keywords: en
      ? ["süper lig guess the player", "turkish super lig guess the player", "super lig football quiz"]
      : ["süper lig futbolcu tahmin oyunu", "guess the player süper lig", "süper lig tahmin etme oyunu", "süper lig futbolcuyu tahmin et", "süper lig futbolcu bulmaca"],
    alternates: {
      canonical: `${SITE_URL}/${locale}/guess-the-player/super-lig`,
      languages: { tr: `${SITE_URL}/tr/guess-the-player/super-lig`, en: `${SITE_URL}/en/guess-the-player/super-lig`, "x-default": `${SITE_URL}/tr/guess-the-player/super-lig` },
    },
  };
}

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ difficulty?: string }> }) {
  const { locale } = await params;
  const { difficulty } = await searchParams;
  if (!isLocale(locale)) notFound();

  const en = locale === "en";
  const description = en
    ? "Play Süper Lig Guess the Player free and identify active footballers in Turkey's top league from football clues."
    : "Süper Lig futbolcu tahmin oyunu oyna ve aktif Süper Lig oyuncularını kulüp, milliyet, pozisyon, yaş ve ayak ipuçlarından bul.";
  const selectedDifficulty = DIFFICULTIES.some((item) => item.key === difficulty) ? (difficulty as DifficultyKey) : null;
  const selectedDifficultyItem = selectedDifficulty ? DIFFICULTIES.find((item) => item.key === selectedDifficulty) ?? null : null;

  return (
    <div className="min-h-screen bg-[#07111f] text-white" data-game="guess-the-player-super-lig">
      <GameJsonLd name={en ? "Süper Lig Guess the Player" : "Süper Lig Futbolcu Tahmin Oyunu"} description={description} path={`/${locale}/guess-the-player/super-lig`} inLanguage={en ? "en-US" : "tr-TR"} />

      {!selectedDifficulty ? (
        <section className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8">
          <div className="rounded-3xl border border-red-400/20 bg-gradient-to-r from-red-500/10 to-white/[0.03] p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-red-300">🇹🇷 {en ? "SÜPER LİG GUESS THE PLAYER" : "SÜPER LİG FUTBOLCU TAHMİN"}</p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">{en ? "Süper Lig Guess the Player" : "Süper Lig Futbolcu Tahmin Oyunu"}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              {en ? "Guess active Süper Lig footballers from player clues. Choose a difficulty to start." : "Aktif Süper Lig futbolcularını kulüp, milliyet, pozisyon, yaş ve ayak ipuçlarıyla tahmin et. Başlamak için zorluk seviyeni seç."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {DIFFICULTIES.map((item) => <Link key={item.key} href={`/${locale}/guess-the-player/super-lig?difficulty=${item.key}`} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-black text-slate-300 transition hover:border-red-300/30 hover:bg-red-500/10 hover:text-white">{item.icon} {en ? item.en : item.tr}</Link>)}
            </div>
            <p className="mt-3 text-xs text-slate-500">{en ? "Difficulty is based on player popularity: Easy 84+, Medium 68–83, Hard 50–67. Mixed uses all eligible active players." : "Zorluk oyuncu popülerliğine göre belirlenir: Kolay 84+, Orta 68–83, Zor 50–67. Karışık tüm uygun aktif oyuncuları kullanır."}</p>
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-6xl px-4 pt-3 sm:px-6 sm:pt-5">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-400/15 bg-red-500/[0.06] px-4 py-3">
            <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-300">🇹🇷 SÜPER LİG</p><p className="mt-0.5 truncate text-sm font-black text-white">{en ? "Difficulty" : "Zorluk"}: {selectedDifficultyItem?.icon} {selectedDifficultyItem ? (en ? selectedDifficultyItem.en : selectedDifficultyItem.tr) : selectedDifficulty}</p></div>
            <Link href={`/${locale}/guess-the-player/super-lig`} className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-slate-300 transition hover:text-white">{en ? "Change" : "Değiştir"}</Link>
          </div>
        </section>
      )}

      {selectedDifficulty ? <LocalizedGuessThePlayer key={`super-lig-${selectedDifficulty}`} locale={locale as Locale} /> : (
        <section className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6"><div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-[#0c1929] p-6 text-center sm:p-8"><p className="text-4xl">🎯</p><h2 className="mt-3 text-xl font-black sm:text-2xl">{en ? "Choose difficulty to start" : "Süper Lig futbolcusunu tahmin etmeye başla"}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{en ? "Choose a difficulty above and your hidden Süper Lig player will be selected." : "Yukarıdan zorluk seçtiğinde gizli Süper Lig futbolcun seçilecek. Her tahmin yeni ipuçları vererek doğru oyuncuya yaklaşmanı sağlayacak."}</p></div></section>
      )}

      {en ? (
        <GeoAnswerSection title="What is Süper Lig Guess the Player?" summary="Süper Lig Guess the Player is FootBattle's free football guessing game focused on active players in Turkey's Süper Lig. Guess a player, compare the returned clues and narrow the possibilities until you identify the hidden footballer." howItWorks={["Choose Easy, Medium, Hard or Mixed difficulty.", "Guess a footballer and compare club, nationality, position, age and other clues.", "Use each clue to narrow the possibilities until you identify the hidden Süper Lig player."]} faqs={[{ question: "Which players can appear in Süper Lig Guess the Player?", answer: "The mode uses eligible active players from Turkey's Süper Lig rather than the broader footballer pool used by the standard mode." }, { question: "What difficulty levels are available?", answer: "Easy, Medium, Hard and Mixed are available. Difficulty is based on player popularity." }, { question: "Is Süper Lig Guess the Player free?", answer: "Yes. You can play free in a browser on FootBattle." }]} />
      ) : (
        <>
          <FAQJsonLd faqs={trFaqs} />
          <section className="mx-auto max-w-5xl px-4 pb-14 pt-8 sm:px-6" aria-labelledby="super-lig-geo-tr-title">
            <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
              <h2 id="super-lig-geo-tr-title" className="text-2xl font-black text-white sm:text-3xl">Süper Lig futbolcu tahmin oyunu nasıl oynanır?</h2>
              <p className="mt-4 max-w-3xl text-[15px] leading-7 text-slate-300 sm:text-base">FootBattle Süper Lig Futbolcu Tahmin Oyunu, aktif Süper Lig futbolcularını ipuçlarından bulduğun ücretsiz bir Guess the Player oyunudur. Bir futbolcu tahmin ettiğinde kulüp, milliyet, pozisyon, yaş ve ayak gibi bilgiler hedef oyuncuyla karşılaştırılır. Bu ipuçlarını birlikte kullanarak adayları ele ve gizli futbolcuyu mümkün olduğunca az denemede bul.</p>
              <h3 className="mt-7 text-lg font-black text-white">Süper Lig futbolcuyu tahmin et: 3 adım</h3>
              <ol className="mt-3 grid gap-3 sm:grid-cols-3">
                <li className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300"><span className="mr-2 font-black text-emerald-300">1.</span>Kolay, Orta, Zor veya Karışık zorluk seviyesini seç.</li>
                <li className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300"><span className="mr-2 font-black text-emerald-300">2.</span>Bir Süper Lig futbolcusu tahmin et; kulüp, milliyet, pozisyon, yaş ve ayak ipuçlarını karşılaştır.</li>
                <li className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300"><span className="mr-2 font-black text-emerald-300">3.</span>Doğru eşleşmeleri kullanarak seçenekleri daralt ve gizli futbolcuyu bul.</li>
              </ol>
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5"><h3 className="font-black text-white">Süper Lig'i ne kadar iyi tanıyorsun?</h3><p className="mt-2 text-sm leading-6 text-slate-300">Kolay mod daha popüler oyunculara odaklanırken Zor mod daha az bilinen aktif Süper Lig futbolcularıyla bilgini test eder. Karışık mod tüm uygun oyuncu havuzunu kullanır.</p><Link href={`/${locale}/super-lig`} className="mt-4 inline-flex text-sm font-black text-emerald-300 hover:text-emerald-200">Süper Lig fikstür ve puan durumuna git →</Link></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5"><h3 className="font-black text-white">Diğer futbolcu tahmin oyunları</h3><p className="mt-2 text-sm leading-6 text-slate-300">Süper Lig modundan sonra genel oyuncu havuzunda Guess the Player oynayabilir veya Football Wordle'da futbolcu soyadını harflerden çözebilirsin.</p><div className="mt-4 flex flex-wrap gap-3"><Link href={`/${locale}/guess-the-player`} className="text-sm font-black text-emerald-300 hover:text-emerald-200">Guess the Player →</Link><Link href={`/${locale}/wordle`} className="text-sm font-black text-emerald-300 hover:text-emerald-200">Football Wordle →</Link></div></div>
              </div>
              <div className="mt-8"><h3 className="text-lg font-black text-white">Sık sorulan sorular</h3><div className="mt-3 space-y-3">{trFaqs.map((faq) => <details key={faq.question} className="rounded-2xl border border-white/10 bg-black/20 p-4"><summary className="cursor-pointer font-bold text-white">{faq.question}</summary><p className="mt-3 text-sm leading-6 text-slate-300">{faq.answer}</p></details>)}</div></div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
