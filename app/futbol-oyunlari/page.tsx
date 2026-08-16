import SeoLandingPage from "@/components/SeoLandingPage";
import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const description = "Ücretsiz futbol oyunları oyna: futbolcu tahmin, Football Wordle, futbol quiz, Tic Tac Toe, Career Path, Günün Kapışması ve Survivor tek yerde.";

export const metadata = createGameMetadata({
  path: "/futbol-oyunlari",
  title: "Ücretsiz Futbol Oyunları Oyna | FootBattle",
  description,
  keywords: ["futbol oyunları", "online futbol oyunları", "futbol quiz", "futbolcu tahmin", "football wordle", "futbol bilgi oyunu"],
});

export default function Page() {
  return (
    <>
      <GameJsonLd name="FootBattle Futbol Oyunları" description={description} path="/futbol-oyunlari" />
      <SeoLandingPage
        eyebrow="Futbolu biliyorsan kanıtla"
        title="Ücretsiz Futbol Oyunları"
        intro="FootBattle, futbol bilgisi ve arkadaş rekabetini kısa oyunlarda buluşturan bir futbol oyunları platformu. Futbolcu tahmin et, Wordle çöz, kariyer yolundan oyuncu bul, Tic Tac Toe oyna, kapışmalarda oy ver veya 16'lı Survivor turnuvasında kendi şampiyonunu çıkar."
        ctaHref="/"
        ctaLabel="Tüm Oyunları Gör ⚽"
        sections={[
          { title: "Futbolcu tahmin oyunları", paragraphs: ["Guess The Player, Football Wordle ve Career Path gibi oyunlarda hedef doğru futbolcuyu mümkün olduğunca hızlı bulmaktır. Her oyun farklı bir futbol bilgisini öne çıkarır. Guess The Player özellik karşılaştırmasına, Wordle harf bilgisine, Career Path ise kulüp geçmişine dayanır.", "Bu oyunların güçlü tarafı kısa sürmeleri ve tekrar oynanabilmeleridir. Bir tur bittiğinde başka futbolcuyla yeniden başlayabilir veya farklı bir oyun moduna geçebilirsin."], bullets: ["Guess The Player", "Football Wordle", "Career Path", "Transfer Quiz"] },
          { title: "Futbol bilgi ve kesişim oyunları", paragraphs: ["Player Quiz, Kulüp x Ülke ve Futbol Tic Tac Toe daha geniş futbol hafızası ister. Bir oyuncunun hangi kulüplerde oynadığını, hangi ülkeyi temsil ettiğini veya iki farklı kritere aynı anda uyup uymadığını bilmek avantaj sağlar.", "Tic Tac Toe formatında sadece doğru futbolcuyu bilmek yetmez; tahtadaki hamleni de planlaman gerekir. Bu da klasik quiz yapısına strateji ekler ve arkadaşlarla rekabeti daha eğlenceli hale getirir."] },
          { title: "Seçim ve tartışma oyunları", paragraphs: ["Günün Kapışması ve Survivor modlarında tek bir doğru cevap yoktur. Burada futbol zevkin devreye girer. Günün Kapışması iki futbolcu arasında seçim yaptırırken Survivor 16 katılımcıyı eleme usulü bir bracket içinde karşılaştırır.", "Bu oyunlar paylaşım için özellikle uygundur. 'Messi mi Ronaldo mu?', 'Hagi mi Alex mi?' veya 'Süper Lig efsanelerinin şampiyonu kim?' gibi tartışmalar arkadaş grubunda kolayca devam eder. Sonuç bağlantısını paylaşarak başkalarının da kendi tercihini yapmasını sağlayabilirsin."], bullets: ["Günün Kapışması", "Futbol Survivor", "Sonuç paylaşımı", "Arkadaşlarla karşılaştırma"] },
          { title: "Halısaha ve kadro araçları", paragraphs: ["FootBattle sadece quizlerden oluşmaz. Halısaha kadro kurma, maç planlama ve takım ayırma araçları gerçek maç organizasyonunu da kolaylaştırır. Oyuncuları tek listede toplamak, katılım durumunu görmek ve takım dağılımını paylaşmak için kullanılabilir.", "Böylece siteye yalnız oyun oynamak için değil, halısaha organizasyonu yapmak için de gelebilirsin. Maçtan önce arkadaşlarla bir futbol quiz açmak veya Günün Kapışması sonucunu tartışmak da işin eğlenceli tarafıdır."] }
        ]}
        faqs={[
          { question: "FootBattle'daki futbol oyunları ücretsiz mi?", answer: "Evet. Ana futbol oyunlarını tarayıcıdan ücretsiz oynayabilirsin." },
          { question: "Telefondan futbol oyunu oynanabilir mi?", answer: "Evet. FootBattle oyunları mobil tarayıcılar düşünülerek tasarlanmıştır." },
          { question: "Hangi futbol oyunları var?", answer: "Guess The Player, Player Quiz, Football Wordle, Career Path, Kulüp x Ülke, Tic Tac Toe, Transfer Quiz, Günün Kapışması ve Survivor gibi modlar bulunur." },
          { question: "Arkadaşlarımla oynayabilir miyim?", answer: "Bazı oyunlarda düello ve paylaşım özellikleri bulunur; ayrıca sonuç bağlantılarını arkadaşlarına gönderebilirsin." }
        ]}
        relatedLinks={[
          { href: "/futbolcu-tahmin-oyunu", label: "Futbolcu Tahmin Oyunu", description: "İpuçlarıyla gizli futbolcuyu bul." },
          { href: "/futbol-bilgi-yarismasi", label: "Futbol Bilgi Yarışması", description: "Futbol bilgini quiz formatında test et." },
          { href: "/halisaha-kadro-kurma", label: "Halısaha Kadro Kurma", description: "Gerçek maçın için kadro ve takım oluştur." }
        ]}
      />
    </>
  );
}
