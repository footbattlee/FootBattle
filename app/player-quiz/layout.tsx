import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const title = "Futbolcu Bilgi Yarışması | Player Quiz | FootBattle";
const description = "Futbolcunun ülkesi, kulüpleri, doğum yılı ve kariyer ipuçlarını kullanarak oyuncuyu bul. Ücretsiz futbol bilgi yarışmasını FootBattle'da oyna.";

export const metadata = createGameMetadata({
  path: "/player-quiz",
  title,
  description,
  keywords: ["futbolcu bilgi yarışması", "player quiz", "futbol quiz", "football quiz", "futbol bilgi oyunu"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}<GameJsonLd name="Player Quiz" description={description} path="/player-quiz" /></>;
}
