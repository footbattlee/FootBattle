import type { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Futbol Wordle | Football Wordle | FootBattle",

  description:
    "Futbolcuların soyadlarını tahmin et. Football Wordle oyununda gizli oyuncuyu bul.",

  keywords: [
    "futbol wordle",
    "football wordle",
    "soccer wordle",
    "futbolcu tahmin oyunu",
  ],
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}