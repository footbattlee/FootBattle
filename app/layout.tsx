import type { Metadata } from "next";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";
import "./halisaha-mobile-fix.css";
import "./club-clash-mobile.css";
import "./club-nation-mobile.css";
import "./mobile-game-fixes.css";
import "./mobile-home-dashboard.css";
import "./mobile-input-fixes.css";
import "./must-mobile-fixes.css";
import "./ranked-mobile-fixes.css";

import PresenceHeartbeat from "@/components/PresenceHeartbeat";
import HomeProgressionSpotlight from "@/components/HomeProgressionSpotlight";
import HomeTicTacToeDuelEnhancer from "@/components/HomeTicTacToeDuelEnhancer";
import HomeSuperLigAndMobileOrder from "@/components/HomeSuperLigAndMobileOrder";
import GuessThePlayerSearchEnhancer from "@/components/GuessThePlayerSearchEnhancer";
import GlobalShareEnhancer from "@/components/GlobalShareEnhancer";
import GameResultArena from "@/components/GameResultArena";
import RankResultToast from "@/components/RankResultToast";
import ReferralClaimObserver from "@/components/ReferralClaimObserver";
import FootballLocaleBridge from "@/components/FootballLocaleBridge";
import WordlePhysicalKeyboard from "@/components/WordlePhysicalKeyboard";
import GlobalLegalFooter from "@/components/GlobalLegalFooter";
import AdminBackButton from "@/components/AdminBackButton";
import MobileAppShell from "@/components/mobile/MobileAppShell";
import PushTokenSync from "@/components/mobile/PushTokenSync";
import MobileHomeDashboard from "@/components/mobile/MobileHomeDashboard";
import GuessThePlayerMobileAutoScroll from "@/components/mobile/GuessThePlayerMobileAutoScroll";
import MobileKeyboardGuard from "@/components/mobile/MobileKeyboardGuard";
import DirectDuelLinkInvite from "@/components/mobile/DirectDuelLinkInvite";
import ClubClashChallengeUX from "@/components/mobile/ClubClashChallengeUX";
import ClubNationMobileSkin from "@/components/mobile/ClubNationMobileSkin";
import AndroidNetworkGuard from "@/components/mobile/AndroidNetworkGuard";
import RankedMatchChromeFix from "@/components/mobile/RankedMatchChromeFix";
import RankedReconnectBanner from "@/components/mobile/RankedReconnectBanner";
import RankedSharedChallengeBridge from "@/components/mobile/RankedSharedChallengeBridge";
import DuelRematchConsentBridge from "@/components/mobile/DuelRematchConsentBridge";
import RankedStartSyncGate from "@/components/mobile/RankedStartSyncGate";
import ClubNationResultUX from "@/components/mobile/ClubNationResultUX";
import { SITE_URL, SiteJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "FootBattle | Futbol Oyunları, Quizler ve Arkadaş Kapışmaları", template: "%s | FootBattle" },
  description: "FootBattle (PlayFootBattle), playfootbattle.com üzerinde ücretsiz oynanan futbol oyunları ve quiz platformudur. Guess The Player, Futbol Wordle, Tic Tac Toe, Career Path, Transfer Quiz ve arkadaş kapışmalarını oyna.",
  applicationName: "FootBattle",
  keywords: ["FootBattle", "PlayFootBattle", "Play FootBattle", "playfootbattle", "playfootbattle.com", "futbol oyunları", "futbol quiz", "football quiz", "futbolcu tahmin oyunu", "futbol bilgi yarışması"],
  authors: [{ name: "FootBattle", url: SITE_URL }],
  creator: "FootBattle",
  publisher: "FootBattle",
  openGraph: { type: "website", locale: "tr_TR", siteName: "FootBattle", title: "FootBattle | Futbol Oyunları Arenası", description: "FootBattle (PlayFootBattle), playfootbattle.com üzerinde futbol bilgini test edebileceğin bağımsız futbol oyunları ve quiz platformudur.", url: SITE_URL, images: [{ url: "/footbattle-logo.png", alt: "FootBattle - PlayFootBattle futbol oyunları platformu" }] },
  twitter: { card: "summary_large_image", title: "FootBattle | Futbol Oyunları Arenası", description: "PlayFootBattle'da futbol oyunları, quizler, düellolar ve günlük kapışmalar.", images: ["/footbattle-logo.png"] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  category: "games",
  // Keep the publisher verification meta globally, but do not load Auto Ads on
  // application/session screens during the AdSense cleanup phase.
  other: { "google-adsense-account": "ca-pub-2192914861529531" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>
        <SiteJsonLd />
        <FootballLocaleBridge />
        <PresenceHeartbeat />
        <ReferralClaimObserver />
        <GlobalShareEnhancer />
        <HomeProgressionSpotlight />
        {children}
        <MobileHomeDashboard />
        <MobileAppShell />
        <PushTokenSync />
        <Suspense fallback={null}>
          <RankedMatchChromeFix />
          <RankedReconnectBanner />
          <RankedSharedChallengeBridge />
        </Suspense>
        <MobileKeyboardGuard />
        <DirectDuelLinkInvite />
        <ClubClashChallengeUX />
        <ClubNationMobileSkin />
        <ClubNationResultUX />
        <DuelRematchConsentBridge />
        <RankedStartSyncGate />
        <AndroidNetworkGuard />
        <GuessThePlayerMobileAutoScroll />
        <HomeSuperLigAndMobileOrder />
        <GuessThePlayerSearchEnhancer />
        <AdminBackButton />
        <GlobalLegalFooter />
        <WordlePhysicalKeyboard />
        <GameResultArena />
        <RankResultToast />
        <HomeTicTacToeDuelEnhancer />
        <Analytics />
      </body>
    </html>
  );
}
