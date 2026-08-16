import type { Metadata } from "next";
import RedditLandingClient from "@/components/traffic/RedditLandingClient";

export const metadata: Metadata = {
  title: "Free Football Quiz Games | FootBattle",
  description: "Play Guess the Player, Career Path, Football Survivor and Footballer Wordle for free on FootBattle.",
  alternates: { canonical: "/en/reddit" },
  robots: { index: false, follow: true },
};

export default function RedditLandingPage() {
  return <RedditLandingClient />;
}
