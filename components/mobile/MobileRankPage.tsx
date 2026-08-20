"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n/config";

type RankEntry = {
  position: number | null;
  userId: string;
  username?: string | null;
  displayName?: string;
  avatarUrl?: string | null;
  lp: number;
  rankName: string;
  rankIcon: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
};
type RankData = { ok?: boolean; error?: string; season?: { title?: string } | null; leaderboard?: RankEntry[]; me?: RankEntry | null };
type Friend = { user: { id: string; username: string | null; displayName: string; avatarUrl?: string | null } };
type FriendsData = { ok?: boolean; friends?: Friend[] };

export default function MobileRankPage({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  const [tab, setTab] = useState<"global" | "friends">("global");
  const [rank, setRank] = useState<RankData | null>(null);
  const [friends, setFriends] = useState<FriendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const nf = useMemo(() => new Intl.NumberFormat(tr ? "tr-TR" : "en-US"), [tr]);

  useEffect(() => {
    void Promise.all([
      fetch("/api/rank/leaderboard", { cache: "no-store" }).then((r) => r.json() as Promise<RankData>),
      fetch("/api/friends", { cache: "no-store" }).then(async (r) => r.ok ? (r.json() as Promise<FriendsData>) : ({ ok: false } as FriendsData)),
    ]).then(([rankData, friendData]) => { setRank(rankData); setFriends(friendData); }).finally(() => setLoading(false));
  }, []);

  const globalEntries = rank?.leaderboard ?? [];
  const friendIds = new Set((friends?.friends ?? []).map((item) => item.user.id));
  if (rank?.me?.userId) friendIds.add(rank.me.userId);
  const friendEntries = globalEntries.filter((entry) => friendIds.has(entry.userId));
  if (rank?.me && !friendEntries.some((entry) => entry.userId === rank.me?.userId)) friendEntries.push(rank.me);
  friendEntries.sort((a, b) => Number(b.lp ?? 0) - Number(a.lp ?? 0));
  const entries = tab === "global" ? globalEntries : friendEntries;

  return (
    <main className="min-h-screen bg-[#07111f] px-4 pb-24 pt-5 text-white">
      <div className="mx-auto max-w-xl">
        <header className="flex items-start justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-green-300">FootBattle Arena</p><h1 className="mt-1 text-3xl font-black">{tr ? "Sıralama" : "Rankings"}</h1><p className="mt-1 text-xs text-slate-500">{rank?.season?.title ?? (tr ? "Sezon LP sıralaması" : "Season LP leaderboard")}</p></div>
          <img src="/footbattle-logo.png" alt="FootBattle" className="h-8 w-auto object-contain" />
        </header>

        <div className="mt-5 grid grid-cols-2 rounded-2xl border border-white/10 bg-white/[0.025] p-1">
          <button onClick={() => setTab("global")} className={`rounded-xl px-3 py-2.5 text-xs font-black ${tab === "global" ? "bg-green-500 text-[#07111f]" : "text-slate-500"}`}>{tr ? "🌍 Genel" : "🌍 Global"}</button>
          <button onClick={() => setTab("friends")} className={`rounded-xl px-3 py-2.5 text-xs font-black ${tab === "friends" ? "bg-green-500 text-[#07111f]" : "text-slate-500"}`}>{tr ? "👥 Arkadaşlar" : "👥 Friends"}</button>
        </div>

        <section className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          {loading ? <p className="p-8 text-center text-sm text-slate-500">{tr ? "Yükleniyor..." : "Loading..."}</p> : entries.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">{tab === "friends" ? (tr ? "Sıralamada görünen arkadaşın yok." : "No ranked friends yet.") : (tr ? "Sıralama boş." : "Leaderboard is empty.")}</p> : (
            <div className="divide-y divide-white/[0.06]">
              {entries.map((entry, index) => {
                const position = tab === "global" ? entry.position : index + 1;
                const content = <>
                  <span className="w-7 shrink-0 text-center text-xs font-black">#{position ?? "-"}</span>
                  <img src={entry.rankIcon} alt={entry.rankName} className="h-10 w-10 shrink-0 object-contain" />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{entry.displayName ?? entry.username ?? "FootBattle"}</p><p className="mt-0.5 truncate text-[9px] text-slate-600">{entry.rankName} · {entry.gamesPlayed} {tr ? "oyun" : "games"} · {entry.wins}G/{entry.losses}M</p></div>
                  <div className="shrink-0 text-right"><p className="text-sm font-black text-yellow-300">{nf.format(entry.lp)}</p><p className="text-[8px] font-black text-slate-600">LP</p></div>
                </>;
                return entry.username ? <Link key={entry.userId} href={`/u/${encodeURIComponent(entry.username)}`} className="flex items-center gap-2.5 px-3 py-3 active:bg-white/[0.04]">{content}</Link> : <div key={entry.userId} className="flex items-center gap-2.5 px-3 py-3">{content}</div>;
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
