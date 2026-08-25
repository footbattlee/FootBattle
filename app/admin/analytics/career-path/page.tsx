"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RangeKey = "today" | "7d" | "30d" | "all";
type GameAnalyticsRow = {
  gameName: string;
  started: number;
  completed: number;
  abandoned: number;
  inProgress: number;
  playAgain: number;
  shared: number;
  uniqueUsers: number;
  completionRate: number;
  averageDurationSeconds: number;
};
type AnalyticsResponse = { ok?: boolean; error?: string; source?: string; games?: GameAnalyticsRow[] };

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: "today", label: "Bugün" },
  { key: "7d", label: "7 Gün" },
  { key: "30d", label: "30 Gün" },
  { key: "all", label: "Tümü" },
];

function number(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function percent(value: number) {
  return `%${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}`;
}

function duration(seconds: number) {
  if (!seconds) return "-";
  if (seconds < 60) return `${seconds} sn`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return remaining ? `${minutes} dk ${remaining} sn` : `${minutes} dk`;
}

export default function CareerPathAnalyticsPage() {
  const [range, setRange] = useState<RangeKey>("7d");
  const [row, setRow] = useState<GameAnalyticsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [source, setSource] = useState("");

  useEffect(() => {
    void load();
  }, [range]);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`/api/admin/analytics?range=${encodeURIComponent(range)}`, { cache: "no-store" });
      const data = (await response.json()) as AnalyticsResponse;
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Career Path analytics yüklenemedi.");
      setSource(data.source ?? "");
      setRow((data.games ?? []).find((game) => game.gameName === "career_path") ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Career Path analytics yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  const started = row?.started ?? 0;
  const completed = row?.completed ?? 0;
  const abandoned = row?.abandoned ?? 0;
  const active = row?.inProgress ?? 0;
  const resolved = completed + abandoned;
  const abandonRate = resolved ? (abandoned / resolved) * 100 : 0;

  return (
    <main className="min-h-screen bg-[#07111f] px-3 py-4 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href="/admin/analytics" className="text-xs font-black text-slate-400 hover:text-white">← Tüm raporlar</Link>
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-green-400 sm:text-xs">FootBattle Admin</p>
            <h1 className="mt-1 text-2xl font-black sm:text-4xl">Kariyer Yolu Analytics</h1>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400 sm:text-sm">
              Oyunun server session yaşam döngüsü: başladı, tamamlandı, terk edildi ve halen aktif.
            </p>
          </div>
          <button onClick={() => void load()} disabled={loading} className="shrink-0 rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-300 disabled:opacity-50">
            {loading ? "..." : "Yenile"}
          </button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 sm:mt-6">
          {RANGES.map((item) => (
            <button
              key={item.key}
              onClick={() => setRange(item.key)}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-black ${range === item.key ? "bg-green-500 text-[#07111f]" : "border border-white/10 bg-white/[0.03] text-slate-400"}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {source === "canonical_game_sessions" && (
          <p className="mt-3 text-[10px] font-black text-emerald-400 sm:text-xs">✓ Canonical game_sessions aktif</p>
        )}

        {error && <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-300">{error}</div>}

        <section className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-4 sm:gap-4">
          <Metric label="Başladı" value={number(started)} icon="▶️" loading={loading} />
          <Metric label="Bitti" value={number(completed)} icon="✅" loading={loading} />
          <Metric label="Terk" value={number(abandoned)} icon="🚪" loading={loading} />
          <Metric label="Aktif" value={number(active)} icon="⏳" loading={loading} />
        </section>

        <section className="mt-2 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-4 sm:gap-4">
          <Metric label="Tamamlama" value={percent(row?.completionRate ?? 0)} icon="🎯" loading={loading} />
          <Metric label="Terk Oranı" value={percent(abandonRate)} icon="📉" loading={loading} />
          <Metric label="Ort. Süre" value={duration(row?.averageDurationSeconds ?? 0)} icon="⏱️" loading={loading} />
          <Metric label="Tekil Kullanıcı" value={number(row?.uniqueUsers ?? 0)} icon="👤" loading={loading} />
        </section>

        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:mt-6 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-black">Session Funnel</h2>
              <p className="mt-1 text-[10px] text-slate-500 sm:text-xs">Gerçek server kayıtları üzerinden hesaplanır.</p>
            </div>
            <span className="rounded-full bg-blue-400/10 px-2.5 py-1 text-[10px] font-black text-blue-300">Career Path</span>
          </div>

          <div className="mt-4 space-y-3">
            <Funnel label="Başlatılan" value={started} max={started} />
            <Funnel label="Tamamlanan" value={completed} max={started} />
            <Funnel label="Terk edilen" value={abandoned} max={started} />
            <Funnel label="Devam eden" value={active} max={started} />
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-yellow-300/15 bg-yellow-300/[0.025] p-4 text-xs leading-5 text-slate-400 sm:mt-6 sm:p-5 sm:text-sm">
          <p className="font-black text-yellow-200">Lifecycle kuralı</p>
          <p className="mt-1">Oyun açıldığında <strong className="text-white">active</strong>, sonuç kaydedildiğinde <strong className="text-white">finished</strong>, 30 dakika sonuçlanmadan açık kalırsa <strong className="text-white">abandoned</strong> sayılır.</p>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, icon, loading }: { label: string; value: string; icon: string; loading: boolean }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.035] p-3 sm:rounded-2xl sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[9px] font-black uppercase text-slate-500 sm:text-[10px]">{label}</p>
        <span className="text-sm sm:text-base">{icon}</span>
      </div>
      <p className="mt-2 truncate text-xl font-black sm:mt-3 sm:text-2xl">{loading ? "..." : value}</p>
    </div>
  );
}

function Funnel({ label, value, max }: { label: string; value: number; max: number }) {
  const width = max ? Math.max(value ? 3 : 0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] font-black sm:text-xs">
        <span className="text-slate-400">{label}</span>
        <span>{number(value)}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-green-400 transition-all" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
