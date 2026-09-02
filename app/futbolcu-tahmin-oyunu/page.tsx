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
          { title: "Futbolcu tahmin oyunu nasıl oynanır?", paragraphs: ["Oyuna başladığında gizli bir futbolcu seçilir. Sen oyuncu adını yazarak tahmin yaparsın; sistem tahmininle hedef oyuncunun özelliklerini karşılaştırır. Böylece yanlış tahmin bile yeni bir ipucu üretir ve bir sonraki hamleni planlamanı sağlar.", "Amaç rastgele isim yazmak değil, verilen bilgileri birlikte değerlendirmektir. Lig, takım, milliyet, yaş ve pozisyon gibi detaylar bir araya geldiğinde aday havuzu hızla daralır. Bu nedenle oyun hem futbol hafızasını hem de eleme mantığını kullanır."], bullets: ["Ücretsiz ve tarayıcıdan oynanır", "Mobil ve masaüstünde çalışır", "Her tur yeni futbolcu", "Sonucu arkadaşlarınla paylaşabilirsin"] },
          { title: "Daha iyi tahmin yapmak için taktikler", paragraphs: ["İlk tahminde çok bilinen ve farklı özellikleri kolay ayırt edilebilen bir futbolcu seçmek faydalıdır. Böylece gelen geri bildirim daha fazla seçenek elemeni sağlar. Sonraki denemelerde aynı özelliğe sahip isimleri tekrar etmek yerine elde ettiğin ipuçlarına göre yön değiştir.", "Futbolcu transferlerini, ligleri ve milli takımları takip edenler doğal olarak avantajlıdır; ancak oyun sadece ezbere dayanmaz. Birkaç tur sonra hangi bilgilerin daha değerli olduğunu öğrenerek daha sistemli tahminler yapmaya başlarsın."] },
          { title: "FootBattle'da tek tahmin oyunu bu değil", paragraphs: ["Futbolcu tahminini seviyorsan Player Quiz ile farklı kategorilerden oyuncu bulabilir, Football Wordle ile futbolcu soyadlarını çözebilir veya Career Path oyununda kulüp kariyerinden futbolcuyu yakalamaya çalışabilirsin.", "FootBattle'ın amacı kısa sürede açılan, tekrar oynanabilen ve arkadaşlarla paylaşılabilen futbol oyunlarını tek yerde toplamak. Bir tur bittiğinde başka bir moda geçerek futbol bilgini farklı şekilde test edebilirsin."] }
        ]}
        faqs={[
          { question: "Futbolcu tahmin oyunu ücretsiz mi?", answer: "Evet. FootBattle'daki Guess The Player oyununu tarayıcıdan ücretsiz oynayabilirsin." },
          { question: "Telefondan oynanabilir mi?", answer: "Evet. Oyun mobil ekranlara uyumludur ve uygulama indirmeden tarayıcıdan açılır." },
          { question: "Her oyunda aynı futbolcu mu geliyor?", answer: "Hayır. Oyun tekrar oynanabilecek şekilde farklı futbolcularla devam eder." }
        ]}
        relatedLinks={[
          { href: "/player-quiz", label: "Player Quiz", description: "Futbolcuyu farklı bilgi kategorilerinden bul." },
          { href: "/football-wordle", label: "Football Wordle", description: "Futbolcu soyadını harf harf çöz." },
          { href: "/kariyerden-futbolcu-bul", label: "Career Path", description: "Kulüp kariyerinden oyuncuyu tahmin et." }
        ]}
      />
    </>
  );
}
