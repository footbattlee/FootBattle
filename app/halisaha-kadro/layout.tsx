import Link from "next/link";

import HalisahaMobileEnhancer from "@/components/halisaha/HalisahaMobileEnhancer";
import HalisahaShareButtonGuard from "@/components/halisaha/HalisahaShareButtonGuard";
import { createGameMetadata } from "@/lib/seo";

const title = "Halısaha Kadro Kurma | Ücretsiz Takım Oluşturucu | FootBattle";
const description = "Halısaha maçın için kadro oluştur. Oyuncuları ekle, takımları kur, dengele ve kadronu arkadaşlarınla tek link üzerinden paylaş.";

export const metadata = createGameMetadata({
  path: "/halisaha-kadro",
  title,
  description,
  keywords: ["halısaha kadro", "halısaha kadro kurma", "halısaha takım kurma", "halısaha kadro oluşturucu", "takım dengeleme"],
});

export default function HalisahaKadroLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      <HalisahaMobileEnhancer />
      <HalisahaShareButtonGuard />
      <section className="bg-[#07111f] px-5 pb-28 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-yellow-300">HALISAHA KADRO REHBERİ</p>
          <h2 className="mt-3 text-2xl font-black sm:text-3xl">Halısaha kadrosunu daha düzenli nasıl kurarsın?</h2>
          <div className="mt-4 space-y-4 text-[15px] leading-8 text-slate-300 sm:text-base">
            <p>Halısaha Kadro aracı, maç öncesinde oyuncuları tek listede toplamak ve takım dağılımını daha düzenli hazırlamak için tasarlandı. Oyuncuları ekledikten sonra kadroyu paylaşabilir, eksikleri tamamlayabilir ve maçtan önce kimin hangi takımda olacağını netleştirebilirsin.</p>
            <p>Dengeli takım kurarken yalnız oyuncu sayısına değil kaleci, savunma, orta saha ve hücum özelliklerine de dikkat etmek gerekir. Benzer seviyedeki oyuncuları iki tarafa dağıtmak, maçın baştan kopmasını engeller ve daha rekabetçi bir oyun çıkarır.</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="font-black text-yellow-300">Önce katılımı netleştir</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">Takım ayırmadan önce kesin gelecek oyuncuları belirlemek, son dakika değişikliklerinin dengeyi bozmasını azaltır.</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="font-black text-yellow-300">Takımları paylaş</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">Kadro hazır olduğunda bağlantıyı arkadaş grubuna göndererek herkesin maçtan önce takımını ve organizasyon bilgisini görmesini sağlayabilirsin.</p>
            </article>
          </div>
          <div className="mt-8 border-t border-white/10 pt-6">
            <h3 className="text-xl font-black">Maçı da FootBattle'da organize et</h3>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/halisaha-mac" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-yellow-300">Halısaha Maçı Oluştur</Link>
              <Link href="/halisaha-kadro-kurma" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-yellow-300">Kadro Kurma Rehberi</Link>
              <Link href="/futbol-oyunlari" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-yellow-300">Futbol Oyunları</Link>
            </div>
          </div>
        </div>
      </section>
      <Link
        href="/halisaha-mac"
        className="fixed bottom-[max(16px,env(safe-area-inset-bottom))] right-4 z-50 hidden min-h-12 items-center gap-2 rounded-full border border-yellow-300/30 bg-yellow-400 px-5 py-3 text-sm font-black text-[#07111f] shadow-2xl shadow-black/40 transition hover:bg-yellow-300 sm:right-6 sm:inline-flex"
        aria-label="Yeni halısaha maçı oluştur"
      >
        ⚽ Maç Oluştur
      </Link>
    </>
  );
}
