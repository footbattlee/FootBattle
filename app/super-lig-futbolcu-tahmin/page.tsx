import SeoLandingPage from "@/components/SeoLandingPage";
import { GameJsonLd, SITE_URL } from "@/lib/seo";

const description = "Süper Lig futbolcu tahmin oyunu oyna. Aktif Süper Lig oyuncularını ipuçlarından bul, zorluk seviyeni seç ve Guess the Player bilginle kendini test et.";
const primaryUrl = `${SITE_URL}/tr/guess-the-player/super-lig`;

export const metadata = {
  title: "Süper Lig Futbolcu Tahmin Oyunu | Guess The Player | FootBattle",
  description,
  alternates: { canonical: primaryUrl },
  robots: { index: true, follow: true },
};

export default function Page() {
  return (
    <>
      <GameJsonLd name="Süper Lig Futbolcu Tahmin Oyunu" description={description} path="/tr/guess-the-player/super-lig" />
      <SeoLandingPage
        eyebrow="Süper Lig Guess The Player"
        title="Süper Lig Futbolcuyu Tahmin Et"
        intro="Aktif Süper Lig futbolcularını ipuçlarından tahmin et. Zorluk seviyeni seç, oyuncunun özelliklerini karşılaştır ve gizli futbolcuyu mümkün olduğunca az denemede bul."
        ctaHref="/tr/guess-the-player/super-lig"
        ctaLabel="Süper Lig Guess The Player Oyna ⚽"
        sections={[
          { title: "Süper Lig futbolcu tahmin oyunu nasıl oynanır?", paragraphs: ["Oyunda hedef, gizlenen aktif Süper Lig futbolcusunu tahmin etmektir. Yaptığın tahminlerden gelen bilgiler doğru oyuncuya yaklaşmana yardımcı olur.", "Başlamadan önce kolay, orta, zor veya karışık zorluk seviyelerinden birini seçebilirsin. Böylece hem Süper Lig'i yeni takip edenler hem de kadroları yakından bilen futbolseverler kendilerine uygun bir oyun oynayabilir."] },
          { title: "Guess The Player Süper Lig modu", paragraphs: ["Klasik Guess The Player mantığını Türkiye Süper Lig oyuncu havuzuna taşıyan bu modda amaç yalnızca yıldız isimleri değil, ligdeki farklı takımların futbolcularını da tanımaktır.", "Kulüp, oyuncu özellikleri ve yaptığın önceki tahminlerden gelen ipuçlarını birlikte değerlendirerek seçenekleri azaltabilir ve doğru futbolcuya ulaşabilirsin."], bullets: ["Aktif Süper Lig futbolcuları", "Dört zorluk seçeneği", "İpuçlarıyla eleme", "Mobil tarayıcıdan oynama"] },
        ]}
        faqs={[
          { question: "Guess The Player Süper Lig nasıl oynanır?", answer: "Bir zorluk seviyesi seçtikten sonra gizli Süper Lig futbolcusunu tahmin edersin. Tahminlerinden gelen ipuçlarını kullanarak doğru oyuncuya ulaşmaya çalışırsın." },
          { question: "Oyunda hangi futbolcular var?", answer: "Süper Lig modunda aktif Süper Lig oyuncularından oluşan uygun oyuncu havuzu kullanılır." },
          { question: "Zorluk seviyesi seçilebilir mi?", answer: "Evet. Kolay, orta, zor ve karışık seçenekleri bulunur." },
        ]}
        relatedLinks={[
          { href: "/tr/guess-the-player/super-lig", label: "Süper Lig Guess The Player", description: "Oyunun ana ve güncel sayfasında zorluk seçip hemen oyna." },
          { href: "/tr/guess-the-player", label: "Guess the Player", description: "Genel futbolcu havuzunda ipuçlarından oyuncuyu tahmin et." },
          { href: "/tr/super-lig", label: "Süper Lig", description: "Fikstür, puan durumu ve lig sayfasını keşfet." },
          { href: "/futbol-oyunlari", label: "Tüm Futbol Oyunları", description: "FootBattle'daki diğer futbol oyunlarını keşfet." },
        ]}
      />
    </>
  );
}
