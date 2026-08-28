import Link from "next/link";
import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const title = "Futbolcu Kariyer Tahmin Oyunu | Career Path | FootBattle";
const description = "Futbolcunun kariyerindeki kulüpleri bul. Career Path futbol oyununda transfer geçmişini ve kulüp hafızanı test et.";

export const metadata = createGameMetadata({
  path: "/career-path",
  title,
  description,
  keywords: ["futbolcu kariyer tahmin", "career path football", "futbol transfer oyunu", "futbol quiz", "oyuncu kariyeri"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <GameJsonLd name="Career Path" description={description} path="/career-path" />
      <section className="bg-[#07111f] px-5 pb-12 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-300">CAREER PATH REHBERİ</p>
          <h2 className="mt-3 text-2xl font-black sm:text-3xl">Career Path nasıl oynanır?</h2>
          <div className="mt-4 space-y-4 text-[15px] leading-8 text-slate-300 sm:text-base">
            <p>Career Path'te ekranda verilen futbolcunun kariyerinde forma giydiği kulüpleri bulmaya çalışırsın. Kulüp adını aratıp doğru seçimi yaptığında ilgili takım kariyer sırasındaki yerine yerleşir. Amaç oyuncunun kulüp geçmişini mümkün olduğunca az hatayla tamamlamaktır.</p>
            <p>Oyun varsayılan olarak beş yanlış tahmin hakkı sunar. Hiç hata yapmadan tamamlanan bir tur daha yüksek puan getirirken yanlış sayısı arttıkça alınabilecek puan düşer. Bu yüzden büyük kulüpleri hatırlamanın yanında oyuncunun kısa dönemlerini, kiralık transferlerini ve farklı liglerdeki duraklarını da düşünmek önemlidir.</p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="font-black text-emerald-300">Hangi bilgi daha çok işe yarar?</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">Transfer geçmişi, oynadığı ligler ve kariyerindeki kulüpler arasında kurduğun bağlantılar en güçlü ipuçlarıdır. Özellikle bir oyuncunun hangi sırayla hangi takımlara geçtiğini hatırlamak oyunu hızlandırır.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="font-black text-emerald-300">Puan nasıl etkilenir?</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">Career Path'te skor yanlış tahmin sayısına göre azalır. İlk hedef yalnızca tüm kulüpleri bulmak değil, bunu mümkün olduğunca temiz bir turla tamamlamaktır.</p>
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <h3 className="text-xl font-black">Transfer hafızanı başka oyunlarda da kullan</h3>
            <p className="mt-2 text-sm leading-7 text-slate-400">Career Path'te kulüpleri hatırladıktan sonra aynı futbol bilgisini farklı formatlarda test edebilirsin.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/transfer-quiz" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-emerald-300">Transferi Bil</Link>
              <Link href="/guess-the-player" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-emerald-300">Guess The Player</Link>
              <Link href="/wordle" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-emerald-300">Futbol Wordle</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
