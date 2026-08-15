import { createGameMetadata } from "@/lib/seo";

const title = "Halısaha Maçı Oluştur ve Katılım Topla | FootBattle";
const description = "Halısaha maçını oluştur, tarih-saat ve saha bilgisini paylaş, oyuncuların katılım durumunu tek linkten topla.";

export const metadata = createGameMetadata({
  path: "/halisaha-mac",
  title,
  description,
  keywords: ["halısaha maç oluştur", "halısaha katılım", "halısaha organizasyon", "maç davet linki", "halısaha oyuncu toplama"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
