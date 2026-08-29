import type { Metadata } from "next";
import type { ReactNode } from "react";

const canonicalUrl = "https://playfootbattle.com/penalty";

export const metadata: Metadata = {
  title: "Şutör - Futbol Şut Oyunu | FootBattle",
  description:
    "Şutör'de topu geri ve yana çek, hedefini belirle, kaleciyi geç ve 10 şutta en yüksek skoru yap. FootBattle'ın ücretsiz futbol şut oyunu Shot Challenge'ı hemen oyna.",
  keywords: [
    "şut oyunu",
    "futbol şut oyunu",
    "kaleci oyunu",
    "futbol oyunu",
    "şutör",
    "shot challenge",
    "football shooting game",
    "soccer shooting game",
    "FootBattle",
  ],
  alternates: {
    canonical: canonicalUrl,
  },
  openGraph: {
    type: "website",
    url: canonicalUrl,
    siteName: "FootBattle",
    title: "Şutör - Shot Challenge | FootBattle",
    description:
      "Topu geri çek, köşeyi seç ve kaleciyi geç. 10 şutta skorunu yükselt ve FootBattle Şutör'de refleksini göster.",
    images: [
      {
        url: "https://playfootbattle.com/footbattle-logo.png",
        width: 1200,
        height: 630,
        alt: "FootBattle Şutör - Shot Challenge",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Şutör - Shot Challenge | FootBattle",
    description:
      "10 şutta kaleciyi geç, köşeleri hedefle ve en yüksek skoru yap.",
    images: ["https://playfootbattle.com/footbattle-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const gameStructuredData = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  name: "Şutör",
  alternateName: ["Shot Challenge", "FootBattle Şutör"],
  url: canonicalUrl,
  description:
    "FootBattle Şutör, oyuncunun topu geri ve yana çekerek hedef belirlediği, kaleciyi geçmeye çalıştığı 10 şutluk ücretsiz futbol şut oyunudur.",
  applicationCategory: "Game",
  gamePlatform: ["Web", "Android", "Mobile"],
  genre: ["Football", "Sports", "Casual"],
  inLanguage: ["tr", "en"],
  isAccessibleForFree: true,
  publisher: {
    "@type": "Organization",
    name: "FootBattle",
    url: "https://playfootbattle.com",
  },
};

export default function PenaltyLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(gameStructuredData) }}
      />
      {children}
    </>
  );
}
