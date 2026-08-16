import SeoLandingPage from "@/components/SeoLandingPage";
import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const description = "Halısaha kadro kurma aracını ücretsiz kullan. Oyuncuları ekle, takımları dengeli oluştur, maç linkini paylaş ve katılım durumunu takip et.";

export const metadata = createGameMetadata({
  path: "/halisaha-kadro-kurma",
  title: "Halısaha Kadro Kurma ve Takım Oluşturma | FootBattle",
  description,
  keywords: ["halısaha kadro kurma", "halısaha takım kurma", "halısaha kadro oluşturucu", "halısaha maç planlama", "halısaha takım ayırma"],
});

export default function Page() {
  return (
    <>
      <GameJsonLd name="Halısaha Kadro Kurma" description={description} path="/halisaha-kadro-kurma" />
      <SeoLandingPage
        eyebrow="Maçı WhatsApp kaosundan çıkar"
        title="Halısaha Kadro Kurma"
        intro="Halısaha maçında kim geliyor, kaç kişi eksik, takımlar nasıl ayrılacak? FootBattle halısaha araçları oyuncuları tek yerde toplamana, kadroyu kurmana, takımları ayırmana ve maç bağlantısını arkadaşlarınla paylaşmana yardımcı olur."
        ctaHref="/halisaha-kadro"
        ctaLabel="Kadroyu Oluştur ⚽"
        sections={[
          { title: "Halısaha kadrosu nasıl hazırlanır?", paragraphs: ["Önce maça katılacak oyuncuları ekleyerek kadroyu oluşturursun. Oyuncu sayısı netleştiğinde takımları ayırabilir ve oluşan kadroyu maç grubuna gönderebilirsin. Böylece isimleri tekrar tekrar mesajlarda aramak yerine güncel kadro tek ekranda kalır.", "Maç organizasyonunda en çok zaman kaybettiren konu son dakika değişiklikleridir. Bir oyuncu gelemeyeceğini söylediğinde listeyi güncelleyip yeniden paylaşmak gerekir. Dijital kadro bağlantısı bu süreci daha düzenli hale getirir ve herkes aynı güncel bilgiyi görür."], bullets: ["Oyuncu listesi oluştur", "Takımları dengeli ayır", "Maç bağlantısını paylaş", "Mobil ekrandan kolay yönet"] },
          { title: "Dengeli takım kurmak neden önemli?", paragraphs: ["Halısaha maçının keyfi iki takımın birbirine yakın güçte olmasıyla artar. Bütün hızlı oyuncuların veya golcülerin aynı tarafta olması maçın erken kopmasına neden olabilir. Bu yüzden oyuncuları yalnızca sırayla bölmek yerine genel seviyeyi ve rollerini dikkate almak daha iyi sonuç verir.", "FootBattle takım ayırma akışı organizatörün işini hızlandırmayı amaçlar. Oluşan takımlar son karar değildir; arkadaş grubunun bilgisine göre küçük değişiklikler yapabilir, ardından kadroyu paylaşabilirsin."] },
          { title: "Maç planlama ve katılım takibi", paragraphs: ["Sadece kadro oluşturmak değil, maçın tarihini, saatini ve sahasını paylaşmak da organizasyonun parçasıdır. FootBattle halısaha maç özelliği maç bilgisini bağlantıya dönüştürür. Katılımcılar bu sayfadan durumlarını bildirerek organizatöre kimlerin geleceğini gösterebilir.", "Bu yöntem özellikle kalabalık WhatsApp gruplarında işe yarar. 'Ben geliyorum', 'belki', 'gelemiyorum' mesajlarının arasında güncel sayıyı hesaplamak yerine katılım listesi tek yerde tutulur. Maç saati yaklaştığında eksik oyuncu olup olmadığını daha hızlı anlarsın."] },
          { title: "Kadroyu kur, sonra maça odaklan", paragraphs: ["Halısaha organizasyonu bir iş takip uygulamasına dönüşmemeli. Araçların amacı hazırlık süresini kısaltıp asıl önemli olan maça daha fazla zaman bırakmak. Kadroyu oluşturduktan sonra takım dağılımını paylaşabilir ve herkesin kendi tarafını görmesini sağlayabilirsin.", "FootBattle içinde halısaha araçlarının yanında futbol oyunları da bulunur. Maç öncesi grupta kimin futbol bilgisinin daha iyi olduğunu görmek için Guess The Player, Tic Tac Toe veya Günün Kapışması gibi modları da paylaşabilirsin."] }
        ]}
        faqs={[
          { question: "Halısaha kadro oluşturucu ücretsiz mi?", answer: "Evet. FootBattle halısaha kadro aracını tarayıcıdan ücretsiz kullanabilirsin." },
          { question: "Takımları otomatik ayırabilir miyim?", answer: "FootBattle kadro araçları oyuncuları iki takıma ayırma ve dengeleme akışları sunar; son düzenlemeyi organizatör yapabilir." },
          { question: "Maç linkini WhatsApp'ta paylaşabilir miyim?", answer: "Evet. Oluşturduğun maç veya kadro bağlantısını arkadaş grubuna gönderebilirsin." },
          { question: "Uygulama indirmek gerekiyor mu?", answer: "Hayır. Sistem web üzerinden mobil veya masaüstü tarayıcıda çalışır." }
        ]}
        relatedLinks={[
          { href: "/halisaha-kadro", label: "Halısaha Kadro", description: "Oyuncuları ekle ve kadronu hazırla." },
          { href: "/halisaha-mac", label: "Halısaha Maç Planla", description: "Tarih, saat ve saha bilgisiyle maç oluştur." },
          { href: "/takim-kadro", label: "Takım Kadro Kur", description: "Futbolcularla kendi 11'ini oluştur." }
        ]}
      />
    </>
  );
}
