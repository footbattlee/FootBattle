import SeoLandingPage from "@/components/SeoLandingPage";
import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const description = "Futbol Tic Tac Toe oyna: 3x3 futbol gridinde doğru oyuncuları bul, online rakiplere karşı Ranked Arena'da mücadele et ve ELO sıralamasında yüksel.";

export const metadata = createGameMetadata({
  path: "/futbol-tic-tac-toe",
  title: "Futbol Tic Tac Toe Oyna | Online Football Grid | FootBattle",
  description,
  keywords: ["futbol tic tac toe", "football tic tac toe", "online football tic tac toe", "ranked football tic tac toe", "football grid game", "futbol grid oyunu", "futbol xox"],
});

export default function Page() {
  return <>
    <GameJsonLd name="FootBattle Futbol Tic Tac Toe" description={description} path="/futbol-tic-tac-toe" />
    <SeoLandingPage eyebrow="Bilgi + rekabet" title="Futbol Tic Tac Toe" intro="3x3 futbol gridinde satır ve sütun kriterlerine uyan doğru futbolcuları bul. Tek başına futbol hafızanı test et veya Ranked Arena'da online rakiplere karşı mücadele ederek ELO sıralamasında yüksel." ctaHref="/tr/tic-tac-toe" ctaLabel="Tic Tac Toe Oyna ⭕"
      sections={[
        { title: "Nasıl oynanır?", paragraphs: ["Her hücre iki futbol kriterinin kesişimidir. Örneğin iki kulübün ya da bir kulüp ile bir ülkenin kesiştiği kareye iki koşulu da karşılayan bir futbolcu yazman gerekir.", "Doğru futbolcuları bularak 3x3 grid üzerinde avantaj kur. Futbol bilgisi ile klasik Tic Tac Toe stratejisi aynı maçta birleşir."] },
        { title: "Online Ranked Tic Tac Toe", paragraphs: ["FootBattle Ranked Arena'da Football Tic Tac Toe için rakip arayabilir ve başka bir oyuncuya karşı rekabetçi maç oynayabilirsin. Tamamlanan oyuncuya karşı Ranked maçlar ELO puanını etkiler; sonuçlarına göre sıralamada yükselir veya gerilersin.", "Uygun bir oyuncu bulunamadığında antrenman için Bot Eren ile eşleşebilirsin. Bot maçları Ranked ELO puanını değiştirmez."] },
        { title: "Bir hücreyi çözerken nasıl düşünmelisin?", paragraphs: ["Önce satır ve sütundaki iki kriteri ayrı ayrı değerlendir. Ardından kariyerinde bu iki koşulu aynı anda karşılayan futbolcuları düşün. Bir kulüpte oynayan tüm isimleri saymak yerine diğer kriterle kesişen adaylara odaklanmak daha hızlı sonuca götürür.", "Geçmiş kadroları ve transfer rotalarını hatırlamak özellikle zor kesişimlerde avantaj sağlar. Tanıdığın ilk oyuncuyu yazmadan önce iki kriterin de gerçekten karşılandığından emin ol."] },
        { title: "Hangi bilgiler işe yarar?", paragraphs: ["Oyuncuların kulüp geçmişi, milliyeti, lig tecrübesi ve transfer kariyeri bu oyunda avantaj sağlar. Sadece güncel kadroları değil, geçmiş sezonları da hatırlamak gerekebilir."], bullets: ["Kulüp geçmişi", "Milliyet", "Lig bilgisi", "Transfer kariyeri", "Grid stratejisi"] },
        { title: "Tek başına, arkadaşlarınla veya Ranked Arena'da", paragraphs: ["Futbol gridlerini tek başına çözebilir, arkadaşlarına meydan okuyabilir veya Ranked Arena üzerinden online rakip arayabilirsin. Rekabetçi oyuncuya karşı maçlarda ELO sistemi performansını takip eder."] }
      ]}
      faqs={[
        { question: "Futbol Tic Tac Toe nasıl oynanır?", answer: "Satır ve sütun kriterlerinin ikisine de uyan futbolcuyu ilgili hücreye girersin. 3x3 futbol gridinde doğru seçimlerle rakibine karşı avantaj kurarsın." },
        { question: "Futbol Tic Tac Toe online oynanır mı?", answer: "Evet. FootBattle Ranked Arena üzerinden Football Tic Tac Toe için online rakip arayabilir ve rekabetçi maç oynayabilirsin." },
        { question: "Ranked Tic Tac Toe ELO puanını etkiler mi?", answer: "Tamamlanan oyuncuya karşı Ranked maçlar ELO puanını etkiler. Bot Eren ile oynanan antrenman maçları ELO puanını değiştirmez." },
        { question: "Bir futbolcunun iki kriteri de karşılaması gerekir mi?", answer: "Evet. Seçtiğin hücrenin satır ve sütun kriterleri birlikte değerlendirilir; yazdığın futbolcunun iki koşula da uyması gerekir." },
        { question: "Telefondan oynanır mı?", answer: "Evet. FootBattle Football Tic Tac Toe mobil tarayıcıdan ve desteklenen mobil deneyimlerden oynanabilir." }
      ]}
      relatedLinks={[
        { href: "/tr/tic-tac-toe", label: "Football Tic Tac Toe Oyna", description: "3x3 futbol gridini hemen aç ve oyna." },
        { href: "/tr/rank", label: "Ranked Arena", description: "Online rakip bul ve ELO sıralamasında mücadele et." },
        { href: "/tr/guess-the-player/super-lig", label: "Süper Lig Futbolcu Tahmin", description: "Aktif Süper Lig oyuncularını ipuçlarından tahmin et." },
        { href: "/futbol-oyunlari", label: "Tüm Futbol Oyunları", description: "FootBattle'daki diğer futbol oyunlarını keşfet." }
      ]}
    />
  </>;
}
