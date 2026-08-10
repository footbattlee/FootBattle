import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

import PresenceHeartbeat from "@/components/PresenceHeartbeat";

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

        {children}

        <Analytics />
      </body>
    </html>
  );
}