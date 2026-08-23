"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type RangeKey = "today" | "7d" | "30d" | "all";
type OpponentFilter = "all" | "human" | "bot";
type RankedSummary = {
  totalMatches: number;
  humanMatches: number;
  botMatches: number;
  completed: number;
  active: number;
  uniquePlayers: number;
  botRate: number;
  completionRate: number;
};
type RankedGameRow = {
  gameCode: string;
  total: number;
  human: number;
  bot: number;
  completed: number;
  active: number;
  draws: number;
  botRate: number;
  completionRate: number;
};
type RankedResponse = { ok?: boolean; error?: string; summary?: RankedSummary; games?: RankedGameRow[] };

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: "today", label: "Bugün" },
  { key: "7d", label: "Son 7 Gün" },
  { key: "30d", label: "Son 30 Gün" },
  { key: "all", label: "Tümü" },
];
const GAME_LABELS: Record<string, string> = {
  tic_tac_toe: "Futbol Tic Tac Toe",
  club_clash: "2 Takım 1 Oyuncu",
};
const EMPTY: RankedSummary = { totalMatches: 0, humanMatches: 0, botMatches: 0, completed: 0, active: 0, uniquePlayers: 0, botRate: 0, completionRate: 0 };

function n(value: number) { return new Intl.NumberFormat("tr-TR").format(value); }
function pct(value: number) { return `%${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}`; }
function label(code: string) { return GAME_LABELS[code] ?? code; }

