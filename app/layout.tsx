import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

import PresenceHeartbeat from "@/components/PresenceHeartbeat";
import HomeProgressionSpotlight from "@/components/HomeProgressionSpotlight";
import HomeQuickAccess from "@/components/HomeQuickAccess";
import HomeTicTacToeDuelEnhancer from "@/components/HomeTicTacToeDuelEnhancer";
import GlobalShareEnhancer from "@/components/GlobalShareEnhancer";
import ChallengeQuickShare from "@/components/ChallengeQuickShare";
import GameResultArena from "@/components/GameResultArena";
import RankResultToast from "@/components/RankResultToast";
import ReferralClaimObserver from "@/components/ReferralClaimObserver";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "FootBattle | Futbol Oyunları, Quizler ve Arkadaş Kapışmaları", template: "%s | FootBattle" },
  description: "Guess The Player, Futbol Wordle, Tic Tac Toe, Career Path, Transfer Quiz, Günün Kapışması ve futbol Survivor oyunlarını ücretsiz oyna. Arkadaşlarına meydan oku.",
  applicationName: "FootBattle",
  keywords: ["futbol oyunları", "futbol quiz", "football quiz", "futbolcu tahmin oyunu", "futbol bilgi yarışması", "FootBattle"],
  alternates: { canonical: SITE_URL },
  openGraph: { type: "website", locale: "tr_TR", siteName: "FootBattle", title: "FootBattle | Futbol Oyunları Arenası", description: "Futbol bilgini test et, arkadaşlarına meydan oku ve her gün yeni futbol kapışmalarına katıl.", url: SITE_URL, images: [{ url: "/footbattle-logo.png", alt: "FootBattle futbol oyunları arenası" }] },
  twitter: { card: "summary_large_image", title: "FootBattle | Futbol Oyunları Arenası", description: "Futbol oyunları, quizler, düellolar ve günlük kapışmalar.", images: ["/footbattle-logo.png"] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  category: "games",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>
        <PresenceHeartbeat />
        <ReferralClaimObserver />
        <GlobalShareEnhancer />
        <HomeProgressionSpotlight />
        {children}
        <GameResultArena />
        <RankResultToast />
        <ChallengeQuickShare />
        <HomeTicTacToeDuelEnhancer />
        <HomeQuickAccess />
        <Analytics />
      </body>
    </html>
  );
}
