import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const title = "Futbol Wordle | Football Wordle | FootBattle";
const description = "Gizli futbolcunun soyadını harf harf tahmin et. Football Wordle oyununu ücretsiz oyna, serini koru ve sonucunu arkadaşlarınla paylaş.";

export const metadata = createGameMetadata({
  path: "/wordle",
  title,
  description,
  keywords: ["futbol wordle", "football wordle", "soccer wordle", "futbolcu tahmin oyunu", "football guessing game"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}<GameJsonLd name="Futbol Wordle" description={description} path="/wordle" /></>;
}
