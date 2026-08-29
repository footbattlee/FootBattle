import Link from "next/link";

import ClubClashCompletionTracker from "@/components/analytics/ClubClashCompletionTracker";
import ClubClashGame from "@/components/games/ClubClashGame";
import ClubClashResultFocus from "@/components/mobile/ClubClashResultFocus";
import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const title = "Club Clash | İki Kulüpte Oynayan Futbolcuyu Bul | FootBattle";
const description = "İki kulüpte de forma giymiş futbolcuyu bul. Club Clash'te transfer ve kariyer hafızanı kullan, süre dolmadan mümkün olduğunca çok doğru cevap ver.";

export const metadata = createGameMetadata({
  path: "/club-clash",
  title,
  description,
  keywords: [
    "club clash",
    "iki kulüpte oynayan futbolcu",
    "futbolcu kariyer oyunu",
    "futbol transfer oyunu",
    "futbolcu bulma oyunu",
  ],
});

export default function Page() {
  return (
    <>
      <div data-game="club-clash">
        <ClubClashCompletionTracker />
        <ClubClashResultFocus />
        <ClubClashGame />
      </div>

      <section className="bg-[#07111f] px-5 pb-16 text-white sm:px-8">
        <div className="mx-auto max-w-5xl space-y-7">
          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-300">CLUB CLASH REHBERİ</p>
            <h2 className="mt-3 text-2xl font-black sm:text-3xl">İki kulübün ortak futbolcusunu nasıl bulursun?</h2>
            <div className="mt-4 space-y-4 text-[15px] leading-8 text-slate-300 sm:text-base">
              <p>
                Club Clash'te her turda iki kulüp gösterilir. Doğru cevap, kariyerinin herhangi bir döneminde iki takımın da formasını giymiş bir futbolcudur. Güncel kadrolarla sınırlı kalmadan eski transferleri, kiralık dönemleri ve kısa süreli kulüp maceralarını hatırlamak gerekir.
              </p>
              <p>
                Tur süreli olduğu için önce iki kulüp arasındaki doğrudan transferleri düşünmek hızlı sonuç verir. Aklına isim gelmiyorsa takımlardan birinin geçmiş kadrosunu zihninde tarayıp diğer kulüple kesişen oyuncuları elemek daha sistemli bir yöntemdir.
              </p>
            </div>
          </article>

          <div className="grid gap-5 md:grid-cols-2">
            <article className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
              <h3 className="text-xl font-black text-emerald-300">Transfer zincirlerini hatırla</h3>
              <p className="mt-3 leading-7 text-slate-300">
                Büyük kulüpler arasında doğrudan transferler güçlü ipucudur; fakat cevap her zaman doğrudan transfer olmak zorunda değildir. Oyuncu iki takımda farklı yıllarda oynamış olabilir.
              </p>
            </article>
            <article className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
              <h3 className="text-xl font-black text-emerald-300">Pas hakkını zor eşleşmelere sakla</h3>
              <p className="mt-3 leading-7 text-slate-300">
                Hiç bağlantı kuramadığın eşleşmede uzun süre kalmak yerine pas kullanmak, bildiğin sorulara daha fazla süre bırakır. Hedef tek soruyu çözmek değil tur boyunca toplam skoru yükseltmektir.
              </p>
            </article>
          </div>

          <article className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
            <h3 className="text-xl font-black">Benzer futbol oyunları</h3>
            <p className="mt-3 max-w-3xl leading-7 text-slate-300">
              Kulüp geçmişi ve oyuncu kariyerleri hoşuna gidiyorsa Career Path ve Transferi Bil ile aynı bilgiyi farklı formatlarda test edebilirsin.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/career-path" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-emerald-300">Career Path</Link>
              <Link href="/transfer-quiz" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-emerald-300">Transferi Bil</Link>
              <Link href="/club-nation" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-emerald-300">Club Nation</Link>
              <Link href="/futbol-oyunlari" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-emerald-300">Tüm Futbol Oyunları</Link>
            </div>
          </article>
        </div>
      </section>

      <GameJsonLd name="Club Clash" description={description} path="/club-clash" />
    </>
  );
}
