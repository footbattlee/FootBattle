import SeoLandingPage from "@/components/SeoLandingPage";
import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const description = "Ücretsiz online futbol oyunları oyna: futbolcu tahmin, Football Wordle, Ranked Futbol Tic Tac Toe, penaltı, futbol quiz ve daha fazlası FootBattle'da.";

export const metadata = createGameMetadata({ path: "/futbol-oyunlari", title: "Futbol Oyunları Oyna – Ücretsiz Online Futbol Oyunları | FootBattle", description, keywords: ["futbol oyunları", "online futbol oyunları", "futbolcu tahmin oyunu", "football wordle", "futbol tic tac toe", "futbol quiz", "penaltı oyunu", "futbol bilgi oyunu"] });

export default function Page() {
  return <>
    <GameJsonLd name="FootBattle Futbol Oyunları" description={description} path="/futbol-oyunlari" />
    <SeoLandingPage eyebrow="Futbolu biliyorsan kanıtla" title="Ücretsiz Online Futbol Oyunları" intro="FootBattle, futbol bilgisi, refleks ve rekabeti kısa online oyunlarda buluşturur. Futbolcu tahmin et, Football Wordle çöz, Ranked Futbol Tic Tac Toe'da rakip bul, penaltı oyna, kariyer yolundan oyuncu bul veya arkadaşlarınla kapış." ctaHref="/tr" ctaLabel="FootBattle'ı Aç ⚽"
      sections={[
        { title: "Futbolcu tahmin oyunları", paragraphs: ["Guess the Player, Süper Lig Futbolcu Tahmin, Football Wordle ve Career Path gibi oyunlarda hedef doğru futbolcuyu mümkün olduğunca hızlı bulmaktır. Her oyun farklı bir futbol bilgisini öne çıkarır.", "Özellikle Süper Lig modunda aktif lig oyuncularını kulüp, milliyet, pozisyon ve diğer ipuçlarıyla tahmin edebilirsin."], bullets: ["Guess the Player", "Süper Lig Futbolcu Tahmin", "Football Wordle", "Career Path", "Transfer Oyunu"] },
        { title: "Ranked Futbol Tic Tac Toe", paragraphs: ["Futbol Tic Tac Toe, 3x3 grid mantığını futbol bilgisiyle birleştirir. Kulüp ve milliyet gibi iki kriterin kesişimine uyan futbolcuyu bulman gerekir.", "Ranked Arena'da gerçek rakip arayabilir ve tamamlanan oyuncuya karşı dereceli maçlarda ELO puanın için mücadele edebilirsin. Rakip bulunamadığında Bot Eren ile antrenman maçı oynanabilir; bot maçı ELO'yu değiştirmez."] },
        { title: "Penaltı ve refleks oyunları", paragraphs: ["FootBattle Penaltı, futbol bilgisinden çok karar verme ve refleks üzerine kurulu hızlı bir oyun modudur. Penaltı At modunda kaleciyi geçmeye çalışır, Kaleci Ol modunda şut yönünü okuyup doğru köşeye uzanırsın.", "Arkadaşınla Oyna modunda ise aynı cihazı sırayla kullanarak şutör ve kaleci rollerini paylaşırsın."], bullets: ["Penaltı At", "Kaleci Ol", "Arkadaşınla Oyna", "10 şutluk kısa turlar"] },
        { title: "Futbol bilgi ve kariyer oyunları", paragraphs: ["Player Quiz, Career Path, Transfer Quiz ve kesişim oyunları daha geniş futbol hafızası ister. Bir oyuncunun hangi kulüplerde oynadığını, hangi ülkeyi temsil ettiğini veya farklı kriterlere uyup uymadığını bilmek avantaj sağlar."] },
        { title: "Halısaha ve kadro araçları", paragraphs: ["FootBattle sadece quizlerden oluşmaz. Halısaha kadro kurma, maç planlama ve takım ayırma araçları gerçek maç organizasyonunu da kolaylaştırır.", "Böylece siteye yalnız oyun oynamak için değil, halısaha organizasyonu yapmak için de gelebilirsin."] }
      ]}
      faqs={[
        { question: "FootBattle'daki futbol oyunları ücretsiz mi?", answer: "Evet. FootBattle'daki ana futbol oyunlarını tarayıcıdan ücretsiz oynayabilirsin." },
        { question: "Online rakibe karşı futbol oyunu oynanabilir mi?", answer: "Evet. Ranked Arena desteklenen rekabetçi oyunlarda rakip bulmana ve dereceli maç oynamana imkan verir." },
        { question: "Telefondan futbol oyunu oynanabilir mi?", answer: "Evet. FootBattle oyunları mobil tarayıcılar düşünülerek tasarlanmıştır." },
        { question: "Hangi futbol oyunları var?", answer: "Guess the Player, Süper Lig Futbolcu Tahmin, Football Wordle, Ranked Futbol Tic Tac Toe, Player Quiz, Career Path, Transfer Quiz, Penaltı ve başka futbol oyunları bulunur." }
      ]}
      relatedLinks={[
        { href: "/tr/guess-the-player/super-lig", label: "Süper Lig Futbolcu Tahmin Oyunu", description: "Aktif Süper Lig oyuncularını ipuçlarından tahmin et." },
        { href: "/tr/wordle", label: "Football Wordle", description: "Futbolcunun soyadını sınırlı tahminde bul." },
        { href: "/tr/tic-tac-toe", label: "Futbol Tic Tac Toe", description: "3x3 futbol grid'ini çöz ve rekabetçi modları keşfet." },
        { href: "/tr/rank", label: "Ranked Arena", description: "Rakip bul, dereceli maç oyna ve ELO sıralamasında yüksel." },
        { href: "/tr/guess-the-player", label: "Futbolcu Tahmin Oyunu", description: "İpuçlarıyla gizli futbolcuyu bul." },
        { href: "/penalty", label: "Penaltı Oyunu", description: "Penaltı at, kaleci ol veya arkadaşınla oyna." }
      ]}
    />
  </>;
}
