import Link from "next/link";

import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const title = "Transferi Bil | Futbol Transfer Tahmin Oyunu | FootBattle";
const description = "Eski kulüp, yeni kulüp, transfer ücreti ve sezon ipuçlarından futbolcuyu tahmin et. 2 dakikalık Transferi Bil oyununda transfer bilginle puan topla.";

export const metadata = createGameMetadata({
  path: "/transfer-quiz",
  title,
  description,
  keywords: [
    "transferi bil",
    "futbol transfer tahmin oyunu",
    "futbolcu transfer tahmin",
    "transfer quiz",
    "futbol transfer oyunu",
    "futbolcu tahmin oyunu",
    "football transfer quiz",
  ],
});

const faqs = [
  {
    question: "Transferi Bil nasıl oynanır?",
    answer: "Ekranda eski kulüp, yeni kulüp, transfer ücreti ve varsa sezon bilgisi gösterilir. Bu ipuçlarından transferi yapan futbolcuyu bulup arama alanından seçmen gerekir.",
  },
  {
    question: "Bir tur ne kadar sürer?",
    answer: "Standart Transferi Bil turu 2 dakika sürer. Süre dolana kadar mümkün olduğunca fazla doğru transfer bulmaya çalışırsın.",
  },
  {
    question: "Pas hakkı var mı?",
    answer: "Evet. Standart turda 5 pas hakkı bulunur. Zorlandığın transferi pas geçerek yeni bir soruya geçebilirsin.",
  },
  {
    question: "Doğru cevap kaç puan kazandırır?",
    answer: "Standart oyunda her doğru cevap 20 puan kazandırır. Oyun ekranındaki puan alanından tur boyunca toplam skorunu takip edebilirsin.",
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <>
      {children}
      <section className="bg-[#07111f] px-5 pb-16 text-white sm:px-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        <div className="mx-auto max-w-5xl space-y-8">
          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-300">Futbol transfer hafızanı test et</p>
            <h2 className="mt-3 text-2xl font-black sm:text-3xl">Transferi Bil nasıl oynanır?</h2>
            <div className="mt-5 space-y-4 text-[15px] leading-8 text-slate-300 sm:text-base">
              <p>
                Transferi Bil, bir futbolcunun adını doğrudan vermek yerine transfer geçmişinden ipuçları sunan hızlı bir futbol tahmin oyunudur. Her soruda futbolcunun ayrıldığı eski kulübü ve gittiği yeni kulübü görürsün. Buna transfer ücreti ve veri mevcutsa transfer sezonu da eklenir. Görevin, bu bilgileri bir araya getirip transferi yapan futbolcuyu süre bitmeden bulmaktır.
              </p>
              <p>
                Oyuncu arama alanına en az üç harf yazarak aday futbolcuları görüntüleyebilirsin. Seçtiğin isim doğruysa puan kazanır ve yeni transfere geçersin. Yanlış seçim oyunu bitirmez; aynı soruda yeniden düşünebilir, başka bir futbolcu deneyebilir veya pas hakkını kullanabilirsin. Bu yapı yalnızca yıldız oyuncuları bilmekten çok kulüp geçmişini, transfer dönemlerini ve futbol piyasasını ne kadar hatırladığını ölçer.
              </p>
            </div>
          </article>

          <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
              <h2 className="text-2xl font-black">2 dakikada mümkün olduğunca çok doğru</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-8 text-slate-300">
                <p>
                  Standart bir tur 120 saniye sürer. Her doğru cevap 20 puan getirir ve süre devam ederken sıradaki transfer otomatik olarak açılır. Bu nedenle tek bir soruda çok uzun kalmak yerine bildiğin transferleri hızlı çözmek yüksek skor için önemlidir.
                </p>
                <p>
                  Ekrandaki süre, puan ve kalan pas göstergeleri tur boyunca durumunu takip etmeni sağlar. Süre bittiğinde doğru cevap sayın, kullandığın paslar ve toplam puanın sonuç ekranında gösterilir. İstersen aynı oyunu yeniden başlatıp kendi skorunu geliştirmeyi deneyebilirsin.
                </p>
              </div>
            </article>

            <article className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
              <h2 className="text-2xl font-black">Transfer ipuçlarını nasıl kullanmalısın?</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-8 text-slate-300">
                <p>
                  Eski ve yeni kulüp çoğu soruda en güçlü ipucudur. İki takım arasında doğrudan transfer yapan futbolcuları düşündükten sonra ücret bilgisi seçenekleri daraltabilir. Özellikle benzer dönemlerde aynı iki kulüp arasında birden fazla oyuncu hareket ettiyse sezon bilgisi ayırt edici hale gelir.
                </p>
                <p>
                  Transfer ücreti milyon euro formatında gösterilir. Buradaki amaç rakamı ezberlemek değil; transferin büyüklüğünü dönem ve kulüplerle birlikte yorumlamaktır. Ücretsiz veya farklı veri biçimindeki hareketlerden ziyade oyunda gösterilen soru verilerini kullanarak doğru oyuncuya ulaşman beklenir.
                </p>
              </div>
            </article>
          </div>

          <article className="rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.045] p-6 sm:p-8">
            <h2 className="text-2xl font-black">5 pas hakkını doğru zamanda kullan</h2>
            <div className="mt-4 space-y-4 text-[15px] leading-8 text-slate-300 sm:text-base">
              <p>
                Standart turda 5 pas hakkın vardır. Pas kullandığında mevcut transfer atlanır ve yeni soru gelir. Bu haklar özellikle hiç hatırlamadığın bir transferde süre kaybetmeni önlemek için değerlidir. Buna karşılık yalnızca birkaç saniye düşünerek çıkarabileceğin sorularda pası saklamak, turun son bölümünde daha fazla seçenek bırakır.
              </p>
              <p>
                Transferi Bil'in temel dengesi burada oluşur: hızlı hatırlama, doğru futbolcuyu arama ve sınırlı pas hakkını yönetme. Futbol gündemini ve geçmiş transferleri yakından takip eden oyuncular avantajlı olsa da kulüpler ile sezonları ilişkilendirmek de güçlü bir stratejidir.
              </p>
            </div>
          </article>

          <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
            <h2 className="text-2xl font-black">Sık sorulan sorular</h2>
            <div className="mt-5 space-y-3">
              {faqs.map((faq) => (
                <details key={faq.question} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <summary className="cursor-pointer font-black">{faq.question}</summary>
                  <p className="mt-3 leading-7 text-slate-300">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
            <h2 className="text-2xl font-black">Farklı futbol oyunlarıyla devam et</h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-300">
              Transfer geçmişi dışında kariyer yolu, futbolcu özellikleri veya genel futbol bilgisiyle kendini test etmek istersen FootBattle'ın diğer oyunlarına geçebilirsin.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/kariyerden-futbolcu-bul" className="rounded-xl border border-white/10 px-4 py-3 font-bold text-emerald-300 hover:bg-white/5">Kariyerden Futbolcu Bul</Link>
              <Link href="/futbolcu-tahmin-oyunu" className="rounded-xl border border-white/10 px-4 py-3 font-bold text-emerald-300 hover:bg-white/5">Futbolcu Tahmin Oyunu</Link>
              <Link href="/futbol-bilgi-yarismasi" className="rounded-xl border border-white/10 px-4 py-3 font-bold text-emerald-300 hover:bg-white/5">Futbol Bilgi Yarışması</Link>
              <Link href="/futbol-oyunlari" className="rounded-xl border border-white/10 px-4 py-3 font-bold text-emerald-300 hover:bg-white/5">Tüm Futbol Oyunları</Link>
            </div>
          </section>
        </div>
      </section>
      <GameJsonLd name="Transferi Bil" description={description} path="/transfer-quiz" />
    </>
  );
}
