"use client";

import { useEffect } from "react";

const HEARTBEAT_INTERVAL_MS = 90_000;
const MIN_IMMEDIATE_GAP_MS = 20_000;

export default function PresenceHeartbeat() {
  useEffect(() => {
    let intervalId: number | null = null;
    let lastSentAt = 0;
    let inFlight = false;

    async function sendHeartbeat(force = false) {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (!force && now - lastSentAt < MIN_IMMEDIATE_GAP_MS) return;
      if (inFlight) return;

      inFlight = true;
      try {
        const response = await fetch("/api/presence/heartbeat", {
          method: "POST",
          cache: "no-store",
          keepalive: true,
        });
        if (response.ok) lastSentAt = Date.now();
      } catch {
        // Presence best-effort çalışır; ağ hatası UI'ı yavaşlatmamalı.
      } finally {
        inFlight = false;
      }
    }

    function stopTimer() {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    }

    function startTimer() {
      stopTimer();
      if (document.visibilityState !== "visible") return;
      intervalId = window.setInterval(() => {
        void sendHeartbeat();
      }, HEARTBEAT_INTERVAL_MS);
    }

    if (document.visibilityState === "visible") {
      void sendHeartbeat(true);
      startTimer();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void sendHeartbeat(true);
        startTimer();
      } else {
        stopTimer();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
