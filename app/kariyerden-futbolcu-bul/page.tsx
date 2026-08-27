import SeoLandingPage from "@/components/SeoLandingPage";
import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const description = "Kulüp kariyerinden futbolcuyu tahmin et. Career Path oyununda futbolcunun oynadığı takımları sırayla gör, doğru ismi bul ve futbol hafızanı test et.";

export const metadata = createGameMetadata({
  path: "/kariyerden-futbolcu-bul",
  title: "Kariyerden Futbolcu Bul Oyunu | FootBattle",
  description,
  keywords: ["kariyerden futbolcu bul", "futbolcu kariyer tahmin", "career path futbol", "kulüplerden futbolcu tahmin", "futbolcu bulmaca"],
});

export default function Page() {
  return <>
    <GameJsonLd name="Kariyerden Futbolcu Bul" description={description} path="/kariyerden-futbolcu-bul" />
    <SeoLandingPage
      eyebrow="Kulüpleri takip et, oyuncuyu bul"
      title="Kariyerden Futbolcu Bul"
      intro="Bir futbolcunun forma giydiği kulüpler kariyer sırasıyla karşında. Transfer geçmişini ve futbol hafızanı kullanarak doğru oyuncuyu mümkün olduğunca erken tahmin et."
      ctaHref="/tr/career-path"
      ctaLabel="Career Path Oyna 🧭"
      sections={[
        { title: "Career Path nasıl çalışır?", paragraphs: ["Oyuncunun kariyerindeki kulüpler ipucu olarak gösterilir. Takımların sırası, ligler ve dönemler doğru futbolcuya ulaşmanda yardımcı olur.", "Futbolcuyu ne kadar az ipucuyla bulursan o kadar güçlü bir futbol hafızasına sahip olduğunu gösterirsin."] },
        { title: "Kariyer sırasını ipucuna çevir", paragraphs: ["Aynı kulüplerde oynamış çok sayıda futbolcu olabilir; bu yüzden yalnızca takım isimlerini değil, hangi kulübün önce ve hangisinin sonra geldiğini düşünmek önemlidir. Bir oyuncunun yerel ligden Avrupa'ya çıkışı, büyük bir kulüpten kiralık ayrılışı veya kariyerinin son bölümündeki rota doğru isme ulaşmanı kolaylaştırabilir.", "İlk kulüpler genellikle oyuncunun yetiştiği veya profesyonel kariyerine başladığı dönemi düşündürürken sonraki adımlar transfer geçmişini daraltır. Bir rotayı tamamen hatırlamıyor olsan bile lig ve ülke değişimlerini ilişkilendirerek adayları azaltabilirsin."] },
        { title: "Transfer hafızanı test et", paragraphs: ["Büyük yıldızların yanında farklı liglerde iz bırakmış oyuncuların kariyer yolları da zorlayıcı olabilir. Özellikle birden fazla ülkede oynayan futbolcular oyunu daha eğlenceli hale getirir."], bullets: ["Kulüp geçmişi", "Transfer rotası", "Lig değişimleri", "Eski ve güncel futbolcular"] },
        { title: "Hızlı tahmin için nelere dikkat edebilirsin?", paragraphs: ["Kariyer yolunda nadir görülen bir kulüp, sıra dışı bir lig geçişi veya çok bilinen bir transfer rotası güçlü ipucu olabilir. Her kulübü tek tek ezberlemek yerine rotanın karakteristik bölümünü yakalamaya çalışmak daha hızlı tahmin yapmanı sağlar.", "Bir isim aklına geldiğinde kariyer sırasını zihninde kontrol etmek de yanlış tahminleri azaltır. Oyunun temel amacı kulüp listesini okumaktan ziyade futbolcunun kariyer hikâyesini hatırlamaktır."] },
        { title: "Diğer tahmin oyunlarıyla devam et", paragraphs: ["Career Path turundan sonra Guess The Player, Wordle veya Player Quiz ile aynı futbol bilgisini farklı formatlarda test edebilirsin. Günlük görevde birden fazla oyun tamamlayarak arena puanı da kazanabilirsin."] }
      ]}
      faqs={[
        { question: "Career Path oyunu nedir?", answer: "Bir futbolcunun kariyerindeki kulüpleri ipucu olarak görüp futbolcunun kim olduğunu tahmin ettiğin bir futbol oyunudur." },
        { question: "Kulüpler sıralı mı gösterilir?", answer: "Evet. Kariyer yolu, oyuncunun kulüp geçmişini anlamanı kolaylaştıracak şekilde kullanılır." },
        { question: "Kariyer sırası neden önemli?", answer: "Aynı takımlarda oynamış farklı futbolcular olabilir. Kulüplerin kariyer içindeki sırası, doğru oyuncuyu ayırt etmek için ek bir ipucu sağlar." },
        { question: "Ücretsiz oynanır mı?", answer: "Evet. FootBattle'daki ana tahmin oyunlarını tarayıcıdan ücretsiz oynayabilirsin." }
      ]}
      relatedLinks={[
        { href: "/futbolcu-tahmin-oyunu", label: "Futbolcu Tahmin Oyunu", description: "Özelliklerden gizli futbolcuyu bul." },
        { href: "/football-wordle", label: "Football Wordle", description: "Futbolcu soyadını harflerden çöz." },
        { href: "/transfer-quiz", label: "Transferi Bil", description: "Kulüp ve transfer ipuçlarından futbolcuyu tahmin et." }
      ]}
    />
  </>;
}
