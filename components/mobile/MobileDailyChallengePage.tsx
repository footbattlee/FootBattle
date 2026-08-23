"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/config";

type Progress = { guessThePlayer?: boolean; playerQuiz?: boolean; ticTacToe?: boolean; wordle?: boolean };
type ResponseData = {
  ok?: boolean; authenticated?: boolean; required?: number; totalGames?: number;
  completedCount?: number; challengeCompleted?: boolean; perfectCompleted?: boolean;
  progress?: Progress; attempted?: Progress; error?: string;
};
type StreakDay = { date: string; completed: boolean; today: boolean; future: boolean };
type StreakData = { ok?: boolean; currentStreak?: number; bestStreak?: number; totalCompletedDays?: number; week?: StreakDay[] };

const dailyGames = [
  { key: "guessThePlayer" as const, icon: "🕵️", tr: "Futbolcuyu Tahmin Et", en: "Guess The Player", path: "/guess-the-player" },
  { key: "playerQuiz" as const, icon: "🧠", tr: "Futbolcu Quiz", en: "Player Quiz", path: "/player-quiz" },
  { key: "ticTacToe" as const, icon: "⭕", tr: "Futbol Tic Tac Toe", en: "Football Tic Tac Toe", path: "/tic-tac-toe" },
  { key: "wordle" as const, icon: "🟩", tr: "Futbol Wordle", en: "Football Wordle", path: "/wordle" },
];
const dayLabelsTr = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const dayLabelsEn = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function MobileDailyChallengePage({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  const [data, setData] = useState<ResponseData | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      fetch("/api/daily-challenge", { cache: "no-store" }).then((r) => r.json() as Promise<ResponseData>),
      fetch("/api/daily-streak", { cache: "no-store" }).then((r) => r.json() as Promise<StreakData>).catch(() => ({ ok: false })),
    ]).then(([daily, streakData]) => { setData(daily); setStreak(streakData); })
      .catch(() => setData({ ok: false, error: tr ? "Günlük görev yüklenemedi." : "Daily challenge could not be loaded." }))
      .finally(() => setLoading(false));
  }, [tr]);

  const completed = Number(data?.completedCount ?? 0);
  const total = Number(data?.totalGames ?? 4);
  const required = Number(data?.required ?? 3);
  const pct = Math.min(100, Math.round((completed / Math.max(1, total)) * 100));
  const dayLabels = tr ? dayLabelsTr : dayLabelsEn;

  return (
    <main className="min-h-screen bg-[#07111f] px-4 pb-24 pt-4 text-white">
      <div className="mx-auto max-w-xl">
        <header><Link href={`/${locale}`}><img src="/footbattle-logo.png" alt="FootBattle" className="h-9 w-auto" /></Link></header>

        <section className="mt-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300">🔥 {tr ? "Günlük Görev" : "Daily Challenge"}</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <h1 className="text-3xl font-black">{tr ? "Bugünün görevi" : "Today's challenge"}</h1>
            <p className="shrink-0 text-xs font-black text-yellow-300">{loading ? "…" : `${completed}/${total}`}</p>
          </div>
          <p className="mt-1 text-xs text-slate-400">{tr ? "4 oyundan 3'ünü tamamla, serini koru." : "Complete 3 of 4 games and keep your streak."}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-yellow-400" style={{ width: `${pct}%` }} /></div>
        </section>

        {!loading && data?.authenticated === false ? (
          <section className="mt-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.06] p-5 text-center">
            <p className="text-lg font-black">{tr ? "Görevi takip etmek için giriş yap" : "Sign in to track the challenge"}</p>
            <Link href="/login" className="mt-4 inline-flex rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-[#07111f]">{tr ? "Giriş Yap" : "Sign In"}</Link>
          </section>
        ) : (
          <>
            <section className="mt-4 grid grid-cols-2 gap-2.5">
              {dailyGames.map((game) => {
                const done = Boolean(data?.progress?.[game.key]);
                const attempted = Boolean(data?.attempted?.[game.key]);
                return (
                  <Link key={game.key} href={`/${locale}${game.path}?daily=1`} className="flex min-h-[92px] flex-col justify-between rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3.5">
                    <div className="flex items-start justify-between gap-2"><span className="text-2xl">{game.icon}</span><span className="text-slate-500">→</span></div>
                    <div><p className="text-[13px] font-black leading-4">{tr ? game.tr : game.en}</p><p className={`mt-1 text-[10px] font-bold ${done ? "text-green-300" : attempted ? "text-slate-500" : "text-yellow-300"}`}>{done ? (tr ? "Tamamlandı ✓" : "Completed ✓") : attempted ? (tr ? "Hak kullanıldı" : "Attempt used") : (tr ? "Oyna" : "Play")}</p></div>
                  </Link>
                );
              })}
            </section>

            <section className="mt-4 rounded-2xl border border-orange-400/20 bg-orange-400/[0.06] p-3.5">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-[9px] font-black uppercase text-slate-500">{tr ? "Seri" : "Streak"}</p><p className="mt-1 text-xl font-black text-orange-300">🔥 {Number(streak?.currentStreak ?? 0)}</p></div>
                <div><p className="text-[9px] font-black uppercase text-slate-500">{tr ? "En İyi" : "Best"}</p><p className="mt-1 text-xl font-black">🏅 {Number(streak?.bestStreak ?? 0)}</p></div>
                <div><p className="text-[9px] font-black uppercase text-slate-500">{tr ? "Toplam" : "Total"}</p><p className="mt-1 text-xl font-black">{Number(streak?.totalCompletedDays ?? 0)}</p></div>
              </div>
              <div className="mt-3 grid grid-cols-7 gap-1">
                {(streak?.week ?? Array.from({ length: 7 }, () => null)).map((day, index) => {
                  const done = Boolean(day?.completed); const today = Boolean(day?.today); const future = Boolean(day?.future);
                  return <div key={day?.date ?? index} className="text-center"><p className={`text-[8px] font-black ${today ? "text-yellow-300" : "text-slate-600"}`}>{dayLabels[index]}</p><div className={`mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full border text-[10px] ${done ? "border-green-400/50 bg-green-400/15 text-green-300" : today ? "border-yellow-400/50 text-yellow-300" : future ? "border-white/[0.05] text-slate-800" : "border-white/10 text-slate-600"}`}>{done ? "✓" : today ? "○" : "·"}</div></div>;
                })}
              </div>
              <p className="mt-2 text-center text-[9px] text-slate-500">{data?.perfectCompleted ? (tr ? "Mükemmel 4/4 ✓" : "Perfect 4/4 ✓") : data?.challengeCompleted ? (tr ? "Bugünkü görev tamamlandı ✓" : "Today's challenge completed ✓") : `${required} ${tr ? "tamamlama gerekli" : "needed"}`}</p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
