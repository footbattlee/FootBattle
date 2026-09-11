import SeoLandingPage from "@/components/SeoLandingPage";
import { BreadcrumbJsonLd, createGameMetadata, GameJsonLd } from "@/lib/seo";

const description = "Futbolcu Tic Tac Toe oyna: kulüp, ülke ve futbolcu bilgini kullanarak 3x3 tahtada doğru oyuncuları bul. Ücretsiz futbol Tic Tac Toe ve XOX oyunu.";

export const metadata = createGameMetadata({
  path: "/futbol-tic-tac-toe",
  title: "Futbolcu Tic Tac Toe | Futbol Tic Tac Toe Oyna | FootBattle",
  description,
  keywords: [
    "futbolcu tic tac toe",
    "tic tac toe futbolcu",
    "futbol tic tac toe",
    "football tic tac toe",
    "futbol bilgi oyunu",
    "kulüp ülke futbolcu",
    "futbol xox",
    "football grid game",
    "futbol grid oyunu",
  ],
});

export default function Page() {
  return <>
    <BreadcrumbJsonLd
      items={[
        { name: "FootBattle", path: "/tr" },
        { name: "Futbol Oyunları", path: "/futbol-oyunlari" },
        { name: "Futbolcu Tic Tac Toe", path: "/futbol-tic-tac-toe" },
      ]}
    />
    <GameJsonLd name="FootBattle Futbolcu Tic Tac Toe" description={description} path="/futbol-tic-tac-toe" />
    <SeoLandingPage eyebrow="Bilgi + strateji" title="Futbolcu Tic Tac Toe" intro="Futbolcu Tic Tac Toe, klasik 3x3 Tic Tac Toe mantığını futbol bilgisiyle birleştirir. Satır ve sütun kriterlerine uyan doğru futbolcuyu bul, rakibinden önce üçlü yap ve tahtayı kazan."
      ctaHref="/tr/tic-tac-toe" ctaLabel="Futbol Tic Tac Toe Oyna ⭕"
      sections={[
        { title: "Futbolcu Tic Tac Toe nasıl oynanır?", paragraphs: ["Her hücre iki futbol kriterinin kesişimidir. Örneğin bir kulüp ile bir ülkenin kesiştiği kareye iki koşulu da karşılayan bir futbolcu yazman gerekir.", "Doğru cevabı bulmak tek başına yetmez; hangi kareyi ne zaman oynadığın da önemlidir. Böylece futbol bilgisi ile klasik Tic Tac Toe stratejisi birleşir."] },
        { title: "Tic Tac Toe futbolcu seçerken nasıl düşünmelisin?", paragraphs: ["Önce satır ve sütundaki iki kriteri ayrı ayrı değerlendir. Ardından kariyerinde bu iki koşulu aynı anda karşılayan futbolcuları düşün. Bir kulüpte oynayan tüm isimleri saymak yerine milliyet, ikinci kulüp veya lig gibi diğer kriterle kesişen adaylara odaklanmak daha hızlı sonuca götürür.", "Geçmiş kadroları ve transfer rotalarını hatırlamak özellikle zor kesişimlerde avantaj sağlar. Tanıdığın ilk oyuncuyu yazmadan önce iki kriterin de gerçekten karşılandığından emin ol."] },
        { title: "Hangi futbol bilgileri işe yarar?", paragraphs: ["Oyuncuların kulüp geçmişi, milliyeti, lig tecrübesi ve transfer kariyeri bu oyunda avantaj sağlar. Sadece güncel kadroları değil, geçmiş sezonları da hatırlamak gerekebilir."], bullets: ["Kulüp geçmişi", "Milliyet", "Lig bilgisi", "Transfer kariyeri", "Stratejik hamle"] },
        { title: "Futbol bilgisi neden strateji kadar önemli?", paragraphs: ["Klasik Tic Tac Toe'da boş kareyi seçmek yeterliyken futbol versiyonunda o kareyi geçerli bir oyuncuyla doldurabilmen gerekir. Bu yüzden savunma veya hücum için iyi görünen bir kare, kriterleri karşılayan oyuncuyu bulamıyorsan riskli olabilir.", "Merkez, köşe ve rakibin olası üçlüleri gibi klasik tahta kararları devam eder; fakat futbol hafızan hangi hamleleri gerçekten oynayabileceğini belirler."] },
        { title: "Tek başına veya rekabet için", paragraphs: ["Tahtaları çözerek futbol hafızanı test edebilir, skorunu arkadaşlarınla karşılaştırabilir veya düello formatlarında doğrudan rekabete girebilirsin."] }
      ]}
      faqs={[
        { question: "Futbolcu Tic Tac Toe nasıl oynanır?", answer: "Satır ve sütun kriterlerinin ikisine de uyan futbolcuyu ilgili hücreye girersin. Amaç klasik Tic Tac Toe gibi üç hücreyi hizalamaktır." },
        { question: "Tic Tac Toe futbolcu oyununda iki kriteri de karşılamak gerekir mi?", answer: "Evet. Seçtiğin hücrenin satır ve sütun kriterleri birlikte değerlendirilir; yazdığın futbolcunun iki koşula da uyması gerekir." },
        { question: "Futbolcular geçmişte oynamış olabilir mi?", answer: "Evet. Kariyer geçmişi kriterleri karşılıyorsa eski kulüpler de kullanılabilir." },
        { question: "Telefondan oynanır mı?", answer: "Evet. FootBattle Futbolcu Tic Tac Toe mobil tarayıcıdan oynanabilir." }
      ]}
      relatedLinks={[
        { href: "/football-wordle", label: "Football Wordle", description: "Harflerle futbolcu soyadını bul." },
        { href: "/futbol-bilgi-yarismasi", label: "Futbol Bilgi Yarışması", description: "Diğer futbol bilgi oyunlarını keşfet." },
        { href: "/super-lig-futbolcu-tahmin", label: "Süper Lig Futbolcu Tahmin", description: "Süper Lig oyuncularını ipuçlarından tahmin et." },
        { href: "/futbolcu-tahmin-oyunu", label: "Futbolcu Tahmin Oyunu", description: "İpuçlarından gizli futbolcuyu bul." },
        { href: "/transfer-quiz", label: "Transfer Oyunu", description: "Transfer ipuçlarından futbolcuyu bul." }
      ]}
    />
  </>;
}
