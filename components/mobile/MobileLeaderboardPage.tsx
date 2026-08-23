"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n/config";

type RankedEntry = {
  position: number | null;
  userId: string;
  username?: string | null;
  displayName?: string;
  rankName?: string;
  rankIcon?: string;
  lp: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
};
type RankedData = { ok?: boolean; season?: { title?: string } | null; leaderboard?: RankedEntry[]; me?: RankedEntry | null };
type SoloEntry = {
  position: number | null;
  userId: string;
  username?: string | null;
  displayName?: string;
  rating: number;
  gamesPlayed: number;
  gamesCount: number;
  wins: number;
};
type SoloData = { ok?: boolean; leaderboard?: SoloEntry[]; me?: SoloEntry | null };
type Friend = { user: { id: string; username: string | null; displayName: string } };
type FriendsData = { ok?: boolean; friends?: Friend[] };

export default function MobileLeaderboardPage({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  const [mode, setMode] = useState<"ranked" | "solo">("ranked");
  const [scope, setScope] = useState<"global" | "friends">("global");
  const [ranked, setRanked] = useState<RankedData | null>(null);
  const [solo, setSolo] = useState<SoloData | null>(null);
  const [friends, setFriends] = useState<FriendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const nf = useMemo(() => new Intl.NumberFormat(tr ? "tr-TR" : "en-US"), [tr]);

  useEffect(() => {
    void Promise.all([
      fetch("/api/rank/leaderboard", { cache: "no-store" }).then((r) => r.json() as Promise<RankedData>),
      fetch("/api/solo/leaderboard", { cache: "no-store" }).then((r) => r.json() as Promise<SoloData>),
      fetch("/api/friends", { cache: "no-store" }).then(async (r) => r.ok ? (r.json() as Promise<FriendsData>) : ({ ok: false } as FriendsData)),
    ]).then(([rankedData, soloData, friendData]) => {
      setRanked(rankedData);
      setSolo(soloData);
      setFriends(friendData);
    }).finally(() => setLoading(false));
  }, []);

  const friendIds = useMemo(() => new Set((friends?.friends ?? []).map((item) => item.user.id)), [friends]);

  const rankedEntries = useMemo(() => {
    const rows = [...(ranked?.leaderboard ?? [])];
    if (scope === "global") return rows;
    if (ranked?.me?.userId) friendIds.add(ranked.me.userId);
    const filtered = rows.filter((entry) => friendIds.has(entry.userId));
    if (ranked?.me && !filtered.some((entry) => entry.userId === ranked.me?.userId)) filtered.push(ranked.me);
    filtered.sort((a, b) => Number(b.lp ?? 0) - Number(a.lp ?? 0));
    return filtered;
  }, [ranked, scope, friendIds]);

  const soloEntries = useMemo(() => {
    const rows = [...(solo?.leaderboard ?? [])];
    if (scope === "global") return rows;
    if (solo?.me?.userId) friendIds.add(solo.me.userId);
    const filtered = rows.filter((entry) => friendIds.has(entry.userId));
    if (solo?.me && !filtered.some((entry) => entry.userId === solo.me?.userId)) filtered.push(solo.me);
    filtered.sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0));
    return filtered;
  }, [solo, scope, friendIds]);

  return (
    <main className="min-h-screen bg-[#07111f] px-4 pb-24 pt-5 text-white">
      <div className="mx-auto max-w-xl">
        <header>
          <Link href={`/${locale}`} className="inline-flex" aria-label="FootBattle">
            <img src="/footbattle-logo.png" alt="FootBattle" className="h-9 w-auto object-contain" />
          </Link>
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-300">{tr ? "Sıralama" : "Leaderboard"}</p>
          <h1 className="mt-1 text-3xl font-black">{tr ? "FootBattle Sıralaması" : "FootBattle Leaderboard"}</h1>
          <p className="mt-1 text-xs text-slate-500">{tr ? "Ranked ELO ve Solo Rating tamamen ayrı tutulur." : "Ranked ELO and Solo Rating are completely separate."}</p>
        </header>

        <div className="mt-6 grid grid-cols-2 rounded-2xl border border-white/10 bg-white/[0.025] p-1">
          <button type="button" onClick={() => setMode("ranked")} className={`rounded-xl px-3 py-3 text-sm font-black ${mode === "ranked" ? "bg-green-500 text-[#07111f]" : "text-slate-500"}`}>🏆 Ranked</button>
          <button type="button" onClick={() => setMode("solo")} className={`rounded-xl px-3 py-3 text-sm font-black ${mode === "solo" ? "bg-green-500 text-[#07111f]" : "text-slate-500"}`}>🎮 Solo</button>
        </div>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{mode === "ranked" ? "Ranked ELO" : "Solo Rating"}</p>
            <h2 className="mt-1 text-xl font-black">{mode === "ranked" ? (ranked?.season?.title ?? (tr ? "Ranked sıralaması" : "Ranked leaderboard")) : (tr ? "Solo sıralaması" : "Solo leaderboard")}</h2>
          </div>
          <p className="max-w-[180px] text-right text-[10px] leading-4 text-slate-600">{mode === "ranked" ? (tr ? "Yalnızca gerçek oyuncular arasındaki Ranked maçlar." : "Only Ranked matches between real players.") : (tr ? "Solo oyun performansı ve oyun çeşitliliği." : "Solo game performance and game variety.")}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 rounded-2xl border border-white/10 bg-white/[0.025] p-1">
          <button type="button" onClick={() => setScope("global")} className={`rounded-xl px-3 py-2.5 text-xs font-black ${scope === "global" ? "bg-slate-700 text-white" : "text-slate-500"}`}>{tr ? "🌍 Genel" : "🌍 Global"}</button>
          <button type="button" onClick={() => setScope("friends")} className={`rounded-xl px-3 py-2.5 text-xs font-black ${scope === "friends" ? "bg-slate-700 text-white" : "text-slate-500"}`}>{tr ? "👥 Arkadaşlar" : "👥 Friends"}</button>
        </div>

        <section className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          {loading ? (
            <p className="p-8 text-center text-sm text-slate-500">{tr ? "Yükleniyor..." : "Loading..."}</p>
          ) : mode === "ranked" ? (
            rankedEntries.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">{tr ? "Sıralama boş." : "Leaderboard is empty."}</p> :
            <div className="divide-y divide-white/[0.06]">
              {rankedEntries.map((entry, index) => {
                const position = scope === "global" ? entry.position : index + 1;
                const row = <>
                  <span className="w-8 shrink-0 text-center text-xs font-black">#{position ?? "-"}</span>
                  {entry.rankIcon ? <img src={entry.rankIcon} alt={entry.rankName ?? "Rank"} className="h-11 w-11 shrink-0 object-contain" /> : <span className="flex h-11 w-11 items-center justify-center text-xl">🏆</span>}
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{entry.displayName ?? entry.username ?? "FootBattle"}</p><p className="mt-0.5 truncate text-[9px] text-slate-600">{entry.rankName ?? "Ranked"} · {entry.gamesPlayed} {tr ? "maç" : "matches"} · {entry.wins}G/{entry.losses}M</p></div>
                  <div className="shrink-0 text-right"><p className="text-sm font-black text-green-300">{nf.format(entry.lp)}</p><p className="text-[8px] font-black text-slate-600">ELO</p></div>
                </>;
                return entry.username ? <Link key={entry.userId} href={`/u/${encodeURIComponent(entry.username)}`} className="flex items-center gap-2.5 px-3 py-3">{row}</Link> : <div key={entry.userId} className="flex items-center gap-2.5 px-3 py-3">{row}</div>;
              })}
            </div>
          ) : (
            soloEntries.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">{tr ? "Henüz Solo Rating yok." : "No Solo Rating yet."}</p> :
            <div className="divide-y divide-white/[0.06]">
              {soloEntries.map((entry, index) => {
                const position = scope === "global" ? entry.position : index + 1;
                const row = <>
                  <span className="w-8 shrink-0 text-center text-xs font-black">#{position ?? "-"}</span>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-xl">🎮</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{entry.displayName ?? entry.username ?? "FootBattle"}</p><p className="mt-0.5 truncate text-[9px] text-slate-600">{entry.gamesCount} {tr ? "oyun türü" : "game types"} · {entry.gamesPlayed} {tr ? "sonuç" : "results"} · {entry.wins} {tr ? "başarı" : "wins"}</p></div>
                  <div className="shrink-0 text-right"><p className="text-sm font-black text-purple-300">{nf.format(entry.rating)}</p><p className="text-[8px] font-black text-slate-600">RATING</p></div>
                </>;
                return entry.username ? <Link key={entry.userId} href={`/u/${encodeURIComponent(entry.username)}`} className="flex items-center gap-2.5 px-3 py-3">{row}</Link> : <div key={entry.userId} className="flex items-center gap-2.5 px-3 py-3">{row}</div>;
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
