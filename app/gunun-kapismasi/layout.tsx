import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const title = "Günün Kapışması | Futbolcu Oylaması | FootBattle";
const description = "Her gün iki futbolcu karşı karşıya geliyor. Favorine oy ver, topluluğun sonucunu gör ve futbol tartışmasına katıl.";

export const metadata = createGameMetadata({
  path: "/gunun-kapismasi",
  title,
  description,
  keywords: ["günün kapışması", "futbolcu oylaması", "kim daha iyi futbolcu", "futbol karşılaştırma", "football face off"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}<GameJsonLd name="Günün Kapışması" description={description} path="/gunun-kapismasi" /></>;
}
