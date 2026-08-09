"use client";

import { useEffect } from "react";

export default function PresenceHeartbeat() {
  useEffect(() => {
    let intervalId: number | null = null;

    async function sendHeartbeat() {
      try {
        const response = await fetch(
          "/api/presence/heartbeat",
          {
            method: "POST",
            cache: "no-store",
          },
        );

        if (!response.ok) {
          return;
        }

        await response.json();
      } catch (error) {
        console.error(
          "Presence heartbeat hatası:",
          error,
        );
      }
    }

    // Site açılınca hemen çalıştır.
    void sendHeartbeat();

    // Her 60 saniyede bir güncelle.
    intervalId = window.setInterval(() => {
      void sendHeartbeat();
    }, 60_000);

    // Kullanıcı sekmeye geri dönerse
    // hemen online bilgisini yenile.
    const handleVisibilityChange = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void sendHeartbeat();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, []);

  return null;
}