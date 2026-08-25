import Link from "next/link";

import HalisahaMobileEnhancer from "@/components/halisaha/HalisahaMobileEnhancer";
import HalisahaShareButtonGuard from "@/components/halisaha/HalisahaShareButtonGuard";
import { createGameMetadata } from "@/lib/seo";

const title = "Halısaha Kadro Kurma | Ücretsiz Takım Oluşturucu | FootBattle";
const description = "Halısaha maçın için kadro oluştur. Oyuncuları ekle, takımları kur, dengele ve kadronu arkadaşlarınla tek link üzerinden paylaş.";

export const metadata = createGameMetadata({
  path: "/halisaha-kadro",
  title,
  description,
  keywords: [
    "halısaha kadro",
    "halısaha kadro kurma",
    "halısaha takım kurma",
    "halısaha kadro oluşturucu",
    "takım dengeleme",
  ],
});

export default function HalisahaKadroLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <HalisahaMobileEnhancer />
      <HalisahaShareButtonGuard />
      <Link
        href="/halisaha-mac"
        className="fixed bottom-[max(16px,env(safe-area-inset-bottom))] right-4 z-50 hidden min-h-12 items-center gap-2 rounded-full border border-yellow-300/30 bg-yellow-400 px-5 py-3 text-sm font-black text-[#07111f] shadow-2xl shadow-black/40 transition hover:bg-yellow-300 sm:right-6 sm:inline-flex"
        aria-label="Yeni halısaha maçı oluştur"
      >
        ⚽ Maç Oluştur
      </Link>
    </>
  );
}