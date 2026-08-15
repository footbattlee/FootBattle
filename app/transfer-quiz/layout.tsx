import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const title = "Transfer Quiz | Futbolcu Transfer Tahmin Oyunu | FootBattle";
const description = "Transfer ipuçlarından futbolcuyu tahmin et. Kulüp ve ülke geçmişini kullanarak güncel futbol transfer bilgisini FootBattle Transfer Quiz'de test et.";

export const metadata = createGameMetadata({
  path: "/transfer-quiz",
  title,
  description,
  keywords: ["transfer quiz", "futbol transfer quiz", "futbolcu transfer tahmin", "transfer oyunu", "football transfer quiz"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}<GameJsonLd name="Transfer Quiz" description={description} path="/transfer-quiz" /></>;
}
