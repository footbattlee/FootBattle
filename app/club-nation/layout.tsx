import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const title = "Takım ve Millet Futbol Oyunu | Club Nation | FootBattle";
const description = "Verilen takım ve milliyet kesişimine uyan futbolcuyu bul. Kulüp ve ülke bilgisini test eden Club Nation futbol oyununu ücretsiz oyna.";

export const metadata = createGameMetadata({
  path: "/club-nation",
  title,
  description,
  keywords: ["takım millet futbol oyunu", "club nation", "futbolcu bulma oyunu", "futbol quiz", "kulüp ülke futbolcu"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}<GameJsonLd name="Club Nation" description={description} path="/club-nation" /></>;
}
