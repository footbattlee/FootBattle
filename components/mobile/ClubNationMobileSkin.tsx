"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";

type ChallengeInfo = { ok?: boolean; challenge?: { gameCode?: string } };

export default function ClubNationMobileSkin() {
  const pathname = usePathname();
  const token = useMemo(() => pathname.match(/^\/challenge\/([a-zA-Z0-9]+)$/)?.[1] ?? null, [pathname]);

  useEffect(() => {
    let cancelled = false;

    const apply = (duel: boolean) => {
      document.body.classList.add("club-nation-mobile");
      if (duel) {
        document.body.classList.add("club-nation-duel-mobile");
        // Reuse the same compact challenge treatment already used by 2 Takım 1 Oyuncu.
        document.body.classList.add("club-clash-challenge-mobile");
      }
    };

    const clear = () => {
      document.body.classList.remove("club-nation-mobile", "club-nation-duel-mobile", "club-clash-challenge-mobile");
    };

    clear();
    if (pathname === "/club-nation") {
      apply(false);
      return clear;
    }

    if (!token) return clear;

    void fetch(`/api/challenges/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then((response) => response.json() as Promise<ChallengeInfo>)
      .then((result) => {
        if (!cancelled && result.ok && result.challenge?.gameCode === "club_nation") apply(true);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      clear();
    };
  }, [pathname, token]);

  return null;
}
