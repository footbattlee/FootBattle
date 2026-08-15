import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const title = "Futbolcu Kariyer Tahmin Oyunu | Career Path | FootBattle";
const description = "Futbolcunun oynadığı takımları kariyer sırasına göre tahmin et. Career Path futbol oyununda transfer geçmişini ne kadar iyi bildiğini göster.";

export const metadata = createGameMetadata({
  path: "/career-path",
  title,
  description,
  keywords: ["futbolcu kariyer tahmin", "career path football", "futbol transfer oyunu", "futbol quiz", "oyuncu kariyeri"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}<GameJsonLd name="Career Path" description={description} path="/career-path" /></>;
}
