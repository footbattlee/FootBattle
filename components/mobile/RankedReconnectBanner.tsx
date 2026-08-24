"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type ActiveMatch = { id: string; gameCode: string; opponentKind: "human" | "bot"; botName?: string | null; updatedAt?: string | null };

const RECONNECT_MS = 30_000;
const HEARTBEAT_MS = 20_000;
const STORAGE_KEY = "footbattle_ranked_left_at";

function localeFromPath(pathname: string) {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "tr";
}

export default function RankedReconnectBanner() {
  const pathname = usePathname();
  const search = useSearchParams();
  const locale = localeFromPath(pathname);
  const tr = locale === "tr";
  const matchId = search.get("match");
  const isRankedGame = search.get("ranked") === "1" && Boolean(matchId);
  const onRankPage = pathname === `/${locale}/rank` || pathname === "/rank";
  const [active, setActive] = useState<ActiveMatch | null>(null);
  const [remaining, setRemaining] = useState(0);
  const wasRankedGame = useRef(false);

  const returnHref = useMemo(() => active ? `/${locale}/rank/match/${encodeURIComponent(active.id)}` : `/${locale}/rank`, [active, locale]);

  useEffect(() => {
    if (isRankedGame && matchId) {
      wasRankedGame.current = true;
      localStorage.removeItem(STORAGE_KEY);
      const beat = () => {
        if (document.visibilityState !== "visible") return;
        void fetch("/api/rank/active", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchId }),
          keepalive: true,
        }).catch(() => undefined);
      };
      beat();
      const timer = window.setInterval(beat, HEARTBEAT_MS);
      return () => window.clearInterval(timer);
    }

    if (wasRankedGame.current) {
      wasRankedGame.current = false;
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }
  }, [isRankedGame, matchId]);

  useEffect(() => {
    if (isRankedGame) return;
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch("/api/rank/active", { cache: "no-store" });
        if (!r.ok) return;
        const body = await r.json();
        if (!cancelled) setActive(body?.match ?? null);
      } catch { /* best effort */ }
    };
    void load();
    const timer = window.setInterval(load, 20_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [isRankedGame, pathname]);

  useEffect(() => {
    if (isRankedGame || !active) { setRemaining(0); return; }
    const tick = () => {
      const leftAt = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
      const left = leftAt ? Math.max(0, RECONNECT_MS - (Date.now() - leftAt)) : 0;
      setRemaining(Math.ceil(left / 1000));
    };
    tick();
    const timer = window.setInterval(tick, 500);
    return () => window.clearInterval(timer);
  }, [active, isRankedGame]);

  if (isRankedGame || !active) return null;

  const gameLabel = active.gameCode === "club_clash" ? (tr ? "2 Takım 1 Oyuncu" : "2 Clubs 1 Player") : "Tic Tac Toe";

  if (onRankPage) {
    return (
      <Link href={returnHref} className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+10px)] z-[140] mx-auto max-w-xl rounded-2xl border border-green-400/30 bg-[#0d1828]/95 px-4 py-3 shadow-2xl backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-green-300">🏆 {tr ? "Devam Eden Ranked Maç" : "Active Ranked Match"}</p><p className="mt-1 text-sm font-black text-white">{gameLabel}{active.opponentKind === "bot" ? ` · ${active.botName ?? "Bot Eren :)"}` : ""}</p></div>
          <span className="rounded-xl bg-green-400 px-3 py-2 text-xs font-black text-[#07111f]">{tr ? "Maça Dön" : "Resume"}</span>
        </div>
      </Link>
    );
  }

  if (remaining <= 0) return null;

  return (
    <Link href={returnHref} className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+10px)] z-[140] mx-auto max-w-md rounded-2xl border border-green-400/35 bg-[#0d1828]/95 px-4 py-3 shadow-2xl backdrop-blur-xl md:hidden">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-xs font-black text-green-300">🏆 {tr ? "Ranked maçın devam ediyor" : "Your ranked match is active"}</p><p className="mt-0.5 text-[11px] text-slate-400">{tr ? `${remaining} sn içinde hızlıca geri dön` : `Return within ${remaining}s`}</p></div>
        <span className="rounded-xl bg-green-400 px-3 py-2 text-xs font-black text-[#07111f]">{tr ? "Maça Dön" : "Resume"}</span>
      </div>
    </Link>
  );
}
