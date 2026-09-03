import SeoLandingPage from "@/components/SeoLandingPage";
import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const description = "Süper Lig futbolcu tahmin oyunu oyna. Aktif Süper Lig oyuncularını ipuçlarından bul, zorluk seviyeni seç ve Guess the Player bilginle kendini test et.";

export const metadata = createGameMetadata({
  path: "/super-lig-futbolcu-tahmin",
  title: "Süper Lig Futbolcu Tahmin Oyunu | Guess The Player | FootBattle",
  description,
  keywords: [
    "guess the player süper lig",
    "süper lig tahmin oyunu",
    "süper lig futbolcu tahmin",
    "süper lig futbolcuyu bul",
    "süper lig futbolcuyu tahmin et",
    "futbolcu tahmin oyunu",
  ],
});

export default function Page() {
  return (
    <>
      <GameJsonLd name="Süper Lig Futbolcu Tahmin Oyunu" description={description} path="/super-lig-futbolcu-tahmin" />
      <SeoLandingPage
        eyebrow="Süper Lig Guess The Player"
        title="Süper Lig Futbolcuyu Tahmin Et"
        intro="Aktif Süper Lig futbolcularını ipuçlarından tahmin et. Zorluk seviyeni seç, oyuncunun özelliklerini karşılaştır ve gizli futbolcuyu mümkün olduğunca az denemede bul."
        ctaHref="/tr/guess-the-player/super-lig"
        ctaLabel="Süper Lig Guess The Player Oyna ⚽"
        sections={[
          {
            title: "Süper Lig futbolcu tahmin oyunu nasıl oynanır?",
            paragraphs: [
              "Oyunda hedef, gizlenen aktif Süper Lig futbolcusunu tahmin etmektir. Yaptığın tahminlerden gelen bilgiler doğru oyuncuya yaklaşmana yardımcı olur.",
              "Başlamadan önce kolay, orta, zor veya karışık zorluk seviyelerinden birini seçebilirsin. Böylece hem Süper Lig'i yeni takip edenler hem de kadroları yakından bilen futbolseverler kendilerine uygun bir oyun oynayabilir.",
            ],
          },
          {
            title: "Guess The Player Süper Lig modu",
            paragraphs: [
              "Klasik Guess The Player mantığını Türkiye Süper Lig oyuncu havuzuna taşıyan bu modda amaç yalnızca yıldız isimleri değil, ligdeki farklı takımların futbolcularını da tanımaktır.",
              "Kulüp, oyuncu özellikleri ve yaptığın önceki tahminlerden gelen ipuçlarını birlikte değerlendirerek seçenekleri azaltabilir ve doğru futbolcuya ulaşabilirsin.",
            ],
            bullets: ["Aktif Süper Lig futbolcuları", "Dört zorluk seçeneği", "İpuçlarıyla eleme", "Mobil tarayıcıdan oynama"],
          },
          {
            title: "Doğru futbolcuyu daha hızlı nasıl bulursun?",
            paragraphs: [
              "İlk tahminlerinde farklı profillerden bildiğin oyuncuları kullanmak daha fazla bilgi toplamana yardımcı olabilir. Sonraki denemelerde gelen ipuçlarına göre aday havuzunu daralt.",
              "Süper Lig kadrolarını, oyuncuların mevkilerini ve kulüplerini takip etmek özellikle zor seviyede avantaj sağlar. Karışık mod ise tüm uygun oyuncu havuzuyla bilgini daha geniş biçimde test eder.",
            ],
          },
        ]}
        faqs={[
          { question: "Guess The Player Süper Lig nasıl oynanır?", answer: "Bir zorluk seviyesi seçtikten sonra gizli Süper Lig futbolcusunu tahmin edersin. Tahminlerinden gelen ipuçlarını kullanarak doğru oyuncuya ulaşmaya çalışırsın." },
          { question: "Oyunda hangi futbolcular var?", answer: "Süper Lig modunda aktif Süper Lig oyuncularından oluşan uygun oyuncu havuzu kullanılır." },
          { question: "Zorluk seviyesi seçilebilir mi?", answer: "Evet. Kolay, orta, zor ve karışık seçenekleri bulunur." },
          { question: "Telefondan oynanabilir mi?", answer: "Evet. Süper Lig futbolcu tahmin oyununu mobil tarayıcıdan oynayabilirsin." },
        ]}
        relatedLinks={[
          { href: "/futbolcu-tahmin-oyunu", label: "Futbolcu Tahmin Oyunu", description: "Diğer futbolcuları ipuçlarından tahmin et." },
          { href: "/futbol-tic-tac-toe", label: "Futbol Tic Tac Toe", description: "Kulüp ve ülke kesişimlerinde doğru futbolcuyu bul." },
          { href: "/transfer-quiz", label: "Transfer Oyunu", description: "Transfer ipuçlarından futbolcuyu tahmin et." },
          { href: "/futbol-oyunlari", label: "Tüm Futbol Oyunları", description: "FootBattle'daki diğer futbol oyunlarını keşfet." },
        ]}
      />
    </>
  );
}
