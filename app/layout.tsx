import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

import PresenceHeartbeat from "@/components/PresenceHeartbeat";
import HomeProgressionSpotlight from "@/components/HomeProgressionSpotlight";
import HomeQuickAccess from "@/components/HomeQuickAccess";
import HomeTicTacToeDuelEnhancer from "@/components/HomeTicTacToeDuelEnhancer";

export const metadata: Metadata = {
  title: "FootBattle",
  description: "Futbol oyunları arenası",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>
        <PresenceHeartbeat />
        <HomeProgressionSpotlight />

        {children}

        <HomeTicTacToeDuelEnhancer />
        <HomeQuickAccess />
        <Analytics />
      </body>
    </html>
  );
}
