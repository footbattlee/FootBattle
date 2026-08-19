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
        { title: "Transfer hafızanı test et", paragraphs: ["Büyük yıldızların yanında farklı liglerde iz bırakmış oyuncuların kariyer yolları da zorlayıcı olabilir. Özellikle birden fazla ülkede oynayan futbolcular oyunu daha eğlenceli hale getirir."], bullets: ["Kulüp geçmişi", "Transfer rotası", "Lig değişimleri", "Eski ve güncel futbolcular"] },
        { title: "Diğer tahmin oyunlarıyla devam et", paragraphs: ["Career Path turundan sonra Guess The Player, Wordle veya Player Quiz ile aynı futbol bilgisini farklı formatlarda test edebilirsin. Günlük görevde birden fazla oyun tamamlayarak arena puanı da kazanabilirsin."] }
      ]}
      faqs={[
        { question: "Career Path oyunu nedir?", answer: "Bir futbolcunun kariyerindeki kulüpleri ipucu olarak görüp futbolcunun kim olduğunu tahmin ettiğin bir futbol oyunudur." },
        { question: "Kulüpler sıralı mı gösterilir?", answer: "Evet. Kariyer yolu, oyuncunun kulüp geçmişini anlamanı kolaylaştıracak şekilde kullanılır." },
        { question: "Ücretsiz oynanır mı?", answer: "Evet. FootBattle'daki ana tahmin oyunlarını tarayıcıdan ücretsiz oynayabilirsin." }
      ]}
      relatedLinks={[
        { href: "/futbolcu-tahmin-oyunu", label: "Futbolcu Tahmin Oyunu", description: "Özelliklerden gizli futbolcuyu bul." },
        { href: "/football-wordle", label: "Football Wordle", description: "Futbolcu soyadını harflerden çöz." },
        { href: "/futbol-bilgi-yarismasi", label: "Futbol Bilgi Yarışması", description: "Futbol hafızanı farklı oyunlarla test et." }
      ]}
    />
  </>;
}
