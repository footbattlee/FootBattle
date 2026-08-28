import SeoLandingPage from "@/components/SeoLandingPage";
import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const description = "Süper Lig futbol bilgini FootBattle oyunlarıyla test et. Efsane futbolcular, yabancılar, kulüpler, kariyerler ve günlük futbol kapışmaları tek yerde.";

export const metadata = createGameMetadata({
  path: "/super-lig-quiz",
  title: "Süper Lig Quiz ve Futbol Bilgi Yarışması | FootBattle",
  description,
  keywords: ["süper lig quiz", "süper lig bilgi yarışması", "türk futbolu quiz", "süper lig futbolcuları", "futbol bilgi yarışması"],
});

export default function Page() {
  return <>
    <GameJsonLd name="Süper Lig Quiz" description={description} path="/super-lig-quiz" />
    <SeoLandingPage
      eyebrow="Süper Lig hafızanı test et"
      title="Süper Lig Quiz"
      intro="Süper Lig efsanelerini, unutulmaz yabancıları, kulüpleri ve kariyerleri ne kadar iyi hatırlıyorsun? FootBattle'daki futbol quizleriyle Türk futbolu hafızanı test et ve arkadaşlarınla karşılaştır."
      ctaHref="/tr"
      ctaLabel="Futbol Oyunlarını Oyna ⚽"
      sections={[
        { title: "Süper Lig efsaneleri", paragraphs: ["Alex, Hagi, Sergen, Batalla, Yattara, Makukula ve daha birçok unutulmaz isim farklı oyun formatlarında karşına çıkabilir. Amaç yalnızca oyuncuyu tanımak değil; kulüp, ülke, kariyer ve dönem bilgisini de kullanmaktır.", "Özellikle 2000'ler ve 2010'lar Süper Lig'ini takip eden futbolseverler için nostalji ile rekabeti birleştiren kısa oyunlar sunuyoruz."] },
        { title: "Hangi oyunları oynayabilirsin?", paragraphs: ["Guess The Player'da özelliklerden futbolcuyu bulabilir, Player Quiz'de kariyer bilgisini kullanabilir, Wordle'da futbolcunun soyadını çözebilir veya Survivor turnuvalarında kendi Süper Lig şampiyonunu seçebilirsin."], bullets: ["Guess The Player", "Player Quiz", "Football Wordle", "O Mu Bu Mu? / Survivor", "Günün Kapışması"] },
        { title: "Süper Lig bilgisini hangi ipuçlarıyla kullanırsın?", paragraphs: ["Bir oyuncunun yalnızca adını bilmek çoğu zaman yeterli değildir. Forma giydiği kulüpler, milliyeti, oynadığı dönem ve kariyer rotası farklı oyunlarda ayırt edici ipuçlarına dönüşebilir.", "Eski kadroları hatırlıyorsan kariyer ve tahmin oyunlarında, güncel futbolu yakından takip ediyorsan oyuncu ve kulüp odaklı sorularda avantaj sağlayabilirsin. Farklı oyun türlerini peş peşe oynamak aynı futbol bilgisini başka açılardan kullanmanı sağlar."], bullets: ["Kulüp ve takım geçmişi", "Futbolcunun milliyeti", "Kariyer rotası", "Dönem ve sezon hafızası", "Efsane ve güncel oyuncular"] },
        { title: "Kısa turlar, farklı futbol hafızaları", paragraphs: ["FootBattle'daki Süper Lig odaklı deneyim tek bir soru tipine bağlı değildir. Tahmin oyunları hatırlama hızını, Career Path transfer ve kulüp geçmişini, Survivor ise tamamen kişisel futbol tercihlerini öne çıkarır.", "Bu çeşitlilik sayesinde aynı arkadaş grubu içinde bile farklı oyuncular farklı oyunlarda öne çıkabilir. Bir turda iyi skor yaptıktan sonra başka bir formatta aynı Süper Lig bilgisini yeniden test edebilirsin."] },
        { title: "Arkadaş grubuna meydan oku", paragraphs: ["Süper Lig tartışmalarının tek doğru cevabı yoktur. Bu yüzden sonuç ekranlarını arkadaşlarınla paylaşabilir, aynı turnuvayı kimin farklı bitirdiğini görebilir ve günlük görevlerde skor karşılaştırabilirsin."] }
      ]}
      faqs={[
        { question: "Süper Lig quiz ücretsiz mi?", answer: "Evet. FootBattle'daki ana futbol oyunlarını tarayıcıdan ücretsiz oynayabilirsin." },
        { question: "Sadece güncel futbolcular mı var?", answer: "Hayır. Güncel oyuncuların yanında Süper Lig efsaneleri ve geçmiş dönemlerden tanınmış futbolcular da oyunlarda yer alabilir." },
        { question: "Süper Lig bilgimi hangi oyunlarda test edebilirim?", answer: "Guess The Player, Player Quiz, Football Wordle, Career Path, Survivor ve Günün Kapışması gibi farklı formatlarda kulüp, oyuncu ve kariyer bilgini kullanabilirsin." },
        { question: "Telefondan oynanır mı?", answer: "Evet. Oyunlar mobil tarayıcıdan da oynanabilir." }
      ]}
      relatedLinks={[
        { href: "/futbol-bilgi-yarismasi", label: "Futbol Bilgi Yarışması", description: "Genel futbol bilgini test et." },
        { href: "/super-lig-efsaneleri", label: "Süper Lig Efsaneleri", description: "Türk futbolunun unutulmaz isimlerine göz at." },
        { href: "/futbol-oyunlari", label: "Futbol Oyunları", description: "FootBattle'daki tüm oyun modlarını keşfet." }
      ]}
    />
  </>;
}
