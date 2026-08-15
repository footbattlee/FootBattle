import { createGameMetadata, GameJsonLd } from "@/lib/seo";

const title = "Futbol Survivor | 16'lı Eleme Turnuvası | FootBattle";
const description = "16 futbolcu veya takım arasından seçim yap, eleme turnuvasını tamamla ve kendi şampiyonunu belirle. Sonucunu arkadaşlarınla paylaş.";

export const metadata = createGameMetadata({
  path: "/survivor",
  title,
  description,
  keywords: ["futbol survivor", "futbol eleme oyunu", "futbol bracket", "futbolcu turnuvası", "football survivor"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}<GameJsonLd name="Futbol Survivor" description={description} path="/survivor" /></>;
}
