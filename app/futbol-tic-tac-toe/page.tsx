import SeoLandingPage from "@/components/SeoLandingPage";
import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const description = "Futbol Tic Tac Toe oyna: kulüp, ülke ve futbolcu bilgini kullanarak 3x3 tahtada doğru oyuncuları bul, stratejik hamlelerle kazan.";

export const metadata = createGameMetadata({
  path: "/futbol-tic-tac-toe",
  title: "Futbol Tic Tac Toe Oyunu | FootBattle",
  description,
  keywords: ["futbol tic tac toe", "football tic tac toe", "futbol bilgi oyunu", "kulüp ülke futbolcu", "futbol xox"],
});

export default function Page() {
  return <>
    <GameJsonLd name="FootBattle Futbol Tic Tac Toe" description={description} path="/futbol-tic-tac-toe" />
    <SeoLandingPage
      eyebrow="Bilgi + strateji"
      title="Futbol Tic Tac Toe"
      intro="Klasik 3x3 Tic Tac Toe mantığını futbol bilgisiyle birleştir. Satır ve sütun kriterlerine uyan doğru futbolcuyu bul, rakibinden önce üçlü yap ve tahtayı kazan."
      ctaHref="/tr/tic-tac-toe"
      ctaLabel="Tic Tac Toe Oyna ⭕"
      sections={[
        { title: "Nasıl oynanır?", paragraphs: ["Her hücre iki futbol kriterinin kesişimidir. Örneğin bir kulüp ile bir ülkenin kesiştiği kareye iki koşulu da karşılayan bir futbolcu yazman gerekir.", "Doğru cevabı bulmak tek başına yetmez; hangi kareyi ne zaman oynadığın da önemlidir. Böylece futbol bilgisi ile klasik Tic Tac Toe stratejisi birleşir."] },
        { title: "Hangi bilgiler işe yarar?", paragraphs: ["Oyuncuların kulüp geçmişi, milliyeti, lig tecrübesi ve transfer kariyeri bu oyunda avantaj sağlar. Sadece güncel kadroları değil, geçmiş sezonları da hatırlamak gerekebilir."], bullets: ["Kulüp geçmişi", "Milliyet", "Lig bilgisi", "Transfer kariyeri", "Stratejik hamle"] },
        { title: "Tek başına veya rekabet için", paragraphs: ["Tahtaları çözerek futbol hafızanı test edebilir, skorunu arkadaşlarınla karşılaştırabilir veya düello formatlarında doğrudan rekabete girebilirsin."] }
      ]}
      faqs={[
        { question: "Futbol Tic Tac Toe nasıl oynanır?", answer: "Satır ve sütun kriterlerinin ikisine de uyan futbolcuyu ilgili hücreye girersin. Amaç klasik Tic Tac Toe gibi üç hücreyi hizalamaktır." },
        { question: "Futbolcular geçmişte oynamış olabilir mi?", answer: "Evet. Kariyer geçmişi kriterleri karşılıyorsa eski kulüpler de kullanılabilir." },
        { question: "Telefondan oynanır mı?", answer: "Evet. FootBattle Tic Tac Toe mobil tarayıcıdan oynanabilir." }
      ]}
      relatedLinks={[
        { href: "/futbol-bilgi-yarismasi", label: "Futbol Bilgi Yarışması", description: "Diğer futbol bilgi oyunlarını keşfet." },
        { href: "/futbolcu-tahmin-oyunu", label: "Futbolcu Tahmin Oyunu", description: "İpuçlarından gizli futbolcuyu bul." },
        { href: "/super-lig-quiz", label: "Süper Lig Quiz", description: "Türk futbolu hafızanı test et." }
      ]}
    />
  </>;
}
