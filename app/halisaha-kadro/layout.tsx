import type { Metadata } from "next";

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
  return children;
}