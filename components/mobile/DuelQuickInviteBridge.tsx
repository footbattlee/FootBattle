"use client";

import { useEffect } from "react";

type GameCode = "tic_tac_toe" | "club_clash" | "club_nation";

const labels: Record<GameCode, string[]> = {
  tic_tac_toe: ["Futbol Tic Tac Toe", "Football Tic Tac Toe"],
  club_clash: ["2 Takım 1 Oyuncu", "2 Clubs 1 Player"],
  club_nation: ["1 Takım 1 Millet", "1 Club 1 Nation"],
};

export default function DuelQuickInviteBridge() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("quick") !== "1") return;

    const game = params.get("game") as GameCode | null;
    if (!game || !(game in labels)) return;

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      const wanted = labels[game];
      const button = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((node) => {
        const text = node.textContent?.replace(/\s+/g, " ").trim() ?? "";
        return wanted.some((label) => text.includes(label));
      });

      if (button) {
        window.clearInterval(timer);
        button.click();
        window.setTimeout(() => {
          const dialogHeading = Array.from(document.querySelectorAll<HTMLElement>("h2")).find((node) => {
            const text = node.textContent?.trim() ?? "";
            return text === "Rakibini seç" || text === "Choose rival";
          });
          dialogHeading?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 80);
        return;
      }

      if (attempts >= 25) window.clearInterval(timer);
    }, 80);

    return () => window.clearInterval(timer);
  }, []);

  return null;
}
