import SeoLandingPage from "@/components/SeoLandingPage";
import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const description = "Futbol bilgi yarışması oyna; kulüp, ülke, kupa ve futbolcu bilgilerini kullanarak doğru oyuncuyu bul. Ücretsiz online futbol quiz.";

export const metadata = createGameMetadata({
  path: "/futbol-bilgi-yarismasi",
  title: "Futbol Bilgi Yarışması ve Futbol Quiz | FootBattle",
  description,
  keywords: ["futbol bilgi yarışması", "futbol quiz", "futbol testi", "football quiz", "futbol soruları"],
});

export default function Page() {
  return (
    <>
      <GameJsonLd name="Futbol Bilgi Yarışması" description={description} path="/futbol-bilgi-yarismasi" />
      <SeoLandingPage
        eyebrow="Quiz zamanı"
        title="Futbol Bilgi Yarışması"
        intro="Takımları, ülkeleri, kupaları ve futbolcuları gerçekten biliyor musun? FootBattle Player Quiz, klasik çoktan seçmeli test yerine futbol bilgisini kullanarak doğru oyuncuyu bulduğun daha etkileşimli bir quiz deneyimi sunar."
        ctaHref="/player-quiz"
        ctaLabel="Futbol Quiz'i Başlat 🧠"
        sections={[
          { title: "Futbol quiz nasıl çalışıyor?", paragraphs: ["Her turda hedef futbolcuyu bulmak için farklı bilgi türlerinden yararlanırsın. Kulüp geçmişi, milliyet, başarılar veya futbol kariyerine dair ipuçları doğru cevaba ulaşmana yardım eder. Buradaki amaç sadece bir soruya cevap vermek değil, futbol bilgilerini birbiriyle ilişkilendirmektir.", "Bu yapı oyunu hem hızlı hem tekrar oynanabilir hale getirir. Bir turda Avrupa futboluna dair bilgin öne çıkarken başka bir turda Süper Lig, milli takımlar veya kupalar daha değerli olabilir."], bullets: ["Kısa ve tekrar oynanabilir turlar", "Farklı futbol bilgi kategorileri", "Mobil uyumlu arayüz", "Arkadaşlarla skor paylaşımı"] },
          { title: "Futbol bilgisini nasıl geliştirebilirsin?", paragraphs: ["Futbol bilgisi sadece maç skorlarını hatırlamaktan ibaret değildir. Oyuncuların hangi kulüplerde forma giydiğini, hangi ülkeleri temsil ettiğini ve kariyerlerinde hangi başarıları elde ettiğini takip etmek büyük fark yaratır.", "Yanlış cevapları da öğrenme fırsatı olarak kullanabilirsin. Bilmediğin bir oyuncunun kariyerini gördüğünde sonraki oyunlarda aynı bilgi karşına çıktığında avantaj elde edersin. Böylece quiz oynadıkça futbol hafızan doğal biçimde genişler."] },
          { title: "Tek başına veya arkadaşlarınla kapış", paragraphs: ["FootBattle oyunları kısa süreli olduğu için arkadaş grubunda skor karşılaştırmak kolaydır. Quiz'i bitirdikten sonra başka bir oyun açabilir, aynı gün içinde Guess The Player, Wordle veya Tic Tac Toe gibi farklı modlarla devam edebilirsin.", "Daha rekabetçi bir deneyim istiyorsan düello ve paylaşım özelliklerini kullanarak arkadaşlarını oyuna çağırabilirsin. Böylece futbol bilgi yarışması yalnızca tek kişilik test olmaktan çıkar ve küçük bir kapışmaya dönüşür."] }
        ]}
        faqs={[
          { question: "Futbol bilgi yarışması ücretsiz mi?", answer: "Evet. FootBattle futbol quiz oyunlarını ücretsiz ve tarayıcı üzerinden oynayabilirsin." },
          { question: "Sorular sadece güncel futbolcularla mı ilgili?", answer: "Oyun moduna göre güncel ve geçmiş dönem futbolcularıyla karşılaşabilirsin." },
          { question: "Üye olmadan oynanır mı?", answer: "Temel oyunları misafir olarak oynayabilirsin; hesap açmak ilerleme ve sosyal özelliklerde ek avantaj sağlar." }
        ]}
        relatedLinks={[
          { href: "/guess-the-player", label: "Guess The Player", description: "İpuçlarından gizli futbolcuyu bul." },
          { href: "/club-nation", label: "Kulüp x Ülke", description: "Kulüp ve ülke kesişimine uyan futbolcuyu yaz." },
          { href: "/tic-tac-toe", label: "Futbol Tic Tac Toe", description: "Futbol bilgisini 3x3 tabloda kullan." }
        ]}
      />
    </>
  );
}
