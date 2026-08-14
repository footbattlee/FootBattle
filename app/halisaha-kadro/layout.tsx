import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "Halısaha Kadro Kurma | Ücretsiz Takım Oluşturucu - FootBattle",

  description:
    "Halısaha maçın için kadro oluştur. Oyuncuları ekle, takımları kur ve kadronu arkadaşlarınla paylaş. Ücretsiz halısaha kadro oluşturucu.",

  keywords: [
    "halısaha kadro",
    "halısaha kadro kurma",
    "halısaha kadro oluştur",
    "halısaha takım kurma",
    "halısaha takım oluştur",
    "halısaha kadro yapma",
    "halısaha kadro oluşturucu",
    "halısaha takım oluşturucu",
  ],

  alternates: {
    canonical: "/halisaha-kadro",
  },

  openGraph: {
    title:
      "Halısaha Kadro Oluştur | FootBattle",
    description:
      "Oyuncuları ekle, halısaha takımlarını oluştur ve kadronu arkadaşlarınla paylaş.",
    type: "website",
    locale: "tr_TR",
  },

  twitter: {
    card: "summary_large_image",
    title:
      "Halısaha Kadro Oluştur | FootBattle",
    description:
      "Halısaha kadronu ücretsiz oluştur ve arkadaşlarınla paylaş.",
  },
};

export default function HalisahaKadroLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <Link
        href="/halisaha-mac"
        className="fixed bottom-[max(16px,env(safe-area-inset-bottom))] right-4 z-50 inline-flex min-h-12 items-center gap-2 rounded-full border border-yellow-300/30 bg-yellow-400 px-5 py-3 text-sm font-black text-[#07111f] shadow-2xl shadow-black/40 transition hover:bg-yellow-300 sm:right-6"
        aria-label="Yeni halısaha maçı oluştur"
      >
        ⚽ Maç Oluştur
      </Link>
    </>
  );
}
