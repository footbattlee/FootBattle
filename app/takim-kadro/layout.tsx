import type { Metadata } from "next";

import { NO_INDEX_METADATA } from "@/lib/seo";

const title = "Futbol Kadro Kurma | Takım 11'i Oluştur | FootBattle";
const description = "Takımını seç, futbolcuları yerleştir ve kendi ilk 11'ini oluştur. Futbol kadro kurma aracını ücretsiz kullan ve kadronu paylaş.";

export const metadata: Metadata = {
  ...NO_INDEX_METADATA,
  title,
  description,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
