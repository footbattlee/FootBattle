import Link from "next/link";
import GeoAnswerSection from "@/components/GeoAnswerSection";
import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const title = "Takım ve Millet Futbol Oyunu | Club Nation | FootBattle";
const description = "Verilen takım ve milliyet kesişimine uyan futbolcuyu bul. Kulüp ve ülke bilgisini test eden Club Nation futbol oyununu ücretsiz oyna.";

export const metadata = createGameMetadata({
  path: "/club-nation",
  title,
  description,
  keywords: ["takım millet futbol oyunu", "club nation", "futbolcu bulma oyunu", "futbol quiz", "kulüp ülke futbolcu"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <section className="bg-[#07111f] px-5 pb-14 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-300">CLUB NATION REHBERİ</p>
          <h2 className="mt-3 text-2xl font-black sm:text-3xl">Kulüp ve ülke kesişiminden futbolcuyu bul</h2>
          <div className="mt-4 space-y-4 text-[15px] leading-8 text-slate-300 sm:text-base">
            <p>Club Nation'da iki bilgi aynı anda doğrudur: oyuncu verilen kulüpte forma giymiş olmalı ve belirtilen ülkeyi temsil etmelidir. Bu yüzden yalnız kulübün güncel kadrosunu düşünmek yerine geçmiş sezonları ve eski oyuncuları da hatırlamak gerekir.</p>
            <p>En iyi yöntem önce daha dar olan ipucunu seçmektir. Nadir bir milliyet veya kısa süreli bir kulüp kariyeri, çok geniş bir oyuncu havuzunu hızla küçültebilir. Transfer geçmişini hatırlamak özellikle zor eşleşmelerde avantaj sağlar.</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="font-black text-emerald-300">Güncel kadroyla sınırlı düşünme</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">Bir oyuncunun kulüpte bugün oynaması gerekmez. Eski transferler, kiralık dönemler ve kısa süreli maceralar da doğru cevabı oluşturabilir.</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="font-black text-emerald-300">Kesişimi sistemli daralt</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">Önce ülkeye uyan bilinen isimleri düşün, ardından hangilerinin ilgili kulüpte oynadığını kontrol et. Zor sorularda tersinden ilerlemek de işe yarar.</p>
            </article>
          </div>
          <div className="mt-8 border-t border-white/10 pt-6">
            <h3 className="text-xl font-black">Futbol hafızanı başka formatlarda test et</h3>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/player-quiz" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-emerald-300">Player Quiz</Link>
              <Link href="/futbol-tic-tac-toe" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-emerald-300">Futbol Tic Tac Toe</Link>
              <Link href="/futbol-oyunlari" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-emerald-300">Tüm Futbol Oyunları</Link>
            </div>
          </div>
        </div>
      </section>
      <GeoAnswerSection
        title="What is Club Nation?"
        summary="Club Nation is a free football player guessing game on FootBattle. You are given a club and a nationality, and your task is to name a footballer who matches both conditions by having played for that club and represented that country."
        howItWorks={[
          "Read the club and nationality shown for the challenge.",
          "Think of current or former players who connect the two clues.",
          "Submit a footballer who has played for the club and represents the required nation.",
        ]}
        faqs={[
          {
            question: "Does the player need to be at the club right now?",
            answer: "No. Former players and past spells can count, so transfer history and older squads can be useful when solving Club Nation.",
          },
          {
            question: "What knowledge helps most in Club Nation?",
            answer: "Knowing club histories, international players and transfers helps you find footballers who connect a club with a specific nationality.",
          },
          {
            question: "Is Club Nation free to play?",
            answer: "Yes. Club Nation can be played for free in the browser on FootBattle.",
          },
        ]}
      />
      <GameJsonLd name="Club Nation" description={description} path="/club-nation" />
    </>
  );
}
