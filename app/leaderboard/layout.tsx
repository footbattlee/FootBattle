import { createGameMetadata } from "@/lib/seo";

const title = "FootBattle Liderlik Tablosu | Futbol Oyunları Sıralaması";
const description = "FootBattle oyuncularının XP, seviye ve oyun performansına göre sıralandığı liderlik tablosunu gör ve kendi sıranı yükselt.";

export const metadata = createGameMetadata({
  path: "/leaderboard",
  title,
  description,
  keywords: ["futbol oyunları liderlik", "FootBattle leaderboard", "futbol quiz sıralama", "futbol oyunları puan"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
