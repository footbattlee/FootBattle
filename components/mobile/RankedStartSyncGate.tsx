"use client";

import { useEffect, useState } from "react";

type StartResponse = { ok?: boolean; startsAt?: string | null; opponentKind?: string; error?: string };

export default function RankedStartSyncGate() {
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ranked = params.get("ranked") === "1";
    const matchId = params.get("match");
    if (!ranked || !matchId) return;

    let cancelled = false;
    let interval: number | null = null;

    void fetch(`/api/rank/match/${encodeURIComponent(matchId)}/start`, { cache: "no-store" })
      .then((r) => r.json() as Promise<StartResponse>)
      .then((result) => {
        if (cancelled || !result.ok || result.opponentKind !== "human" || !result.startsAt) return;
        const target = new Date(result.startsAt).getTime();
        const update = () => {
          const leftMs = target - Date.now();
          if (leftMs <= 0) {
            setVisible(false);
            setCountdown(0);
            if (interval) window.clearInterval(interval);
            return;
          }
          setVisible(true);
          setCountdown(Math.max(1, Math.ceil(leftMs / 1000)));
        };
        update();
        interval = window.setInterval(update, 100);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (interval) window.clearInterval(interval);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[350] flex items-center justify-center bg-[#07111f]/95 px-5 text-center text-white backdrop-blur-sm">
      <div className="rounded-3xl border border-green-400/25 bg-[#101c2c] px-8 py-7 shadow-2xl">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-green-300">Rakip bulundu</p>
        <h2 className="mt-2 text-2xl font-black">Maç birlikte başlıyor</h2>
        <div className="mt-5 text-6xl font-black tabular-nums text-green-300">{countdown}</div>
        <p className="mt-3 text-sm text-slate-400">İki oyuncu aynı anda oyuna girecek.</p>
      </div>
    </div>
  );
}
