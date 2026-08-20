import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";
import "./halisaha-mobile-fix.css";

import PresenceHeartbeat from "@/components/PresenceHeartbeat";
import HomeProgressionSpotlight from "@/components/HomeProgressionSpotlight";
import HomeQuickAccess from "@/components/HomeQuickAccess";
import HomeTicTacToeDuelEnhancer from "@/components/HomeTicTacToeDuelEnhancer";
import HomeSuperLigAndMobileOrder from "@/components/HomeSuperLigAndMobileOrder";
import GuessThePlayerSearchEnhancer from "@/components/GuessThePlayerSearchEnhancer";
import GlobalShareEnhancer from "@/components/GlobalShareEnhancer";
import ChallengeQuickShare from "@/components/ChallengeQuickShare";
import GameResultArena from "@/components/GameResultArena";
import RankResultToast from "@/components/RankResultToast";
import ReferralClaimObserver from "@/components/ReferralClaimObserver";
import FootballLocaleBridge from "@/components/FootballLocaleBridge";
import WordlePhysicalKeyboard from "@/components/WordlePhysicalKeyboard";
import GlobalLegalFooter from "@/components/GlobalLegalFooter";
import AdminBackButton from "@/components/AdminBackButton";
import MobileAppShell from "@/components/mobile/MobileAppShell";
import { SITE_URL, SiteJsonLd } from "@/lib/seo";

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
  other: {
    "google-adsense-account": "ca-pub-2192914861529531",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2192914861529531"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <SiteJsonLd />
        <FootballLocaleBridge />
        <PresenceHeartbeat />
        <ReferralClaimObserver />
        <GlobalShareEnhancer />
        <HomeProgressionSpotlight />
        {children}
        <MobileAppShell />
        <HomeSuperLigAndMobileOrder />
        <GuessThePlayerSearchEnhancer />
        <AdminBackButton />
        <GlobalLegalFooter />
        <WordlePhysicalKeyboard />
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
