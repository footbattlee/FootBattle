"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { GameCompletedDetail } from "@/lib/analytics/game-analytics";

type RankSummary = {
  ok?: boolean;
  ready?: boolean;
  rank?: {
    lp: number;
    lpChange: number;
    rankName: string;
    icon: string;
    progressPercent: number;
    nextRankName?: string | null;
    nextRankLp?: number | null;
    promoted?: boolean;
    demoted?: boolean;
    rankBefore?: string;
    rankAfter?: string;
    overtakenFriend?: { name: string; lp: number } | null;
  } | null;
};

export default function RankResultToast() {
  const [rank, setRank] = useState<NonNullable<RankSummary["rank"]> | null>(null);
  const [visible, setVisible] = useState(false);
  const lastKey = useRef("");

  useEffect(() => {
    function onCompleted(event: Event) {
      const detail = (event as CustomEvent<GameCompletedDetail>).detail;
      if (!detail?.sessionId || !detail.gameName) return;
      const key = `${detail.gameName}:${detail.sessionId}`;
      if (lastKey.current === key) return;
      lastKey.current = key;

      window.setTimeout(() => {
        void fetch(`/api/game-results/summary?game=${encodeURIComponent(detail.gameName)}&session=${encodeURIComponent(detail.sessionId!)}`, { cache: "no-store" })
          .then((r) => r.json())
          .then((data: RankSummary) => {
            if (!data.ok || !data.ready || !data.rank) return;
            setRank(data.rank);
            setVisible(true);
            window.setTimeout(() => setVisible(false), 7000);
          })
          .catch(() => undefined);
      }, 1100);
    }
    window.addEventListener("footbattle:game-completed", onCompleted);
    return () => window.removeEventListener("footbattle:game-completed", onCompleted);
  }, []);

  if (!visible || !rank) return null;
  const change = Number(rank.lpChange ?? 0);
  const targetLp = rank.nextRankLp ?? rank.lp;

  return (
    <aside className="fixed bottom-4 right-3 z-[140] w-[calc(100%-24px)] max-w-sm overflow-hidden rounded-2xl border border-yellow-400/25 bg-[#081523]/95 p-4 text-white shadow-2xl backdrop-blur sm:bottom-6 sm:right-6" role="status">
      <button type="button" onClick={() => setVisible(false)} className="absolute right-3 top-2 text-slate-500 hover:text-white">×</button>
      <div className="flex items-center gap-3 pr-4">
        <Image src={rank.icon} alt={rank.rankName} width={76} height={76} className="h-16 w-16 object-contain" />
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-black uppercase tracking-wider ${change >= 0 ? "text-green-300" : "text-red-300"}`}>{change >= 0 ? `+${change}` : change} LP</p>
          <p className="mt-0.5 truncate text-lg font-black">{rank.rankName} · {rank.lp}{rank.nextRankLp ? ` / ${targetLp}` : ""} LP</p>
          {rank.promoted && <p className="mt-1 text-xs font-black text-yellow-300">🎉 Rank atladın: {rank.rankBefore} → {rank.rankAfter}</p>}
          {rank.demoted && <p className="mt-1 text-xs font-black text-red-300">Rank düştü: {rank.rankBefore} → {rank.rankAfter}</p>}
          {rank.overtakenFriend && <p className="mt-1 text-xs font-black text-cyan-300">👥 {rank.overtakenFriend.name} adlı arkadaşını geçtin!</p>}
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-yellow-400" style={{ width: `${rank.progressPercent}%` }} /></div>
      <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-500"><span>{rank.nextRankName ? `Sıradaki ${rank.nextRankName}` : "GOAT zirvesi"}</span><Link href="/rank" className="font-black text-yellow-300">Rank Arenası →</Link></div>
    </aside>
  );
}
