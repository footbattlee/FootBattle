"use client";

import { useLayoutEffect } from "react";

type ClubClashResponse = {
  ok?: boolean;
  sessionId?: string;
  durationSeconds?: number;
  completed?: boolean;
};

function getRequestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

export default function ClubClashCompletionTracker() {
  useLayoutEffect(() => {
    const originalFetch = window.fetch.bind(window);
    let activeSessionId = "";
    let finishTimer: ReturnType<typeof setTimeout> | null = null;
    let finishRequestedFor = "";

    const clearFinishTimer = () => {
      if (finishTimer) {
        clearTimeout(finishTimer);
        finishTimer = null;
      }
    };

    const requestFinish = async (sessionId: string) => {
      if (!sessionId || finishRequestedFor === sessionId) return;
      finishRequestedFor = sessionId;

      try {
        const response = await originalFetch("/api/club-clash/finish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
          keepalive: true,
        });

        if (!response.ok) {
          finishRequestedFor = "";
        }
      } catch {
        finishRequestedFor = "";
      }
    };

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await originalFetch(input, init);
      const url = getRequestUrl(input);

      if (
        url.includes("/api/club-clash/start") ||
        url.includes("/api/club-clash/answer") ||
        url.includes("/api/club-clash/pass")
      ) {
        void response
          .clone()
          .json()
          .then((payload: ClubClashResponse) => {
            if (url.includes("/api/club-clash/start") && payload.ok && payload.sessionId) {
              activeSessionId = payload.sessionId;
              finishRequestedFor = "";
              clearFinishTimer();

              const durationSeconds = Math.max(1, Number(payload.durationSeconds ?? 120));
              finishTimer = setTimeout(() => {
                void requestFinish(activeSessionId);
              }, durationSeconds * 1000 + 750);
            }

            if (
              (url.includes("/api/club-clash/answer") || url.includes("/api/club-clash/pass")) &&
              payload.ok &&
              payload.completed &&
              activeSessionId
            ) {
              clearFinishTimer();
              void requestFinish(activeSessionId);
            }
          })
          .catch(() => undefined);
      }

      return response;
    };

    return () => {
      clearFinishTimer();
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
