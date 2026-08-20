"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/config";

type Progress = { guessThePlayer?: boolean; playerQuiz?: boolean; ticTacToe?: boolean; wordle?: boolean };
type ResponseData = {
  ok?: boolean;
  authenticated?: boolean;
  required?: number;
  totalGames?: number;
  completedCount?: number;
  challengeCompleted?: boolean;
  perfectCompleted?: boolean;
  reward?: number;
  rewardClaimed?: boolean;
  progress?: Progress;
  attempted?: Progress;
  error?: string;
};

const dailyGames = [
  { key: "guessThePlayer" as const, icon: "🕵️", title: "Guess The Player", path: "/guess-the-player" },
  { key: "playerQuiz" as const, icon: "🧠", title: "Player Quiz", path: "/player-quiz" },
  { key: "ticTacToe" as const, icon: "⭕", title: "Tic Tac Toe", path: "/tic-tac-toe" },
  { key: "wordle" as const, icon: "🟩", title: "Wordle", path: "/wordle" },
];

export default function MobileDailyChallengePage({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/daily-challenge", { cache: "no-store" })
      .then(async (response) => ({ response, body: (await response.json()) as ResponseData }))
      .then(({ body }) => setData(body))
      .catch(() => setData({ ok: false, error: tr ? "Günlük görev yüklenemedi." : "Daily challenge could not be loaded." }))
      .finally(() => setLoading(false));
  }, [tr]);

  const completed = Number(data?.completedCount ?? 0);
  const total = Number(data?.totalGames ?? 4);
  const required = Number(data?.required ?? 3);
  const pct = Math.min(100, Math.round((completed / Math.max(1, total)) * 100));

  return (
    <main className="min-h-screen bg-[#07111f] px-4 pb-24 pt-6 text-white">
      <div className="mx-auto max-w-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300">🔥 {tr ? "Günlük Görev" : "Daily Challenge"}</p>
        <h1 className="mt-2 text-3xl font-black">{tr ? "Bugünün görevi" : "Today's challenge"}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">{tr ? "4 oyundan en az 3'ünü tamamla, günlük bonusunu kazan. 4/4 yaparsan ekstra ödül al." : "Complete at least 3 of 4 games for the daily bonus. Go 4/4 for an extra reward."}</p>

        {!loading && data?.authenticated === false ? (
          <section className="mt-5 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.06] p-5 text-center">
            <p className="text-lg font-black">{tr ? "Görevi takip etmek için giriş yap" : "Sign in to track the challenge"}</p>
            <Link href="/login" className="mt-4 inline-flex rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-[#07111f]">{tr ? "Giriş Yap" : "Sign In"}</Link>
          </section>
        ) : (
          <>
            <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{tr ? "İlerleme" : "Progress"}</p><p className="mt-1 text-2xl font-black">{loading ? "…" : `${completed}/${total}`}</p></div><p className="text-right text-xs font-bold text-yellow-300">{data?.perfectCompleted ? (tr ? "Mükemmel 4/4 ✓" : "Perfect 4/4 ✓") : data?.challengeCompleted ? (tr ? "Bonus kazanıldı ✓" : "Bonus earned ✓") : `${required} ${tr ? "tamamlama gerekli" : "needed"}`}</p></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-yellow-400 transition-all" style={{ width: `${pct}%` }} /></div>
            </section>

            <section className="mt-4 space-y-2.5">
              {dailyGames.map((game) => {
                const done = Boolean(data?.progress?.[game.key]);
                const attempted = Boolean(data?.attempted?.[game.key]);
                return (
                  <Link key={game.key} href={`/${locale}${game.path}?daily=1`} className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3.5 py-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-xl">{game.icon}</div>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{game.title}</p><p className={`mt-1 text-[11px] font-bold ${done ? "text-green-300" : attempted ? "text-slate-500" : "text-yellow-300"}`}>{done ? (tr ? "Tamamlandı ✓" : "Completed ✓") : attempted ? (tr ? "Bugünkü hak kullanıldı" : "Today's attempt used") : (tr ? "Oyna" : "Play")}</p></div>
                    <span className="font-black text-slate-500">→</span>
                  </Link>
                );
              })}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
