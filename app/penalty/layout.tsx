import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./keeper-tuning.css";

const canonicalUrl = "https://playfootbattle.com/penalty";

export const metadata: Metadata = {
  title: "Penaltı Oyunu - Şut Çek, Kaleci Ol ve Arkadaşınla Oyna | FootBattle",
  description:
    "FootBattle Penaltı'da penaltı at, kaleci olarak doğru köşeye uç veya arkadaşınla aynı cihazda penaltı düellosu yap. Ücretsiz futbol penaltı oyununu hemen oyna.",
  keywords: [
    "penaltı oyunu",
    "futbol penaltı oyunu",
    "kaleci oyunu",
    "penaltı atma oyunu",
    "arkadaşla futbol oyunu",
    "penalty game",
    "football penalty game",
    "soccer penalty game",
    "FootBattle",
  ],
  alternates: { canonical: canonicalUrl },
  openGraph: {
    type: "website",
    url: canonicalUrl,
    siteName: "FootBattle",
    title: "Penaltı Oyunu | FootBattle",
    description:
      "Penaltı at, kaleci ol veya arkadaşınla aynı cihazda düello yap. Hızlı karar ver, doğru köşeyi seç ve serini büyüt.",
    images: [
      {
        url: "https://playfootbattle.com/footbattle-logo.png",
        width: 1200,
        height: 630,
        alt: "FootBattle Penaltı Oyunu",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Penaltı Oyunu | FootBattle",
    description: "Penaltı at, kaleci ol veya arkadaşınla penaltı düellosu yap.",
    images: ["https://playfootbattle.com/footbattle-logo.png"],
  },
  robots: { index: true, follow: true },
};

const gameStructuredData = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  name: "FootBattle Penaltı",
  alternateName: ["FootBattle Penalty", "Penaltı Oyunu"],
  url: canonicalUrl,
  description:
    "FootBattle Penaltı; penaltı atma, kaleci olma ve aynı cihazda arkadaşla penaltı düellosu modları sunan ücretsiz bir futbol oyunudur.",
  applicationCategory: "Game",
  gamePlatform: ["Web", "Android", "Mobile"],
  genre: ["Football", "Sports", "Arcade", "Casual"],
  inLanguage: ["tr", "en"],
  isAccessibleForFree: true,
  numberOfPlayers: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2 },
  publisher: {
    "@type": "Organization",
    name: "FootBattle",
    url: "https://playfootbattle.com",
  },
};

export default function PenaltyLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(gameStructuredData) }}
      />
      {children}
      <section className="bg-[#06152b] px-5 pb-14 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-200">
            PENALTI REHBERİ
          </p>
          <h2 className="mt-3 text-2xl font-black sm:text-3xl">
            FootBattle Penaltı nasıl oynanır?
          </h2>

          <div className="mt-4 space-y-4 text-[15px] leading-8 text-slate-300 sm:text-base">
            <p>
              FootBattle Penaltı üç farklı oyun biçimi sunar: Penaltı At modunda kalecinin hareketini okuyup sol, orta veya sağ köşeyi seçersin; Kaleci Ol modunda şutörün ipucunu takip ederek doğru köşeye uçarsın; Arkadaşınla modunda ise aynı cihazı sırayla kullanarak penaltı düellosu oynarsın.
            </p>
            <p>
              Penaltı At modunda amaç yalnızca gol atmak değildir. Art arda başarılı vuruşlar seri oluşturur ve toplam skorunu yükseltir. Kaleci Ol modunda ise doğru zamanda doğru yönü seçmek kurtarış için belirleyicidir.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="font-black text-cyan-200">Penaltı At</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Kaleciyi gözlemle, sol, orta veya sağ köşeyi seç ve 10 şutta mümkün olduğunca çok gol at.
              </p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="font-black text-cyan-200">Kaleci Ol</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Şutörün verdiği kısa ipucunu oku ve top kaleye gelmeden önce doğru tarafa hamle yap.
              </p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="font-black text-cyan-200">Arkadaşınla Oyna</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Aynı cihazı paylaşın; bir oyuncu şut yönünü, diğeri kaleci yönünü gizlice seçsin ve sırayla yarışın.
              </p>
            </article>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
            <h3 className="text-xl font-black">Penaltıda daha iyi skor için ne yapmalısın?</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Tek bir köşeye bağlı kalma. Kalecinin hareketini takip et, seri devam ederken gereksiz risk alma ve özellikle Kaleci Ol modunda ipucuna rağmen son anda yön değiştirme ihtimalini hesaba kat. FootBattle Penaltı hızlı karar verme ve refleks üzerine kurulu bir arcade futbol oyunudur.
            </p>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <h3 className="text-xl font-black">Başka futbol oyunlarına geç</h3>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/futbol-oyunlari"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-cyan-200"
              >
                Tüm Futbol Oyunları
              </Link>
              <Link
                href="/player-quiz"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-cyan-200"
              >
                Player Quiz
              </Link>
              <Link
                href="/transfer-quiz"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-cyan-200"
              >
                Transferi Bil
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
