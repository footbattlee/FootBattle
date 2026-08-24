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

    let cancelled = false;
    let timer: number | null = null;
    let inFlight = false;

    const schedule = () => {
      if (cancelled) return;
      timer = window.setTimeout(() => void tick(), POLL_MS);
    };

    async function tick() {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const challengeResponse = await fetch(`/api/challenges/${encodeURIComponent(token)}`, { cache: "no-store" });
        const challenge = await challengeResponse.json().catch(() => ({})) as ChallengeInfo;
        const gameCode = challenge.challenge?.gameCode ?? null;

        if (gameCode === "club_nation") {
          await fetch("/api/rank/club-nation-bot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          }).catch(() => null);
        }

        const syncResponse = await fetch("/api/rank/challenge-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const sync = await syncResponse.json().catch(() => ({})) as SyncResponse;
        if (sync.ok && sync.completed) return;
      } catch {
        // Shared challenge page has its own error handling. This bridge retries quietly.
      } finally {
        inFlight = false;
      }
      schedule();
    }

    void tick();
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [ranked, token]);

  return null;
}
