import SeoLandingPage from "@/components/SeoLandingPage";
import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const description = "Süper Lig efsanelerini karşılaştır, 16 futbolcudan kendi şampiyonunu çıkar. Hagi, Alex, Sergen, Sneijder ve daha fazlasıyla Survivor oyna.";

export const metadata = createGameMetadata({
  path: "/super-lig-efsaneleri",
  title: "Süper Lig Efsaneleri | Kendi Şampiyonunu Seç | FootBattle",
  description,
  keywords: ["süper lig efsaneleri", "süper lig en iyi futbolcular", "hagi alex sergen", "süper lig futbolcuları", "futbol survivor"],
});

export default function Page() {
  return (
    <>
      <GameJsonLd name="Süper Lig Efsaneleri" description={description} path="/super-lig-efsaneleri" />
      <SeoLandingPage
        eyebrow="16 efsane, tek şampiyon"
        title="Süper Lig Efsaneleri"
        intro="Süper Lig tarihinden akıllarda kalan yıldızları aynı turnuvaya koy ve kendi şampiyonunu belirle. Hagi, Alex, Sergen, Sneijder, Muslera, Quaresma ve daha pek çok isim arasından seçim yaparak finalde tek bir efsaneye ulaş."
        ctaHref="/survivor"
        ctaLabel="Süper Lig Survivor Oyna 👑"
        sections={[
          { title: "Bir efsaneyi ne belirler?", paragraphs: ["Süper Lig'de iz bırakmak yalnızca çok gol atmak ya da uzun yıllar forma giymekle açıklanamaz. Bazı futbolcular kısa sürede unutulmaz anlar yaratır, bazıları ise yıllar boyunca istikrarlı performansla kulübün simgesine dönüşür. Taraftarla kurulan bağ, derbi performansları, kazanılan kupalar ve oyun tarzı birlikte değerlendirilir.", "Bu yüzden farklı jenerasyonlardan oyuncuları karşılaştırmak eğlencelidir. Aynı pozisyonda oynamayan iki futbolcu bile kendi dönemlerinde yarattıkları etki üzerinden karşı karşıya getirilebilir. Survivor formatı bu öznel tercihi oyuna dönüştürür."], bullets: ["16 futbolculuk turnuva", "İlk tur rastgele eşleşir", "Kazananlar sabit bracket'ta ilerler", "Final şampiyonu paylaşılabilir"] },
          { title: "Hagi, Alex, Sergen, Sneijder... seçim zor", paragraphs: ["Süper Lig denince farklı taraftarların aklına farklı isimler gelir. Hagi'nin oyun zekâsı ve büyük maç etkisi, Alex'in üretkenliği, Sergen'in doğal yeteneği veya Sneijder'in teknik kalitesi aynı listede farklı türde argümanlar yaratır.", "Kaleciler ve savunmacılar da bu tartışmanın parçasıdır. Muslera gibi uzun süreli istikrar gösteren isimlerle kısa dönemde çok büyük iz bırakan hücumcuları karşılaştırmak kolay değildir. Tam da bu nedenle oyunun doğru cevabı yoktur; sonuç senin futbol hafızanı ve önceliklerini gösterir."] },
          { title: "Kendi Süper Lig şampiyonunu çıkar", paragraphs: ["Survivor oyununda ilk 16 futbolcu başlangıçta bracket'a yerleşir. Her eşleşmede yalnızca birini seçersin ve kazanan bir sonraki tura yükselir. Son 16, çeyrek final, yarı final ve final boyunca yaptığın 15 seçim sonunda tek bir şampiyon kalır.", "Aynı seti yeniden oynadığında ilk tur eşleşmeleri farklı gelebilir. Bu da bazı futbolcuların farklı rakiplerle karşılaşmasını ve senin kararlarının değişip değişmediğini görmeni sağlar. Final sonucunu linkiyle birlikte arkadaşlarınla paylaşabilirsin."] }
        ]}
        faqs={[
          { question: "Süper Lig'in en büyük efsanesi kim?", answer: "Bu tamamen hangi döneme, kulübe ve kriterlere önem verdiğine göre değişir. FootBattle Survivor bu tartışmayı kişisel bir turnuvaya dönüştürür." },
          { question: "Survivor'da kaç futbolcu var?", answer: "Standart Survivor seti 16 katılımcıdan oluşur ve şampiyona ulaşmak için 15 seçim yapılır." },
          { question: "Sonucumu paylaşabilir miyim?", answer: "Evet. Turnuva tamamlandığında şampiyon sonucunu bağlantısıyla birlikte paylaşabilirsin." }
        ]}
        relatedLinks={[
          { href: "/survivor", label: "Futbol Survivor", description: "Mevcut tüm 16'lı turnuvaları gör." },
          { href: "/gunun-kapismasi", label: "Günün Kapışması", description: "Her gün iki futbolcudan birini seç." },
          { href: "/futbol-bilgi-yarismasi", label: "Futbol Bilgi Yarışması", description: "Süper Lig dahil futbol bilgini test et." }
        ]}
      />
    </>
  );
}
