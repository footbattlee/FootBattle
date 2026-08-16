"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { RANKS } from "@/lib/rank-system";

type Entry = {
  position: number | null;
  userId: string;
  username?: string | null;
  displayName?: string;
  avatarUrl?: string | null;
  lp: number;
  peakLp: number;
  rankCode: string;
  rankName: string;
  rankIcon: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  progressPercent: number;
  nextRankName?: string | null;
  nextRankLp?: number | null;
};

type ResponseData = {
  ok?: boolean;
  error?: string;
  season?: { title: string } | null;
  leaderboard?: Entry[];
  me?: Entry | null;
};

const majorRanks = [
  RANKS.find((r) => r.code === "bronze_3")!, RANKS.find((r) => r.code === "silver_3")!,
  RANKS.find((r) => r.code === "gold_3")!, RANKS.find((r) => r.code === "platinum_3")!,
  RANKS.find((r) => r.code === "diamond_3")!, RANKS.find((r) => r.code === "legend_3")!,
  RANKS.find((r) => r.code === "goat")!,
];

function number(value: number) { return new Intl.NumberFormat("tr-TR").format(value); }

export default function RankPage() {
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/rank/leaderboard", { cache: "no-store" })
      .then((r) => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-black text-slate-400 hover:text-white">← Ana Sayfa</Link>
          <Link href="/leaderboard" className="text-sm font-black text-green-300">Skor Sıralaması →</Link>
        </div>

        <section className="mt-6 rounded-[30px] border border-yellow-400/20 bg-gradient-to-br from-yellow-400/[0.10] via-white/[0.035] to-purple-400/[0.08] p-6 sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-300">FootBattle Rank Arenası</p>
          <h1 className="mt-3 text-4xl font-black sm:text-6xl">Bronzdan GOAT’a çık. 🐐</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">XP kalıcı gelişimini gösterir. LP ise sezonluk rekabet puanındır; anti-cheat onaylı oyunlarda kazanılır veya kaybedilir.</p>
          <p className="mt-3 text-sm font-black text-green-300">{data?.season?.title ?? "Aktif sezon"}</p>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {majorRanks.map((rank) => (
            <div key={rank.code} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-center">
              <Image src={rank.icon} alt={rank.name} width={110} height={110} className="mx-auto h-24 w-24 object-contain" />
              <p className="mt-2 text-sm font-black">{rank.name.replace(" III", "")}</p>
              <p className="mt-1 text-[11px] font-bold text-slate-500">{number(rank.minLp)} LP</p>
            </div>
          ))}
        </section>

        {data?.me && (
          <section className="mt-6 rounded-3xl border border-green-400/25 bg-green-400/[0.06] p-5">
            <div className="flex items-center gap-4">
              <Image src={data.me.rankIcon} alt={data.me.rankName} width={92} height={92} className="h-20 w-20 object-contain" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-wider text-green-300">Senin Rankın</p>
                <div className="mt-1 flex flex-wrap items-end gap-x-3"><h2 className="text-2xl font-black">{data.me.rankName}</h2><span className="font-black text-yellow-300">{number(data.me.lp)} LP</span></div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-green-400" style={{ width: `${data.me.progressPercent}%` }} /></div>
                <p className="mt-2 text-xs text-slate-500">{data.me.nextRankName ? `Sıradaki: ${data.me.nextRankName} · ${number(data.me.nextRankLp ?? 0)} LP` : "En yüksek rank: GOAT"}</p>
              </div>
            </div>
          </section>
        )}

        <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
          <div className="border-b border-white/10 px-5 py-4"><h2 className="text-xl font-black">Sezon LP Sıralaması</h2></div>
          {loading ? <div className="p-10 text-center text-slate-500">Yükleniyor...</div> : !data?.ok ? <div className="p-8 text-center text-red-300">{data?.error ?? "Rank sıralaması yüklenemedi."}</div> : (
            <div className="divide-y divide-white/[0.06]">
              {(data.leaderboard ?? []).map((entry) => (
                <div key={entry.userId} className="grid grid-cols-[42px_56px_minmax(0,1fr)_auto] items-center gap-2 px-4 py-3 sm:gap-4 sm:px-6">
                  <div className="text-center font-black">#{entry.position}</div>
                  <Image src={entry.rankIcon} alt={entry.rankName} width={56} height={56} className="h-14 w-14 object-contain" />
                  <div className="min-w-0"><p className="truncate font-black">{entry.displayName}</p><p className="truncate text-xs text-slate-500">{entry.rankName} · {entry.gamesPlayed} oyun · {entry.wins}G/{entry.losses}M</p></div>
                  <div className="text-right"><p className="font-black text-yellow-300">{number(entry.lp)}</p><p className="text-[10px] font-black text-slate-600">LP</p></div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
