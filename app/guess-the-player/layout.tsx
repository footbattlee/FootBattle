import Link from "next/link";
import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const title = "Futbolcu Tahmin Oyunu | Guess The Player | FootBattle";
const description = "Kulüp, yaş, pozisyon, lig, milliyet ve ayak ipuçlarıyla gizli futbolcuyu tahmin et. Guess The Player oyununu ücretsiz oyna ve skorunu paylaş.";

export const metadata = createGameMetadata({
  path: "/guess-the-player",
  title,
  description,
  keywords: ["futbolcu tahmin oyunu", "guess the player", "football guessing game", "futbol quiz", "futbol bilgi oyunu"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <GameJsonLd name="Guess The Player" description={description} path="/guess-the-player" />
      <section className="bg-[#07111f] px-5 pb-12 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-300">GUESS THE PLAYER REHBERİ</p>
          <h2 className="mt-3 text-2xl font-black sm:text-3xl">Gizli futbolcuyu ipuçlarından nasıl bulursun?</h2>
          <div className="mt-4 space-y-4 text-[15px] leading-8 text-slate-300 sm:text-base">
            <p>Guess The Player'da bir futbolcu seçerek gizli oyuncuya ne kadar yaklaştığını görürsün. Milliyet, pozisyon, kulüp, lig, yaş ve tercih edilen ayak bilgileri karşılaştırılır. Doğru eşleşmeler ve yaş yönü gibi ipuçları sonraki tahminini daraltmana yardımcı olur.</p>
            <p>Oyun varsayılan olarak yedi tahmin hakkı sunar ve oyuncu araması için en az üç harf gerekir. Gizli futbolcuyu erken bulmak daha yüksek puan getirir; bu yüzden ilk tahminini mümkün olduğunca ayırt edici özelliklere sahip bir oyuncudan seçmek avantaj sağlar.</p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="font-black text-emerald-300">Renk ve oklar ne anlatır?</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">Doğru özellikler yeşil, kısmi yön bilgisi veren alanlar sarı, yanlış eşleşmeler kırmızı tonlarla gösterilir. Yaş bilgisindeki yukarı ve aşağı okları hedef futbolcunun daha yaşlı ya da daha genç olduğunu anlamak için kullanabilirsin.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="font-black text-emerald-300">İlk tahmin neden önemli?</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">Tek bir tahminde kulüp, lig, milliyet, pozisyon ve yaş hakkında bilgi toplarsın. Birbirinden farklı özelliklere sahip tanınmış oyuncularla başlamak arama alanını daha hızlı küçültebilir.</p>
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <h3 className="text-xl font-black">Başka bir formatta devam et</h3>
            <p className="mt-2 text-sm leading-7 text-slate-400">Oyuncuyu özelliklerden bulduktan sonra harf, kariyer veya transfer bilgisine dayalı oyunlara geçebilirsin.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/wordle" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-emerald-300">Futbol Wordle</Link>
              <Link href="/career-path" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-emerald-300">Career Path</Link>
              <Link href="/transfer-quiz" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-emerald-300">Transferi Bil</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
