import SeoLandingPage from "@/components/SeoLandingPage";
import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const description = "Ücretsiz futbolcu tahmin oyunu oyna. Kulüp, milliyet, yaş ve pozisyon ipuçlarıyla gizli futbolcuyu bul ve futbol bilgini test et.";

export const metadata = createGameMetadata({
  path: "/futbolcu-tahmin-oyunu",
  title: "Futbolcu Tahmin Oyunu Oyna | FootBattle",
  description,
  keywords: ["futbolcu tahmin oyunu", "futbolcu bulmaca", "guess the player", "futbol quiz", "futbol bilgi oyunu"],
});

export default function Page() {
  return (
    <>
      <GameJsonLd name="Futbolcu Tahmin Oyunu" description={description} path="/futbolcu-tahmin-oyunu" />
      <SeoLandingPage
        eyebrow="Futbol bilgin ne kadar iyi?"
        title="Futbolcu Tahmin Oyunu"
        intro="Bir futbolcuyu sadece ipuçlarından tanıyabilir misin? FootBattle Guess The Player oyununda yaptığın her tahmin seni doğru cevaba yaklaştırır. Kulüp, ülke, yaş, pozisyon ve diğer futbol bilgilerini okuyup gizli oyuncuyu mümkün olan en az denemede bul."
        ctaHref="/tr/guess-the-player"
        ctaLabel="Futbolcuyu Tahmin Et ⚽"
        sections={[
          { title: "Futbolcu tahmin oyunu nasıl oynanır?", paragraphs: ["Oyuna başladığında gizli bir futbolcu seçilir. Sen oyuncu adını yazarak tahmin yaparsın; sistem tahmininle hedef oyuncunun özelliklerini karşılaştırır. Böylece yanlış tahmin bile yeni bir ipucu üretir ve bir sonraki hamleni planlamanı sağlar.", "Amaç rastgele isim yazmak değil, verilen bilgileri birlikte değerlendirmektir. Lig, takım, milliyet, yaş ve pozisyon gibi detaylar bir araya geldiğinde aday havuzu hızla daralır. Bu nedenle oyun hem futbol hafızasını hem de eleme mantığını kullanır."], bullets: ["Ücretsiz ve tarayıcıdan oynanır", "Mobil ve masaüstünde çalışır", "Tekrar oynanabilir", "Sonucu arkadaşlarınla paylaşabilirsin"] },
          { title: "Daha iyi tahmin yapmak için taktikler", paragraphs: ["İlk tahminde çok bilinen ve farklı özellikleri kolay ayırt edilebilen bir futbolcu seçmek faydalıdır. Böylece gelen geri bildirim daha fazla seçenek elemeni sağlar. Sonraki denemelerde aynı özelliğe sahip isimleri tekrar etmek yerine elde ettiğin ipuçlarına göre yön değiştir.", "Futbolcu transferlerini, ligleri ve milli takımları takip edenler doğal olarak avantajlıdır; ancak oyun sadece ezbere dayanmaz. Birkaç tur sonra hangi bilgilerin daha değerli olduğunu öğrenerek daha sistemli tahminler yapmaya başlarsın."] },
          { title: "Süper Lig futbolcularını da tahmin et", paragraphs: ["Süper Lig odaklı Guess The Player modunda Türkiye ligindeki oyunculara yoğunlaşabilirsin. Genel oyuncu havuzundan farklı olarak bu mod, Süper Lig bilgini doğrudan test eder.", "Farklı format istersen Football Wordle ile futbolcu soyadlarını harflerden çözebilir veya Career Path oyununda kulüp kariyerinden oyuncuyu bulmaya çalışabilirsin."] }
        ]}
        faqs={[
          { question: "Futbolcu tahmin oyunu ücretsiz mi?", answer: "Evet. FootBattle'daki Guess The Player oyununu tarayıcıdan ücretsiz oynayabilirsin." },
          { question: "Telefondan oynanabilir mi?", answer: "Evet. Oyun mobil ekranlara uyumludur ve uygulama indirmeden tarayıcıdan açılır." },
          { question: "Süper Lig futbolcu tahmin oyunu var mı?", answer: "Evet. FootBattle'da Süper Lig oyuncularına odaklanan ayrı bir Guess The Player modu bulunur." }
        ]}
        relatedLinks={[
          { href: "/tr/guess-the-player/super-lig", label: "Süper Lig Futbolcu Tahmin", description: "Süper Lig oyuncularını ipuçlarından tahmin et." },
          { href: "/tr/wordle", label: "Football Wordle", description: "Futbolcu soyadını harf harf çöz." },
          { href: "/tr/career-path", label: "Career Path", description: "Kulüp kariyerinden oyuncuyu tahmin et." },
          { href: "/futbol-oyunlari", label: "Tüm Futbol Oyunları", description: "FootBattle'daki diğer ücretsiz futbol oyunlarını keşfet." }
        ]}
      />
    </>
  );
}
