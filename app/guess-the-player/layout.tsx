import type { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Futbolcu Tahmin Oyunu | Guess The Player | FootBattle",

  description:
    "Kulüp, yaş, pozisyon ve milliyet ipuçlarıyla gizli futbolcuyu tahmin et. Play Guess The Player online on FootBattle.",

  keywords: [
    "futbolcu tahmin oyunu",
    "guess the player",
    "football quiz",
    "soccer quiz",
    "futbol bilgi oyunu",
    "football guessing game",
  ],
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}