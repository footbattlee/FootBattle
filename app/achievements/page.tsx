"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Achievement = {
  code: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  unlocked: boolean;
  unlockedAt: string | null;
};

type ProgressionResponse = {
  ok?: boolean;
  authenticated?: boolean;
  error?: string;
  progress?: {
    xp: number;
    level: number;
    levelFloorXp: number;
    nextLevelXp: number;
    xpIntoLevel: number;
    xpNeededForLevel: number;
    currentStreak: number;
    bestStreak: number;
  };
  stats?: {
    totalScore: number;
    gamesPlayed: number;
    gamesWon: number;
  };
  achievements?: Achievement[];
  unlockedCount?: number;
  totalAchievements?: number;
};

function fmt(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

export default function AchievementsPage() {
  const [data, setData] = useState<ProgressionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/progression", { cache: "no-store" });
        const result = (await response.json()) as ProgressionResponse;
        if (!response.ok || !result.ok) throw new Error(result.error ?? "İlerleme yüklenemedi.");
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "İlerleme yüklenemedi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const percent = useMemo(() => {
    const progress = data?.progress;
    if (!progress) return 0;
    return Math.min(100, Math.max(0, Math.round((progress.xpIntoLevel / progress.xpNeededForLevel) * 100)));
  }, [data]);

  if (loading) {
    return <main className="flex min-h-[100dvh] items-center justify-center bg-[#07111f] text-slate-400">İlerleme yükleniyor...</main>;
  }

  if (error) {
    return <main className="flex min-h-[100dvh] items-center justify-center bg-[#07111f] px-4 text-center font-bold text-red-300">{error}</main>;
  }

  if (!data?.authenticated) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#07111f] px-4 text-white">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <div className="text-4xl">🏆</div>
          <h1 className="mt-4 text-2xl font-black">Rozetlerini biriktir</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">XP, seviye, seri ve achievement ilerlemeni görmek için giriş yap.</p>
          <Link href="/login" className="mt-5 inline-flex rounded-xl bg-green-400 px-5 py-3 font-black text-[#07111f]">Giriş Yap</Link>
        </div>
      </main>
    );
  }

  const progress = data.progress!;
  const achievements = data.achievements ?? [];

  return (
    <main className="min-h-[100dvh] bg-[#07111f] text-white">
      <header className="border-b border-white/10 bg-[#081523]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-sm font-black text-slate-300">← Ana Sayfa</Link>
          <p className="font-black">XP & Başarımlar</p>
          <Link href="/leaderboard" className="text-sm font-black text-yellow-300">Sıralama →</Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="rounded-[30px] border border-green-400/20 bg-gradient-to-br from-green-400/[0.12] via-white/[0.04] to-purple-500/[0.08] p-5 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-green-300">FootBattle Seviyesi</p>
              <h1 className="mt-2 text-5xl font-black">LVL {progress.level}</h1>
              <p className="mt-2 text-sm text-slate-400">{fmt(progress.xp)} toplam XP · 🔥 {progress.currentStreak} günlük seri</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat value={fmt(data.stats?.gamesPlayed ?? 0)} label="Oyun" />
              <Stat value={fmt(data.stats?.gamesWon ?? 0)} label="Galibiyet" />
              <Stat value={fmt(data.stats?.totalScore ?? 0)} label="Puan" />
            </div>
          </div>
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>Seviye {progress.level}</span>
              <span>{fmt(progress.xpIntoLevel)} / {fmt(progress.xpNeededForLevel)} XP</span>
              <span>Seviye {progress.level + 1}</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-black/30">
              <div className="h-full rounded-full bg-green-400 transition-all" style={{ width: `${percent}%` }} />
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-300">Achievement</p>
              <h2 className="mt-2 text-2xl font-black">Rozet Koleksiyonu</h2>
            </div>
            <p className="text-sm font-black text-slate-400">{data.unlockedCount ?? 0}/{data.totalAchievements ?? achievements.length}</p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {achievements.map((item) => (
              <article
                key={item.code}
                className={`rounded-2xl border p-4 transition ${
                  item.unlocked
                    ? "border-yellow-400/25 bg-yellow-400/[0.07]"
                    : "border-white/[0.07] bg-white/[0.025] opacity-55 grayscale"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black/20 text-2xl">{item.icon}</div>
                  <div className="min-w-0">
                    <p className="font-black">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{item.description}</p>
                    <p className={`mt-2 text-[10px] font-black uppercase tracking-wider ${item.unlocked ? "text-yellow-300" : "text-slate-600"}`}>
                      {item.unlocked ? "Açıldı" : "Kilitli"}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-20 rounded-xl border border-white/10 bg-black/15 px-3 py-3">
      <p className="font-black">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}
