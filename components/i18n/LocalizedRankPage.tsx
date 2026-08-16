"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { RANKS } from "@/lib/rank-system";
import type { Locale } from "@/lib/i18n/config";

type Entry = {
  position: number | null;
  userId: string;
  displayName?: string;
  lp: number;
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

const majorRanks = ["bronze_3", "silver_3", "gold_3", "platinum_3", "diamond_3", "legend_3", "goat"]
  .map((code) => RANKS.find((rank) => rank.code === code))
  .filter(Boolean) as typeof RANKS;

const copy = {
  tr: {
    back: "← Ana Sayfa", score: "Skor Sıralaması →", eyebrow: "FootBattle Rank Arenası",
    title: "Bronzdan GOAT’a çık. 🐐", description: "XP kalıcı gelişimini gösterir. LP ise sezonluk rekabet puanındır; onaylı oyunlarda kazanılır veya kaybedilir.",
    active: "Aktif sezon", yours: "Senin Rankın", next: "Sıradaki", top: "En yüksek rank: GOAT",
    board: "Sezon LP Sıralaması", loading: "Yükleniyor...", error: "Rank sıralaması yüklenemedi.", games: "oyun", win: "G", loss: "M",
  },
  en: {
    back: "← Home", score: "Score Leaderboard →", eyebrow: "FootBattle Rank Arena",
    title: "Climb from Bronze to GOAT. 🐐", description: "XP tracks permanent progression. LP is your seasonal competitive rating, gained or lost in verified games.",
    active: "Active season", yours: "Your Rank", next: "Next", top: "Highest rank: GOAT",
    board: "Season LP Leaderboard", loading: "Loading...", error: "Rank leaderboard could not be loaded.", games: "games", win: "W", loss: "L",
  },
} as const;

export default function LocalizedRankPage({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const nf = new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US");

  useEffect(() => {
    void fetch("/api/rank/leaderboard", { cache: "no-store" })
      .then((response) => response.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex items-center justify-between gap-4">
          <Link href={`/${locale}`} className="text-sm font-black text-slate-400 hover:text-white">{t.back}</Link>
          <Link href="/leaderboard" className="text-sm font-black text-green-300">{t.score}</Link>
        </div>

        <section className="mt-6 rounded-[30px] border border-yellow-400/20 bg-gradient-to-br from-yellow-400/[0.10] via-white/[0.035] to-purple-400/[0.08] p-6 sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-300">{t.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black sm:text-6xl">{t.title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">{t.description}</p>
          <p className="mt-3 text-sm font-black text-green-300">{data?.season?.title ?? t.active}</p>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {majorRanks.map((rank) => (
            <div key={rank.code} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-center">
              <Image src={rank.icon} alt={rank.name} width={110} height={110} className="mx-auto h-24 w-24 object-contain" />
              <p className="mt-2 text-sm font-black">{rank.name.replace(" III", "")}</p>
              <p className="mt-1 text-[11px] font-bold text-slate-500">{nf.format(rank.minLp)} LP</p>
            </div>
          ))}
        </section>

        {data?.me && (
          <section className="mt-6 rounded-3xl border border-green-400/25 bg-green-400/[0.06] p-5">
            <div className="flex items-center gap-4">
              <Image src={data.me.rankIcon} alt={data.me.rankName} width={92} height={92} className="h-20 w-20 object-contain" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-wider text-green-300">{t.yours}</p>
                <div className="mt-1 flex flex-wrap items-end gap-x-3"><h2 className="text-2xl font-black">{data.me.rankName}</h2><span className="font-black text-yellow-300">{nf.format(data.me.lp)} LP</span></div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-green-400" style={{ width: `${data.me.progressPercent}%` }} /></div>
                <p className="mt-2 text-xs text-slate-500">{data.me.nextRankName ? `${t.next}: ${data.me.nextRankName} · ${nf.format(data.me.nextRankLp ?? 0)} LP` : t.top}</p>
              </div>
            </div>
          </section>
        )}

        <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
          <div className="border-b border-white/10 px-5 py-4"><h2 className="text-xl font-black">{t.board}</h2></div>
          {loading ? <div className="p-10 text-center text-slate-500">{t.loading}</div> : !data?.ok ? <div className="p-8 text-center text-red-300">{data?.error ?? t.error}</div> : (
            <div className="divide-y divide-white/[0.06]">
              {(data.leaderboard ?? []).map((entry) => (
                <div key={entry.userId} className="grid grid-cols-[42px_56px_minmax(0,1fr)_auto] items-center gap-2 px-4 py-3 sm:gap-4 sm:px-6">
                  <div className="text-center font-black">#{entry.position}</div>
                  <Image src={entry.rankIcon} alt={entry.rankName} width={56} height={56} className="h-14 w-14 object-contain" />
                  <div className="min-w-0"><p className="truncate font-black">{entry.displayName}</p><p className="truncate text-xs text-slate-500">{entry.rankName} · {entry.gamesPlayed} {t.games} · {entry.wins}{t.win}/{entry.losses}{t.loss}</p></div>
                  <div className="text-right"><p className="font-black text-yellow-300">{nf.format(entry.lp)}</p><p className="text-[10px] font-black text-slate-600">LP</p></div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
