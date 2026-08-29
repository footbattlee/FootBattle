import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";

const canonicalUrl = "https://playfootbattle.com/penalty";

export const metadata: Metadata = {
  title: "Şutör - Futbol Şut Oyunu | FootBattle",
  description:
    "Şutör'de topu geri ve yana çek, hedefini belirle, kaleciyi geç ve 10 şutta en yüksek skoru yap. FootBattle'ın ücretsiz futbol şut oyununu hemen oyna.",
  keywords: ["şut oyunu", "futbol şut oyunu", "kaleci oyunu", "futbol oyunu", "şutör", "shot challenge", "football shooting game", "soccer shooting game", "FootBattle"],
  alternates: { canonical: canonicalUrl },
  openGraph: {
    type: "website",
    url: canonicalUrl,
    siteName: "FootBattle",
    title: "Şutör - Shot Challenge | FootBattle",
    description: "Topu geri çek, köşeyi seç ve kaleciyi geç. 10 şutta skorunu yükselt ve FootBattle Şutör'de refleksini göster.",
    images: [{ url: "https://playfootbattle.com/footbattle-logo.png", width: 1200, height: 630, alt: "FootBattle Şutör - Shot Challenge" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Şutör - Shot Challenge | FootBattle",
    description: "10 şutta kaleciyi geç, köşeleri hedefle ve en yüksek skoru yap.",
    images: ["https://playfootbattle.com/footbattle-logo.png"],
  },
  robots: { index: true, follow: true },
};

const gameStructuredData = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  name: "Şutör",
  alternateName: ["Shot Challenge", "FootBattle Şutör"],
  url: canonicalUrl,
  description: "FootBattle Şutör, oyuncunun topu geri ve yana çekerek hedef belirlediği, kaleciyi geçmeye çalıştığı 10 şutluk ücretsiz futbol şut oyunudur.",
  applicationCategory: "Game",
  gamePlatform: ["Web", "Android", "Mobile"],
  genre: ["Football", "Sports", "Casual"],
  inLanguage: ["tr", "en"],
  isAccessibleForFree: true,
  publisher: { "@type": "Organization", name: "FootBattle", url: "https://playfootbattle.com" },
};

export default function PenaltyLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(gameStructuredData) }} />
      {children}
      <section className="bg-[#06152b] px-5 pb-14 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-200">ŞUTÖR REHBERİ</p>
          <h2 className="mt-3 text-2xl font-black sm:text-3xl">10 şutta en yüksek skoru nasıl yaparsın?</h2>
          <div className="mt-4 space-y-4 text-[15px] leading-8 text-slate-300 sm:text-base">
            <p>Şutör'de her tur 10 vuruştan oluşur. Topu sürükleyerek hedefini belirlersin; kaleci de şut yönünü okumaya çalışır. Amaç yalnız gol atmak değil, seri yakalayıp yüksek değerli köşe vuruşlarıyla toplam puanı büyütmektir.</p>
            <p>Köşelere giden şutlar daha risklidir ancak başarılı olduğunda ek puan getirir. Art arda goller seri bonusunu yükseltir; kurtarılan bir şut ise seriyi sıfırlar. Bu nedenle her vuruşta risk ile güvenli bitiriş arasında seçim yaparsın.</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="font-black text-cyan-200">Aynı köşeyi sürekli kullanma</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">Tek bir bölgeye bağlı kalmak yerine sağ, sol ve merkez arasında şut dağılımını değiştirmek daha dengeli bir stratejidir.</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="font-black text-cyan-200">Seri bonusunu koru</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">Yüksek skor hedefliyorsan yalnız en zor köşeleri denemek yerine seri devam ederken daha kontrollü vuruşlar tercih edebilirsin.</p>
            </article>
          </div>
          <div className="mt-8 border-t border-white/10 pt-6">
            <h3 className="text-xl font-black">Başka futbol oyunlarına geç</h3>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/futbol-oyunlari" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-cyan-200">Tüm Futbol Oyunları</Link>
              <Link href="/player-quiz" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-cyan-200">Player Quiz</Link>
              <Link href="/transfer-quiz" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-cyan-200">Transferi Bil</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
