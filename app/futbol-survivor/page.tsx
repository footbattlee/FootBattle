import SeoLandingPage from "@/components/SeoLandingPage";
import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const description = "16 futbolcu veya takımı eleme usulü karşılaştır, finalde kendi şampiyonunu seç. FootBattle O Mu Bu Mu? futbol Survivor turnuvalarını ücretsiz oyna.";

export const metadata = createGameMetadata({
  path: "/futbol-survivor",
  title: "Futbol Survivor: 16'lı O Mu Bu Mu? Turnuvası | FootBattle",
  description,
  keywords: ["futbol survivor", "o mu bu mu futbol", "futbolcu karşılaştırma", "futbol turnuvası", "en iyi futbolcu seç"],
});

export default function Page() {
  return <>
    <GameJsonLd name="FootBattle Futbol Survivor" description={description} path="/futbol-survivor" />
    <SeoLandingPage
      eyebrow="16 aday, tek şampiyon"
      title="Futbol Survivor: O Mu Bu Mu?"
      intro="16 futbolcu veya takım ikili eşleşmelerde karşı karşıya gelir. Her turda favorini seç, çeyrek finalden finale ilerle ve kendi futbol şampiyonunu çıkar."
      ctaHref="/tr/survivor"
      ctaLabel="O Mu Bu Mu? Oyna 👑"
      sections={[
        { title: "Nasıl oynanır?", paragraphs: ["İlk turda 16 aday sekiz eşleşmeye ayrılır. Her eşleşmede bir tercih yaparsın. Seçtiklerin bir sonraki tura geçer; çeyrek final, yarı final ve final sonunda tek bir şampiyon kalır.", "Bilgi sorusundan farklı olarak burada doğru veya yanlış cevap yoktur. Oyun tamamen futbol zevkini ve tercihlerini yansıtır."] },
        { title: "Hangi kategoriler var?", paragraphs: ["Süper Lig efsaneleri, unutulmaz yabancılar, dünyanın en iyi futbolcuları, kulüpler, 10 numaralar veya belirli dönemlerin yıldızları gibi farklı turnuvalar oynanabilir."], bullets: ["Süper Lig efsaneleri", "İkonik yabancılar", "Dünya yıldızları", "Kulüp turnuvaları", "Pozisyon ve dönem temaları"] },
        { title: "Sonucunu paylaş", paragraphs: ["Finalde seçtiğin şampiyon için paylaşılabilir bir sonuç oluşur. Arkadaşların aynı 16'lıyı oynadığında tamamen farklı bir finale ulaşabilir; oyunun tartışma tarafı da burada başlar."] }
      ]}
      faqs={[
        { question: "Futbol Survivor kaç kişilik?", answer: "Her turnuva 16 futbolcu veya takımla başlar ve dört tur sonunda bir şampiyon belirlenir." },
        { question: "Doğru cevap var mı?", answer: "Hayır. O Mu Bu Mu? tercih tabanlı bir oyundur; kendi favorilerini seçersin." },
        { question: "Sonucu paylaşabilir miyim?", answer: "Evet. Tamamlanan turnuvaların sonuçları paylaşılabilir." }
      ]}
      relatedLinks={[
        { href: "/super-lig-quiz", label: "Süper Lig Quiz", description: "Süper Lig bilgini test et." },
        { href: "/messi-mi-ronaldo-mu", label: "Messi mi Ronaldo mu?", description: "Futbolun en büyük tartışmalarından birine oy ver." },
        { href: "/futbol-oyunlari", label: "Futbol Oyunları", description: "Diğer FootBattle oyunlarını keşfet." }
      ]}
    />
  </>;
}
