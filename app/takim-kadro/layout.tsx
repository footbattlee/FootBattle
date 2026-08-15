import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const title = "Futbol Kadro Kurma | Takım 11'i Oluştur | FootBattle";
const description = "Takımını seç, futbolcuları yerleştir ve kendi ilk 11'ini oluştur. Futbol kadro kurma aracını ücretsiz kullan ve kadronu paylaş.";

export const metadata = createGameMetadata({
  path: "/takim-kadro",
  title,
  description,
  keywords: ["futbol kadro kurma", "ilk 11 oluştur", "takım kadro", "football lineup builder", "futbol 11 kurma"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}<GameJsonLd name="Takım Kadro Kurma" description={description} path="/takim-kadro" /></>;
}
