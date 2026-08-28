import Link from "next/link";
import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const title = "Futbol Wordle | Football Wordle | FootBattle";
const description = "Gizli futbolcunun soyadını harf harf tahmin et. Football Wordle oyununu ücretsiz oyna, serini koru ve sonucunu arkadaşlarınla paylaş.";

export const metadata = createGameMetadata({
  path: "/wordle",
  title,
  description,
  keywords: ["futbol wordle", "football wordle", "soccer wordle", "futbolcu tahmin oyunu", "football guessing game"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <GameJsonLd name="Futbol Wordle" description={description} path="/wordle" />
      <section className="bg-[#07111f] px-5 pb-12 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-300">FUTBOL WORDLE REHBERİ</p>
          <h2 className="mt-3 text-2xl font-black sm:text-3xl">Futbol Wordle nasıl oynanır?</h2>
          <div className="mt-4 space-y-4 text-[15px] leading-8 text-slate-300 sm:text-base">
            <p>FootBattle Wordle'da hedef, gizli futbolcunun soyadını sınırlı sayıda denemede bulmaktır. Her tahminden sonra harfler sana yeni bilgi verir: doğru yerdeki harfler yeşil, kelimede olup farklı konumda bulunan harfler sarı, hedef soyadda bulunmayan harfler ise koyu renkle gösterilir.</p>
            <p>Oyun varsayılan olarak beş tahmin hakkıyla başlar. İlk denemelerde farklı harfler içeren futbolcu soyadlarını kullanmak daha fazla ipucu toplamana yardım eder. Sonraki tahminlerde doğru harflerin yerini koruyup kalan boşlukları futbolcu hafızanla tamamlayabilirsin.</p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="font-black text-emerald-300">Harf renkleri ne anlama geliyor?</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">Yeşil harf doğru konumu, sarı harf doğru harfin yanlış konumda olduğunu, koyu harf ise o harfin hedef soyadda bulunmadığını gösterir. Ekrandaki klavye de daha önce öğrendiğin bu bilgileri takip etmene yardımcı olur.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="font-black text-emerald-300">Tekrar oynanabilir mi?</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">Evet. Normal modda yeni bir futbolcuyla tekrar başlayabilirsin. Ayrıca FootBattle içindeki günlük görev akışında Wordle ayrı bir günlük oyun olarak da kullanılabilir.</p>
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <h3 className="text-xl font-black">Diğer futbol tahmin oyunları</h3>
            <p className="mt-2 text-sm leading-7 text-slate-400">Harf bulmacasından sonra futbolcunun özelliklerinden veya kariyerinden ilerleyen oyunlara geçebilirsin.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/guess-the-player" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-emerald-300">Guess The Player</Link>
              <Link href="/career-path" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-emerald-300">Career Path</Link>
              <Link href="/transfer-quiz" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-emerald-300">Transferi Bil</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