export default function RankedAnalyticsPage() {
  const [range, setRange] = useState<RangeKey>("7d");
  const [opponent, setOpponent] = useState<OpponentFilter>("all");
  const [gameFilter, setGameFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<RankedSummary>(EMPTY);
  const [games, setGames] = useState<RankedGameRow[]>([]);

  useEffect(() => { void load(); }, [range]);
  async function load() {
    try {
      setLoading(true); setError("");
      const response = await fetch(`/api/admin/analytics/ranked?range=${range}`, { cache: "no-store" });
      const result = (await response.json()) as RankedResponse;
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Ranked raporu yüklenemedi.");
      setSummary(result.summary ?? EMPTY); setGames(result.games ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Ranked raporu yüklenemedi."); }
    finally { setLoading(false); }
  }

  const visible = useMemo(() => games
    .filter((g) => gameFilter === "all" || g.gameCode === gameFilter)
    .map((g) => {
      const selected = opponent === "human" ? g.human : opponent === "bot" ? g.bot : g.total;
      return { ...g, selected };
    }), [games, gameFilter, opponent]);

  return <main className="min-h-screen bg-[#07111f] px-4 py-8 text-white sm:px-6">
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/admin/analytics" className="text-xs font-black uppercase tracking-[0.18em] text-green-400 hover:text-green-300">← Oyun Raporları</Link>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">Ranked Raporları</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Ranked eşleşmeleri doğrudan ranked_matches tablosundan gelir. Oyun ve rakip tipi kırılımında gerçek oyuncu / bot dağılımını takip edebilirsin.</p>
        </div>
        <div className="flex flex-wrap gap-2">{RANGE_OPTIONS.map((o) => <button key={o.key} onClick={() => setRange(o.key)} className={`rounded-xl px-4 py-2.5 text-xs font-black ${range === o.key ? "bg-green-500 text-[#07111f]" : "border border-white/10 bg-white/[0.03] text-slate-400"}`}>{o.label}</button>)}</div>
      </div>

      {error && <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-300">{error}</div>}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Card label="Toplam Maç" value={n(summary.totalMatches)} loading={loading} />
        <Card label="Gerçek Oyuncu" value={n(summary.humanMatches)} loading={loading} />
        <Card label="Botlu" value={n(summary.botMatches)} loading={loading} />
        <Card label="Bot Oranı" value={pct(summary.botRate)} loading={loading} />
        <Card label="Tamamlandı" value={n(summary.completed)} loading={loading} />
        <Card label="Aktif" value={n(summary.active)} loading={loading} />
        <Card label="Tekil Oyuncu" value={n(summary.uniquePlayers)} loading={loading} />
      </section>

      <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div><p className="font-black">Filtreler</p><p className="mt-1 text-xs text-slate-500">Tablodaki maç adedini oyun ve rakip tipine göre daralt.</p></div>
          <div className="flex flex-wrap gap-2">
            <select value={gameFilter} onChange={(e) => setGameFilter(e.target.value)} className="rounded-xl border border-white/10 bg-[#0b1727] px-4 py-2.5 text-xs font-black text-white">
              <option value="all">Tüm oyunlar</option>{games.map((g) => <option key={g.gameCode} value={g.gameCode}>{label(g.gameCode)}</option>)}
            </select>
            <select value={opponent} onChange={(e) => setOpponent(e.target.value as OpponentFilter)} className="rounded-xl border border-white/10 bg-[#0b1727] px-4 py-2.5 text-xs font-black text-white">
              <option value="all">Bot + Gerçek</option><option value="human">Sadece gerçek oyuncu</option><option value="bot">Sadece bot</option>
            </select>
            <button onClick={() => void load()} disabled={loading} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-black text-slate-300 disabled:opacity-40">{loading ? "Yükleniyor..." : "Yenile"}</button>
          </div>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-2xl border border-green-400/15 bg-green-400/[0.025]">
        <div className="border-b border-white/10 px-5 py-4"><p className="font-black">Oyun Bazlı Ranked</p><p className="mt-1 text-xs text-slate-500">Seçilen tarih aralığında oluşturulan ranked maç cohort'u. Gerçek ve botlu maçlar ayrı tutulur.</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-black/10"><tr className="text-[11px] font-black uppercase tracking-wider text-slate-500"><th className="px-5 py-4">Oyun</th><th className="px-5 py-4 text-right">Filtreli Maç</th><th className="px-5 py-4 text-right">Toplam</th><th className="px-5 py-4 text-right">Gerçek</th><th className="px-5 py-4 text-right">Bot</th><th className="px-5 py-4 text-right">Bot Oranı</th><th className="px-5 py-4 text-right">Bitti</th><th className="px-5 py-4 text-right">Aktif</th><th className="px-5 py-4 text-right">Bitiş Oranı</th></tr></thead>
            <tbody>{visible.length === 0 ? <tr><td colSpan={9} className="px-5 py-12 text-center text-sm text-slate-500">{loading ? "Rapor yükleniyor..." : "Bu filtrede ranked maç yok."}</td></tr> : visible.map((g) => <tr key={g.gameCode} className="border-t border-white/5"><td className="px-5 py-4"><p className="font-black">{label(g.gameCode)}</p><p className="mt-1 text-[10px] text-slate-600">{g.gameCode}</p></td><td className="px-5 py-4 text-right text-lg font-black text-green-300">{n(g.selected)}</td><td className="px-5 py-4 text-right font-black">{n(g.total)}</td><td className="px-5 py-4 text-right font-black">{n(g.human)}</td><td className="px-5 py-4 text-right font-black text-yellow-200">{n(g.bot)}</td><td className="px-5 py-4 text-right font-black">{pct(g.botRate)}</td><td className="px-5 py-4 text-right font-black text-green-300">{n(g.completed)}</td><td className="px-5 py-4 text-right font-black text-slate-300">{n(g.active)}</td><td className="px-5 py-4 text-right font-black">{pct(g.completionRate)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-xs leading-6 text-slate-500">Not: Bot oranı = botlu ranked maç / toplam ranked maç. İnsan-insan maç tek maç olarak sayılır; iki ayrı oyuncu eventi olarak şişirilmez. Bu nedenle bu ekran matchmaking eventlerinden değil doğrudan ranked_matches source-of-truth tablosundan hesaplanır.</div>
    </div>
  </main>;
}

function Card({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</p><p className="mt-3 text-2xl font-black">{loading ? "..." : value}</p></div>;
}
