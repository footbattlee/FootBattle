"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { Locale } from "@/lib/i18n/config";

type LeaderboardType = "overall" | "wordle" | "guess_the_player" | "player_quiz" | "tic_tac_toe";
type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  gamesPlayed: number;
  gamesWon: number;
  xp?: number;
  level?: number;
  currentStreak?: number;
};
type LeaderboardResponse = { ok: boolean; leaderboard: LeaderboardEntry[]; error?: string };

const FILTERS: Array<{ value: LeaderboardType; tr: string; en: string; icon: string }> = [
  { value: "overall", tr: "Genel", en: "Overall", icon: "🏆" },
  { value: "wordle", tr: "Wordle", en: "Wordle", icon: "🟩" },
  { value: "guess_the_player", tr: "Guess", en: "Guess", icon: "🕵️" },
  { value: "player_quiz", tr: "Quiz", en: "Quiz", icon: "🧠" },
  { value: "tic_tac_toe", tr: "Tic Tac Toe", en: "Tic Tac Toe", icon: "⭕" },
];

function rank(rankValue: number) {
  if (rankValue === 1) return "🥇";
  if (rankValue === 2) return "🥈";
  if (rankValue === 3) return "🥉";
  return `#${rankValue}`;
}

export default function LeaderboardCard({ locale = "tr" }: { locale?: Locale }) {
  const tr = locale === "tr";
  const [type, setType] = useState<LeaderboardType>("overall");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const game = type === "overall" ? "" : `&game=${encodeURIComponent(type)}`;
        const response = await fetch(`/api/leaderboard?period=week&limit=10${game}`, { cache: "no-store" });
        const result = (await response.json()) as LeaderboardResponse;
        if (!response.ok || !result.ok) throw new Error(result.error ?? (tr ? "Leaderboard yüklenemedi." : "Could not load leaderboard."));
        if (!cancelled) setEntries(result.leaderboard ?? []);
      } catch (err) {
        if (!cancelled) {
          setEntries([]);
          setError(err instanceof Error ? err.message : tr ? "Leaderboard yüklenemedi." : "Could not load leaderboard.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [tr, type]);

  const label = useMemo(() => {
    const filter = FILTERS.find((item) => item.value === type);
    return filter ? (tr ? filter.tr : filter.en) : tr ? "Genel" : "Overall";
  }, [tr, type]);

  const fmt = (value: number) => new Intl.NumberFormat(tr ? "tr-TR" : "en-US").format(value);
  const leaderboardHref = locale === "tr" ? "/tr/rank" : "/en/rank";

  return (
    <section className="overflow-hidden rounded-[28px] border border-yellow-400/15 bg-gradient-to-b from-yellow-400/[0.055] to-white/[0.025]">
      <div className="border-b border-white/10 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">{tr ? "Arena Sıralaması" : "Arena Leaderboard"}</p>
            <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">{tr ? "Bu haftanın liderleri" : "This week's leaders"}</h2>
            <p className="mt-1 text-xs text-slate-500">{tr ? "Sadece anti-cheat onaylı skorlar." : "Only anti-cheat verified scores."}</p>
          </div>
          <Link href={leaderboardHref} className="shrink-0 rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 text-xs font-black text-yellow-200 transition hover:bg-yellow-400/15">{tr ? "Tümü" : "All"} →</Link>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((filter) => (
            <button key={filter.value} type="button" onClick={() => setType(filter.value)} className={`shrink-0 rounded-lg border px-2.5 py-2 text-[11px] font-black transition ${type === filter.value ? "border-yellow-400/35 bg-yellow-400/15 text-yellow-100" : "border-white/[0.07] bg-black/10 text-slate-500 hover:text-white"}`}>
              {filter.icon} {tr ? filter.tr : filter.en}
            </button>
          ))}
        </div>
      </div>

      <div className="p-2.5 sm:p-3">
        {loading ? (
          <div className="flex min-h-64 items-center justify-center rounded-2xl bg-black/10 text-sm font-bold text-slate-500">{tr ? `${label} sıralaması yükleniyor...` : `Loading ${label.toLowerCase()} leaderboard...`}</div>
        ) : error ? (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-red-500/15 bg-red-500/[0.04] p-5 text-center text-sm font-bold text-red-300">{error}</div>
        ) : entries.length === 0 ? (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-500">{tr ? "Bu hafta henüz güvenli skor oluşmadı." : "No verified scores yet this week."}</div>
        ) : (
          <div className="space-y-1.5">
            {entries.slice(0, 7).map((entry) => {
              const winRate = entry.gamesPlayed ? Math.round((entry.gamesWon / entry.gamesPlayed) * 100) : 0;
              return (
                <article key={entry.userId} className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-transparent bg-black/15 px-2.5 py-2.5 transition hover:border-white/10 hover:bg-white/[0.035] sm:gap-3 sm:px-3">
                  <div className="text-center text-sm font-black sm:text-base">{rank(entry.rank)}</div>
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2"><p className="truncate text-sm font-black text-white">{entry.displayName}</p>{typeof entry.level === "number" && <span className="shrink-0 rounded-md bg-green-400/10 px-1.5 py-0.5 text-[9px] font-black text-green-300">LVL {entry.level}</span>}</div>
                    <p className="mt-0.5 truncate text-[10px] text-slate-600">{entry.gamesPlayed} {tr ? "oyun" : "games"} · {winRate}% {tr ? "galibiyet" : "wins"}{typeof entry.currentStreak === "number" ? ` · 🔥 ${entry.currentStreak}` : ""}</p>
                  </div>
                  <div className="text-right"><p className="text-sm font-black text-yellow-300 sm:text-base">{fmt(entry.score)}</p><p className="text-[9px] font-black uppercase tracking-wider text-slate-700">{tr ? "puan" : "points"}</p></div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-white/[0.07] px-4 py-3 text-[10px] text-slate-600 sm:text-xs"><span>{label} · {tr ? "Bu Hafta" : "This Week"}</span><Link href={`/leaderboard?period=week${type === "overall" ? "" : `&game=${type}`}`} className="font-black text-yellow-300 hover:text-yellow-200">{tr ? "İlk 100'ü gör" : "View top 100"} →</Link></div>
    </section>
  );
}
