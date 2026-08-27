import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const title = "Transferi Bil | Futbol Transfer Tahmin Oyunu | FootBattle";
const description = "Eski kulüp, yeni kulüp, transfer ücreti ve sezon ipuçlarından futbolcuyu tahmin et. 2 dakikalık Transferi Bil oyununda transfer bilginle puan topla.";

export const metadata = createGameMetadata({
  path: "/transfer-quiz",
  title,
  description,
  keywords: [
    "transferi bil",
    "futbol transfer tahmin oyunu",
    "futbolcu transfer tahmin",
    "transfer quiz",
    "futbol transfer oyunu",
    "futbolcu tahmin oyunu",
    "football transfer quiz",
  ],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}<GameJsonLd name="Transferi Bil" description={description} path="/transfer-quiz" /></>;
}
