import Link from "next/link";
import GeoAnswerSection from "@/components/GeoAnswerSection";
import { createGameMetadata, GameJsonLd } from "@/lib/seo";
import "./mobile.css";

const title = "Futbolcu Bilgi Yarışması | Player Quiz | FootBattle";
const description = "Futbolcunun ülkesi, kulüpleri, doğum yılı ve kariyer ipuçlarını kullanarak oyuncuyu bul. Ücretsiz futbol bilgi yarışmasını FootBattle'da oyna.";

export const metadata = createGameMetadata({
  path: "/player-quiz",
  title,
  description,
  keywords: ["futbolcu bilgi yarışması", "player quiz", "futbol quiz", "football quiz", "futbol bilgi oyunu"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="player-quiz-mobile-scope">
      {children}
      <section className="bg-[#07111f] px-5 pb-14 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-300">PLAYER QUIZ REHBERİ</p>
          <h2 className="mt-3 text-2xl font-black sm:text-3xl">Futbolcuyu bilgilerinden nasıl bulursun?</h2>
          <div className="mt-4 space-y-4 text-[15px] leading-8 text-slate-300 sm:text-base">
            <p>Player Quiz, tek bir isim tahmininden çok futbolcunun kariyerini parçalara ayırarak çözmeni ister. Doğum yılı, milliyet ve forma giydiği kulüpler ayrı alanlarda ilerler. Her doğru cevap tabloyu biraz daha tamamlar ve kalan seçenekleri daraltır.</p>
            <p>Yüksek skor için yalnız yıldız isimleri ezberlemek yeterli değildir. Oyuncunun hangi ülkeden olduğu, kariyerinde hangi kulüplerin bulunduğu ve yaş aralığı gibi bilgileri birlikte düşünmek gerekir. Bilmediğin bir alanı geçici olarak bırakıp daha güçlü olduğun kategoriden ilerleyebilirsin.</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="font-black text-emerald-300">Önce güçlü olduğun alanı çöz</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">Kulüp geçmişini iyi biliyorsan kulüplerden, milli takımları daha iyi hatırlıyorsan milliyetten başla. Doğru alanlar diğer cevapları tahmin ederken bağlam sağlar.</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="font-black text-emerald-300">Süre ve haklarını birlikte yönet</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">Her tahminde yalnız doğruluğa değil kalan süre ve haklara da bak. Emin olmadığın cevaplarda art arda rastgele denemeler yapmak yerine diğer ipuçlarından yeni bilgi toplamaya çalış.</p>
            </article>
          </div>
          <div className="mt-8 border-t border-white/10 pt-6">
            <h3 className="text-xl font-black">Benzer futbol oyunları</h3>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/futbolcu-tahmin-oyunu" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-emerald-300">Futbolcu Tahmin Oyunu</Link>
              <Link href="/transfer-quiz" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-emerald-300">Transferi Bil</Link>
              <Link href="/kariyerden-futbolcu-bul" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-emerald-300">Career Path Rehberi</Link>
            </div>
          </div>
        </div>
      </section>
      <GeoAnswerSection
        title="What is Player Quiz?"
        summary="Player Quiz is a free football trivia game on FootBattle where you identify a footballer by solving separate clues about birth year, nationality and club history. Each correct field reveals more of the player's profile and narrows the answer."
        howItWorks={[
          "Use the available footballer clues to decide which category you can solve first.",
          "Enter answers for birth year, nationality and the clubs from the player's career.",
          "Combine the solved fields until the footballer's identity becomes clear.",
        ]}
        faqs={[
          {
            question: "What does Player Quiz test?",
            answer: "Player Quiz tests knowledge of footballers' birth years, nationalities and club careers rather than relying on a single clue.",
          },
          {
            question: "Is Player Quiz free?",
            answer: "Yes. Player Quiz can be played for free in the browser on FootBattle.",
          },
          {
            question: "What is the best way to solve Player Quiz?",
            answer: "Start with the clue category you know best, then use every correct field to narrow the remaining possibilities instead of guessing randomly.",
          },
        ]}
      />
      <GameJsonLd name="Player Quiz" description={description} path="/player-quiz" />
    </div>
  );
}
