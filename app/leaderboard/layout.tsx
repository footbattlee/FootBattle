import Link from "next/link";
import { createGameMetadata } from "@/lib/seo";

const title = "FootBattle Liderlik Tablosu | Futbol Oyunları Sıralaması";
const description = "FootBattle oyuncularının XP, seviye ve oyun performansına göre sıralandığı liderlik tablosunu gör ve kendi sıranı yükselt.";

export const metadata = createGameMetadata({
  path: "/leaderboard",
  title,
  description,
  keywords: ["futbol oyunları liderlik", "FootBattle leaderboard", "futbol quiz sıralama", "futbol oyunları puan"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <section className="bg-[#07111f] px-5 pb-14 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-300">FOOTBATTLE SIRALAMASI</p>
          <h2 className="mt-3 text-2xl font-black sm:text-3xl">Liderlik tablosu neyi gösterir?</h2>
          <div className="mt-4 space-y-4 text-[15px] leading-8 text-slate-300 sm:text-base">
            <p>Liderlik tablosu, FootBattle içindeki oyunlarda kazanılan ilerlemeyi tek yerde karşılaştırmak için kullanılır. XP ve seviye bilgileri oyuncunun yalnız tek bir turdaki sonucunu değil, platformdaki genel oyun aktivitesini ve performansını temsil eder.</p>
            <p>Sıralama zaman içinde değişebilir. Yeni oyunlar oynadıkça, görevleri tamamladıkça ve puan kazandıkça kendi konumunu yükseltebilirsin. Bu nedenle tabloyu tek seferlik bir skor listesi yerine devam eden rekabetin özeti olarak düşünmek daha doğrudur.</p>
          </div>
          <div className="mt-8 border-t border-white/10 pt-6">
            <h3 className="text-xl font-black">Puan toplamak için oyunlara dön</h3>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/futbol-oyunlari" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-emerald-300">Tüm Futbol Oyunları</Link>
              <Link href="/player-quiz" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-emerald-300">Player Quiz</Link>
              <Link href="/transfer-quiz" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-emerald-300">Transferi Bil</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
