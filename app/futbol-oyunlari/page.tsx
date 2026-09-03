import SeoLandingPage from "@/components/SeoLandingPage";
import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const description = "Ücretsiz futbol oyunları oyna: penaltı, futbolcu tahmin, Football Wordle, futbol quiz, Tic Tac Toe, Career Path, Günün Kapışması ve Survivor tek yerde.";

export const metadata = createGameMetadata({ path: "/futbol-oyunlari", title: "Ücretsiz Futbol Oyunları Oyna | FootBattle", description, keywords: ["futbol oyunları", "online futbol oyunları", "penaltı oyunu", "futbol quiz", "futbolcu tahmin", "football wordle", "futbol bilgi oyunu"] });

export default function Page() {
  return <>
    <GameJsonLd name="FootBattle Futbol Oyunları" description={description} path="/futbol-oyunlari" />
    <SeoLandingPage eyebrow="Futbolu biliyorsan kanıtla" title="Ücretsiz Futbol Oyunları" intro="FootBattle, futbol bilgisi, refleks ve arkadaş rekabetini kısa oyunlarda buluşturan bir futbol oyunları platformu. Penaltı at veya kaleci ol, futbolcu tahmin et, Wordle çöz, kariyer yolundan oyuncu bul, Tic Tac Toe oyna, kapışmalarda oy ver veya 16'lı Survivor turnuvasında kendi şampiyonunu çıkar." ctaHref="/" ctaLabel="Tüm Oyunları Gör ⚽"
      sections={[
        { title: "Penaltı ve refleks oyunları", paragraphs: ["FootBattle Penaltı, futbol bilgisinden çok karar verme ve refleks üzerine kurulu hızlı bir oyun modudur. Penaltı At modunda kaleciyi geçmeye çalışır, Kaleci Ol modunda şut yönünü okuyup doğru köşeye uzanırsın.", "Arkadaşınla Oyna modunda ise aynı cihazı sırayla kullanarak şutör ve kaleci rollerini paylaşırsın."], bullets: ["Penaltı At", "Kaleci Ol", "Arkadaşınla Oyna", "10 şutluk kısa turlar"] },
        { title: "Futbolcu tahmin oyunları", paragraphs: ["Guess The Player, Süper Lig Futbolcu Tahmin, Football Wordle ve Career Path gibi oyunlarda hedef doğru futbolcuyu mümkün olduğunca hızlı bulmaktır. Her oyun farklı bir futbol bilgisini öne çıkarır.", "Transfer Oyunu ise eski ve yeni kulüp, transfer ücreti ve sezon ipuçlarından doğru futbolcuyu bulmanı ister."], bullets: ["Guess The Player", "Süper Lig Futbolcu Tahmin", "Football Wordle", "Career Path", "Transfer Oyunu"] },
        { title: "Futbol bilgi ve kesişim oyunları", paragraphs: ["Player Quiz, Kulüp x Ülke ve Futbol Tic Tac Toe daha geniş futbol hafızası ister. Bir oyuncunun hangi kulüplerde oynadığını, hangi ülkeyi temsil ettiğini veya iki farklı kritere aynı anda uyup uymadığını bilmek avantaj sağlar.", "Futbol Tic Tac Toe formatında sadece doğru futbolcuyu bilmek yetmez; tahtadaki hamleni de planlaman gerekir."] },
        { title: "Seçim ve tartışma oyunları", paragraphs: ["Günün Kapışması ve Survivor modlarında tek bir doğru cevap yoktur. Burada futbol zevkin devreye girer.", "Bu oyunlar paylaşım ve arkadaşlarla karşılaştırma için uygundur."], bullets: ["Günün Kapışması", "Futbol Survivor", "Sonuç paylaşımı", "Arkadaşlarla karşılaştırma"] },
        { title: "Halısaha ve kadro araçları", paragraphs: ["FootBattle sadece quizlerden oluşmaz. Halısaha kadro kurma, maç planlama ve takım ayırma araçları gerçek maç organizasyonunu da kolaylaştırır.", "Böylece siteye yalnız oyun oynamak için değil, halısaha organizasyonu yapmak için de gelebilirsin."] }
      ]}
      faqs={[
        { question: "FootBattle'daki futbol oyunları ücretsiz mi?", answer: "Evet. Ana futbol oyunlarını tarayıcıdan ücretsiz oynayabilirsin." },
        { question: "Penaltı oyunu var mı?", answer: "Evet. FootBattle Penaltı'da penaltı atabilir, kaleci olabilir veya aynı cihazda arkadaşınla penaltı düellosu oynayabilirsin." },
        { question: "Telefondan futbol oyunu oynanabilir mi?", answer: "Evet. FootBattle oyunları mobil tarayıcılar düşünülerek tasarlanmıştır." },
        { question: "Hangi futbol oyunları var?", answer: "Penaltı, Guess The Player, Süper Lig Futbolcu Tahmin, Player Quiz, Football Wordle, Career Path, Tic Tac Toe, Transfer Oyunu, Günün Kapışması ve Survivor gibi modlar bulunur." }
      ]}
      relatedLinks={[
        { href: "/super-lig-futbolcu-tahmin", label: "Süper Lig Futbolcu Tahmin Oyunu", description: "Aktif Süper Lig oyuncularını ipuçlarından tahmin et." },
        { href: "/transfer-quiz", label: "Transfer Oyunu", description: "Transfer ipuçlarından doğru futbolcuyu bul." },
        { href: "/futbol-tic-tac-toe", label: "Futbol Tic Tac Toe", description: "Kulüp ve ülke kesişimlerinde doğru futbolcuyu bul." },
        { href: "/futbolcu-tahmin-oyunu", label: "Futbolcu Tahmin Oyunu", description: "İpuçlarıyla gizli futbolcuyu bul." },
        { href: "/penalty", label: "Penaltı Oyunu", description: "Penaltı at, kaleci ol veya arkadaşınla düello yap." }
      ]}
    />
  </>;
}
