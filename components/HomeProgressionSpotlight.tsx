"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Response = {
  ok?: boolean;
  authenticated?: boolean;
  progress?: {
    xp: number;
    level: number;
    xpIntoLevel: number;
    xpNeededForLevel: number;
    currentStreak: number;
    bestStreak: number;
  };
  unlockedCount?: number;
  totalAchievements?: number;
};

function homeLocale(pathname: string) {
  if (pathname === "/en") return "en" as const;
  if (pathname === "/" || pathname === "/tr") return "tr" as const;
  return null;
}

export default function HomeProgressionSpotlight() {
  const pathname = usePathname();
  const locale = homeLocale(pathname);
  const tr = locale !== "en";
  const [data, setData] = useState<Response | null>(null);

  useEffect(() => {
    if (!locale) return;
    let cancelled = false;
    fetch("/api/progression", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: Response) => {
        if (!cancelled && result.ok) setData(result);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [locale]);

  const percent = useMemo(() => {
    const progress = data?.progress;
    if (!progress) return 0;
    return Math.min(100, Math.max(0, Math.round((progress.xpIntoLevel / Math.max(1, progress.xpNeededForLevel)) * 100)));
  }, [data]);

  if (!locale) return null;

  const fmt = (value: number) => new Intl.NumberFormat(tr ? "tr-TR" : "en-US").format(value);
  const rankHref = `/${locale}/rank`;

  if (!data?.authenticated || !data.progress) {
    return (
      <div className="border-b border-green-400/10 bg-gradient-to-r from-green-400/[0.07] via-[#081523] to-yellow-400/[0.05] text-white">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 py-2.5 text-xs sm:justify-between sm:px-6">
          <p className="font-bold text-slate-300"><span className="mr-2 text-green-300">⚡ {tr ? "Arena sistemi aktif" : "Arena system is live"}</span> {tr ? "Oyna, XP kazan, seviye atla ve rozet topla." : "Play, earn XP, level up and collect badges."}</p>
          <div className="flex items-center gap-4 font-black">
            <Link href={rankHref} className="text-yellow-300 hover:text-yellow-200">🏆 {tr ? "Sıralama" : "Leaderboard"}</Link>
            <Link href="/achievements" className="text-green-300 hover:text-green-200">⭐ {tr ? "Başarımlar" : "Achievements"}</Link>
          </div>
        </div>
      </div>
    );
  }

  const progress = data.progress;
  return (
    <div className="border-b border-green-400/15 bg-gradient-to-r from-green-400/[0.09] via-[#081523] to-purple-500/[0.07] text-white">
      <div className="mx-auto grid max-w-[1240px] gap-3 px-4 py-3 sm:px-6 md:grid-cols-[auto_minmax(180px,1fr)_auto] md:items-center md:gap-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-green-400/25 bg-green-400/15 text-sm font-black text-green-200">L{progress.level}</div>
          <div><p className="text-xs font-black uppercase tracking-[0.15em] text-green-300">{tr ? "Arena Seviyesi" : "Arena Level"}</p><p className="text-xs text-slate-400">{fmt(progress.xp)} XP · 🔥 {progress.currentStreak} {tr ? "gün" : "days"}</p></div>
        </div>
        <div className="min-w-0">
          <div className="flex justify-between text-[10px] font-bold text-slate-500"><span>{tr ? "Seviye" : "Level"} {progress.level}</span><span>{fmt(progress.xpIntoLevel)} / {fmt(progress.xpNeededForLevel)} XP</span><span>{progress.level + 1}</span></div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/30"><div className="h-full rounded-full bg-green-400" style={{ width: `${percent}%` }} /></div>
        </div>
        <div className="flex items-center justify-between gap-4 md:justify-end">
          <Link href="/achievements" className="text-xs font-black text-yellow-300 hover:text-yellow-200">⭐ {data.unlockedCount ?? 0}/{data.totalAchievements ?? 0} {tr ? "Rozet" : "Badges"}</Link>
          <Link href={rankHref} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-white hover:border-yellow-400/30">🏆 {tr ? "Sıralama" : "Leaderboard"}</Link>
        </div>
      </div>
    </div>
  );
}
