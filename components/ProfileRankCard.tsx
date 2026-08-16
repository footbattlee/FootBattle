"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type RankMe = {
  position: number | null;
  lp: number;
  peakLp: number;
  rankName: string;
  rankIcon: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  progressPercent: number;
  nextRankName: string | null;
  nextRankLp: number | null;
};

type Response = {
  ok?: boolean;
  season?: { title?: string } | null;
  me?: RankMe | null;
};

function fmt(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

export default function ProfileRankCard() {
  const [data, setData] = useState<Response | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/rank/leaderboard", { cache: "no-store" })
      .then((r) => r.json())
      .then((result: Response) => {
        if (!cancelled && result.ok) setData(result);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  if (!data?.me) return null;
  const me = data.me;
  const nextTarget = me.nextRankLp ?? me.lp;
  const rangeLabel = me.nextRankName ? `${fmt(me.lp)} / ${fmt(nextTarget)} LP` : `${fmt(me.lp)} LP`;

  return (
    <section className="bg-[#07111f] px-5 pt-7 text-white sm:px-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[28px] border border-yellow-400/20 bg-gradient-to-br from-yellow-400/[0.08] via-[#0b1727] to-green-400/[0.045] p-5 shadow-xl sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <Image src={me.rankIcon} alt={me.rankName} width={112} height={112} className="h-24 w-24 shrink-0 object-contain sm:h-28 sm:w-28" priority />
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-yellow-300">{data.season?.title ?? "Aktif Sezon"}</p>
              <h2 className="mt-1 text-3xl font-black sm:text-4xl">{me.rankName}</h2>
              <p className="mt-1 text-sm font-bold text-slate-400">{rangeLabel}</p>
            </div>
          </div>

          <div className="min-w-0 flex-1 sm:pl-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Sezon LP</p>
                <p className="mt-1 text-3xl font-black text-yellow-200">{fmt(me.lp)}</p>
              </div>
              <div className="text-right text-xs font-bold text-slate-500">
                <p>{me.position ? `#${me.position} sıradasın` : "İlk 100 için savaş"}</p>
                <p className="mt-1">Zirve: {fmt(me.peakLp)} LP</p>
              </div>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-yellow-400 transition-all" style={{ width: `${me.progressPercent}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs font-bold">
              <span className="text-slate-500">{me.nextRankName ? `Sıradaki: ${me.nextRankName}` : "GOAT zirvesindesin"}</span>
              <Link href="/rank" className="text-yellow-300 transition hover:text-yellow-200">Rank Arenası →</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
