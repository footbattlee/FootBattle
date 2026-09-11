import SeoLandingPage from "@/components/SeoLandingPage";
import { BreadcrumbJsonLd, createGameMetadata, GameJsonLd } from "@/lib/seo";

const description = "Football Wordle ve harflerle futbolcu bilme oyunu oyna. Gizli futbolcu soyadını harf ipuçlarıyla bul, ücretsiz ve sınırsız tekrar oyna.";

export const metadata = createGameMetadata({
  path: "/football-wordle",
  title: "Football Wordle | Harflerle Futbolcu Bilme Oyunu | FootBattle",
  description,
  keywords: [
    "football wordle",
    "harflerle futbolcu bilme oyunu",
    "futbol wordle",
    "soccer wordle",
    "futbolcu wordle",
    "wordle futbol",
  ],
});

export default function Page() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "FootBattle", path: "/tr" },
          { name: "Futbol Oyunları", path: "/futbol-oyunlari" },
          { name: "Football Wordle", path: "/football-wordle" },
        ]}
      />
      <GameJsonLd name="Football Wordle" description={description} path="/football-wordle" />
      <SeoLandingPage
        eyebrow="Harflerden futbolcuyu bul"
        title="Football Wordle – Harflerle Futbolcu Bilme Oyunu"
        intro="Klasik Wordle mantığını futbol dünyasına taşıyan FootBattle Football Wordle'da hedef, gizli futbolcunun soyadını doğru harfleri takip ederek bulmak. Harflerle futbolcu bilme oyunu arayanlar için hızlı, ücretsiz ve tekrar oynanabilir bir futbol bulmacasıdır."
        ctaHref="/tr/wordle"
        ctaLabel="Football Wordle Oyna 🔤"
        sections={[
          { title: "Football Wordle nasıl oynanır?", paragraphs: ["Her denemede bir futbolcu soyadı yazarsın. Doğru yerde bulunan harfler, kelimede olup farklı yerde duran harfler ve hedefte bulunmayan harfler sana bir sonraki tahmin için yol gösterir. Amaç sınırlı denemeler içinde gizli soyadı çözmektir.", "Futbolcu isimlerine aşina olmak önemli olsa da kelime mantığı da en az futbol bilgisi kadar değerlidir. İlk tahminlerinde farklı harfler içeren soyadları kullanmak, hedef kelimenin yapısını daha hızlı anlamana yardım eder."], bullets: ["Türkçe arayüz", "Sınırsız tekrar oynama", "Harflerle futbolcu tahmin etme", "Futbolcu soyadlarıyla Wordle", "Hızlı mobil oyun"] },
          { title: "Harflerle futbolcu bilme oyunu için taktikler", paragraphs: ["İlk turda aynı harfi çok kez kullanan bir isim yerine daha fazla farklı harf içeren futbolcu soyadı seçmek daha fazla bilgi verir. Sonraki denemelerde doğru harflerin konumunu koruyup kalan boşluklara uygun futbolcu isimleri düşünmek gerekir.", "Bazen futbol bilgisi bir anda çözümü getirir. Örneğin birkaç harf ve kelime uzunluğu belli olduğunda aklına doğrudan bir oyuncu gelebilir. Bu nedenle Football Wordle, kelime bulmacası ile futbol hafızasını güzel biçimde birleştirir."] },
          { title: "Wordle'dan sonra başka bir futbol bulmacasına geç", paragraphs: ["Football Wordle kısa bir oyun olduğu için bir turdan sonra Guess The Player veya Career Path ile devam etmek kolaydır. Birinde harflerden, diğerinde futbolcu özelliklerinden veya kariyer geçmişinden doğru oyuncuyu bulmaya çalışırsın.", "Aynı arkadaş grubuyla oynuyorsanız sonucu paylaşarak kimin daha az denemede çözdüğünü karşılaştırabilirsiniz. Bu basit rekabet oyunun tekrar oynanma değerini artırır."] }
        ]}
        faqs={[
          { question: "Harflerle futbolcu bilme oyunu nasıl oynanır?", answer: "Bir futbolcu soyadı tahmin edersin. Oyun doğru yerdeki, yanlış yerdeki ve hedefte bulunmayan harfleri gösterir; bu ipuçlarıyla gizli futbolcunun soyadını bulursun." },
          { question: "Football Wordle her gün bir kez mi oynanıyor?", answer: "Hayır. FootBattle sürümünde yeniden oynayabilir ve farklı futbolcularla devam edebilirsin." },
          { question: "Football Wordle ücretsiz mi?", answer: "Evet. Tarayıcıdan ücretsiz oynanır." },
          { question: "Oyunda futbolcuların adı mı soyadı mı tahmin ediliyor?", answer: "Temel oyun futbolcu soyadını tahmin etme mantığıyla çalışır." }
        ]}
        relatedLinks={[
          { href: "/futbolcu-tahmin-oyunu", label: "Futbolcu Tahmin Oyunu", description: "Özellik ipuçlarından oyuncuyu bul." },
          { href: "/kariyerden-futbolcu-bul", label: "Career Path", description: "Kariyer yolundan futbolcuyu tahmin et." },
          { href: "/futbol-tic-tac-toe", label: "Futbolcu Tic Tac Toe", description: "Kulüp ve ülke kriterlerinden doğru futbolcuyu bul." },
          { href: "/futbol-bilgi-yarismasi", label: "Futbol Bilgi Yarışması", description: "Futbol bilgini farklı kategorilerde test et." }
        ]}
      />
    </>
  );
}
