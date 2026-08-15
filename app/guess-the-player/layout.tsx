import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const title = "Futbolcu Tahmin Oyunu | Guess The Player | FootBattle";
const description = "Kulüp, yaş, pozisyon, lig ve milliyet ipuçlarıyla gizli futbolcuyu tahmin et. Guess The Player oyununu ücretsiz oyna ve skorunu paylaş.";

export const metadata = createGameMetadata({
  path: "/guess-the-player",
  title,
  description,
  keywords: ["futbolcu tahmin oyunu", "guess the player", "football guessing game", "futbol quiz", "futbol bilgi oyunu"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}<GameJsonLd name="Guess The Player" description={description} path="/guess-the-player" /></>;
}
