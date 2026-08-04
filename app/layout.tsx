import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: "FootBattle | Futbol Oyunları Arenası",
  description:
    "Futbol bilgini kanıtla, günlük oyunları çöz ve arkadaşlarına meydan oku.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${geist.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}