import SeoLandingPage from "@/components/SeoLandingPage";
import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const description = "Messi mi Ronaldo mu? Futbolun en büyük tartışmalarından birine sen karar ver. İki efsaneyi karşılaştır, oyunu kullan ve Günün Kapışması'nı oyna.";

export const metadata = createGameMetadata({
  path: "/messi-mi-ronaldo-mu",
  title: "Messi mi Ronaldo mu? Kararını Ver | FootBattle",
  description,
  keywords: ["messi mi ronaldo mu", "messi ronaldo karşılaştırma", "messi vs ronaldo", "en iyi futbolcu", "goat futbol"],
});

export default function Page() {
  return (
    <>
      <GameJsonLd name="Messi mi Ronaldo mu?" description={description} path="/messi-mi-ronaldo-mu" />
      <SeoLandingPage
        eyebrow="Futbolun bitmeyen tartışması"
        title="Messi mi Ronaldo mu?"
        intro="Lionel Messi ve Cristiano Ronaldo yıllardır futbolseverlerin en çok karşılaştırdığı iki isim. Biri oyun kurma, dribbling ve yaratıcılığıyla; diğeri atletizmi, bitiriciliği ve farklı liglerdeki etkisiyle öne çıkıyor. Peki senin seçimin hangisi?"
        ctaHref="/gunun-kapismasi"
        ctaLabel="Kapışmada Oyunu Kullan ⚔️"
        sections={[
          { title: "Neden bu tartışma hiç bitmiyor?", paragraphs: ["Messi ve Ronaldo'nun futbol anlayışları birbirinden farklı olduğu için karşılaştırma yalnızca gol veya kupa sayısına indirgenemiyor. Messi top ayağındayken oyunun temposunu değiştiren, pas ve dribbling üzerinden takım arkadaşlarını da oyuna sokan bir profile sahip. Ronaldo ise ceza sahası etkinliği, hava topları, fiziksel güç ve bitiricilik üzerinden farklı bir üstünlük kuruyor.", "Bu farklılık tam da tartışmayı canlı tutuyor. Bir futbolsever için en değerli özellik yaratıcılık olabilirken bir başkası için kritik maçlarda gol bulmak veya farklı takımlarda kendini kanıtlamak daha önemli olabilir. Sonuçta 'en iyi' seçimi büyük ölçüde hangi özelliklere daha fazla değer verdiğine bağlı."], bullets: ["Oyun kurma ve yaratıcılık", "Golcülük ve bitiricilik", "Bireysel yetenek", "Takım başarısına etki"] },
          { title: "Messi'yi seçenler neyi öne çıkarıyor?", paragraphs: ["Messi tarafında olanlar genellikle dar alandaki top kontrolünü, savunma arasından çıkabilmesini, asist üretimini ve oyunu yönlendirme becerisini öne çıkarıyor. Topu yalnızca sonlandıran değil, hücumu başlatan ve şekillendiren bir oyuncu olması bu görüşün merkezinde.", "Ayrıca futbolu izlerken estetik ve yaratıcılığa önem verenler için Messi'nin oyun tarzı güçlü bir argüman oluşturuyor. Bir pozisyonda hem pas hem şut hem de dribbling tehdidi yaratabilmesi onu alışılmadık derecede çok yönlü hale getiriyor."] },
          { title: "Ronaldo'yu seçenler neyi öne çıkarıyor?", paragraphs: ["Ronaldo tarafında olanlar farklı oyun yapılarına uyum sağlama, fiziksel gelişim, hava hakimiyeti ve ceza sahası bitiriciliği gibi özellikleri öne çıkarıyor. Kariyeri boyunca oyun tarzını dönüştürerek kanat oyuncusundan daha doğrudan skor üreten bir hücum oyuncusuna evrilmesi önemli bir nokta.", "Büyük maçlardaki özgüveni ve gol arayışı da Ronaldo'nun taraftarları için belirleyici. Bu nedenle seçim yaparken sadece teknik kapasite değil, mentalite ve rekabetçilik gibi daha soyut özellikler de tartışmaya giriyor."] },
          { title: "Son kararı sen ver", paragraphs: ["Bu tartışmanın tek ve herkes tarafından kabul edilen bir cevabı yok. Zaten Günün Kapışması'nın amacı da tam olarak bu: futbol dünyasının tartışmalı eşleşmelerinde kendi oyunu kullanmak ve topluluğun ne düşündüğünü görmek.", "Messi-Ronaldo kapışmasından sonra Hagi-Alex, Xavi-Iniesta veya başka futbol eşleşmeleriyle devam edebilirsin. Böylece yalnızca bir karşılaştırma okumak yerine kendi futbol tercihlerinden oluşan bir profil yaratmış olursun."] }
        ]}
        faqs={[
          { question: "Messi mi Ronaldo mu daha iyi?", answer: "Bunun tek bir objektif cevabı yok. Tercih; oyun kurma, golcülük, yaratıcılık, fiziksel özellikler ve kariyer başarısına verdiğin ağırlığa göre değişir." },
          { question: "FootBattle'da Messi-Ronaldo oylaması var mı?", answer: "Günün Kapışması bölümünde futbolcuları karşılaştırıp topluluk oylamalarına katılabilirsin." },
          { question: "Başka futbolcu karşılaştırmaları da var mı?", answer: "Evet. Günün Kapışması farklı futbolcu eşleşmeleriyle düzenli olarak güncellenebilir." }
        ]}
        relatedLinks={[
          { href: "/gunun-kapismasi", label: "Günün Kapışması", description: "İki futbolcudan birini seç ve topluluğun oyunu gör." },
          { href: "/survivor", label: "Survivor", description: "16 futbolcudan kendi şampiyonunu çıkar." },
          { href: "/futbolcu-tahmin-oyunu", label: "Futbolcu Tahmin Oyunu", description: "İpuçlarından gizli futbolcuyu bul." }
        ]}
      />
    </>
  );
}
