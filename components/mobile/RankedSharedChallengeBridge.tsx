"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const POLL_MS = 1200;

type ChallengeInfo = { ok?: boolean; challenge?: { gameCode?: string; status?: string } };
type SyncResponse = { ok?: boolean; completed?: boolean };

export default function RankedSharedChallengeBridge() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ranked = searchParams.get("ranked") === "1";
  const token = useMemo(() => pathname.match(/^\/challenge\/([a-zA-Z0-9]+)$/)?.[1] ?? null, [pathname]);

  useEffect(() => {
    if (!ranked || !token) return;
    const activeToken = token;

    let cancelled = false;
    let timer: number | null = null;
    let inFlight = false;

    async function tick() {
      if (cancelled || inFlight) return;
      inFlight = true;
      let shouldContinue = true;
      try {
        const challengeResponse = await fetch(`/api/challenges/${encodeURIComponent(activeToken)}`, { cache: "no-store" });
        const challenge = await challengeResponse.json().catch(() => ({})) as ChallengeInfo;
        const gameCode = challenge.challenge?.gameCode ?? null;

        if (gameCode === "club_nation") {
          await fetch("/api/rank/club-nation-bot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: activeToken }),
          }).catch(() => null);
        }

        const syncResponse = await fetch("/api/rank/challenge-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: activeToken }),
        });
        const sync = await syncResponse.json().catch(() => ({})) as SyncResponse;
        if (sync.ok && sync.completed) shouldContinue = false;
      } catch {
        // Shared challenge page has its own error handling. This bridge retries quietly.
      } finally {
        inFlight = false;
      }

      if (!cancelled && shouldContinue) {
        timer = window.setTimeout(() => void tick(), POLL_MS);
      }
    }

    void tick();
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [ranked, token]);

  return null;
}
