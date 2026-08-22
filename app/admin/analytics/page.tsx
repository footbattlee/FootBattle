"use client";

import { useEffect, useMemo, useState } from "react";

type RangeKey = "today" | "7d" | "30d" | "all";
type GameAnalyticsRow = {
  gameName: string;
  started: number;
  completed: number;
  abandoned: number;
  playAgain: number;
  shared: number;
  completionRate: number;
  averageDurationSeconds: number;
};
type DuelSummary = {
  created: number;
  accepted: number;
  started: number;
  completed: number;
  rejected: number;
  cancelled: number;
  uniquePlayers: number;
};
type DuelGameRow = {
  gameCode: string;
  created: number;
  accepted: number;
  started: number;
  completed: number;
  rejected: number;
  cancelled: number;
};
type SurvivorAnalyticsRow = {
  id: string;
  slug: string;
  title: string;
  isActive: boolean;
  completions: number;
};
type AnalyticsSummary = {
  totalStarted: number;
  totalCompleted: number;
  totalAbandoned: number;
  totalPlayAgain: number;
  totalShared: number;
  averageDurationSeconds: number;
};
type AnalyticsResponse = {
  ok?: boolean;
  error?: string;
  summary?: AnalyticsSummary;
  games?: GameAnalyticsRow[];
  duelSummary?: DuelSummary;
  duelGames?: DuelGameRow[];
  survivors?: SurvivorAnalyticsRow[];
};

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: "today", label: "Bugün" },
  { key: "7d", label: "Son 7 Gün" },
  { key: "30d", label: "Son 30 Gün" },
  { key: "all", label: "Tümü" },
];

const GAME_LABELS: Record<string, string> = {
  wordle: "Wordle",
  guess_the_player: "Guess the Player",
  super_lig_guess_the_player: "Süper Lig Guess the Player",
  player_quiz: "Player Quiz",
  transfer_quiz: "Transfer Quiz",
  tic_tac_toe: "Futbol Tic Tac Toe",
  club_nation: "1 Takım 1 Millet",
  club_clash: "2 Takım 1 Oyuncu",
  career_path: "Career Path",
};

const EMPTY_SUMMARY: AnalyticsSummary = {
  totalStarted: 0,
  totalCompleted: 0,
  totalAbandoned: 0,
  totalPlayAgain: 0,
  totalShared: 0,
  averageDurationSeconds: 0,
};

const EMPTY_DUEL_SUMMARY: DuelSummary = {
  created: 0,
  accepted: 0,
  started: 0,
  completed: 0,
  rejected: 0,
  cancelled: 0,
  uniquePlayers: 0,
};

function getGameLabel(gameName: string) {
  return GAME_LABELS[gameName] ?? gameName;
}
function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}
function formatPercentage(value: number) {
  return `%${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}`;
}
function formatDuration(seconds: number) {
  if (!seconds) return "-";
  if (seconds < 60) return `${seconds} sn`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes} dk ${rest} sn` : `${minutes} dk`;
}

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<RangeKey>("7d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<AnalyticsSummary>(EMPTY_SUMMARY);
  const [games, setGames] = useState<GameAnalyticsRow[]>([]);
  const [duelSummary, setDuelSummary] = useState<DuelSummary>(EMPTY_DUEL_SUMMARY);
  const [duelGames, setDuelGames] = useState<DuelGameRow[]>([]);
  const [survivors, setSurvivors] = useState<SurvivorAnalyticsRow[]>([]);

  useEffect(() => { void loadAnalytics(); }, [range]);

  async function loadAnalytics() {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`/api/admin/analytics?range=${encodeURIComponent(range)}`, { cache: "no-store" });
      const result = (await response.json()) as AnalyticsResponse;
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Analytics verileri yüklenemedi.");
      setSummary(result.summary ?? EMPTY_SUMMARY);
      setGames(result.games ?? []);
      setDuelSummary(result.duelSummary ?? EMPTY_DUEL_SUMMARY);
      setDuelGames(result.duelGames ?? []);
      setSurvivors(result.survivors ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Analytics verileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  const overallCompletionRate = summary.totalStarted > 0 ? (summary.totalCompleted / summary.totalStarted) * 100 : 0;
  const mostPlayedGame = useMemo(() => [...games].sort((a, b) => b.started - a.started)[0] ?? null, [games]);
  const mostAbandonedGame = useMemo(() => [...games].sort((a, b) => b.abandoned - a.abandoned)[0] ?? null, [games]);
  const duelAcceptRate = duelSummary.created > 0 ? (duelSummary.accepted / duelSummary.created) * 100 : 0;
  const duelStartRate = duelSummary.accepted > 0 ? (duelSummary.started / duelSummary.accepted) * 100 : 0;
  const duelCompletionRate = duelSummary.started > 0 ? (duelSummary.completed / duelSummary.started) * 100 : 0;

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-green-400">FootBattle Admin</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">Oyun Raporları</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Başlatma, tamamlama, tahmini terk, oyun süresi, tekrar oynama, paylaşım, düello funnel ve Survivor performansını takip et.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {RANGE_OPTIONS.map((option) => (
              <button key={option.key} type="button" onClick={() => setRange(option.key)} className={`rounded-xl px-4 py-2.5 text-xs font-black transition sm:text-sm ${range === option.key ? "bg-green-500 text-[#07111f]" : "border border-white/10 bg-white/[0.03] text-slate-400 hover:text-white"}`}>{option.label}</button>
            ))}
          </div>
        </div>

        {error && <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-300">{error}</div>}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <SummaryCard label="Başlatma" value={formatNumber(summary.totalStarted)} icon="🎮" loading={loading} />
          <SummaryCard label="Tamamlama" value={formatNumber(summary.totalCompleted)} icon="✅" loading={loading} />
          <SummaryCard label="Tahmini Terk (15 dk+)" value={formatNumber(summary.totalAbandoned)} icon="🚪" loading={loading} />
          <SummaryCard label="Ort. Süre" value={formatDuration(summary.averageDurationSeconds)} icon="⏱️" loading={loading} />
          <SummaryCard label="Tekrar Oyna" value={formatNumber(summary.totalPlayAgain)} icon="🔁" loading={loading} />
          <SummaryCard label="Paylaşım" value={formatNumber(summary.totalShared)} icon="📤" loading={loading} />
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-3">
          <InsightCard label="Genel Tamamlama Oranı" value={formatPercentage(overallCompletionRate)} detail="Tamamlanan oyunların başlatılan oyunlara oranı." tone="green" />
          <InsightCard label="En Çok Oynanan" value={mostPlayedGame ? getGameLabel(mostPlayedGame.gameName) : "-"} detail={mostPlayedGame ? `${formatNumber(mostPlayedGame.started)} kez başlatıldı.` : "Henüz veri yok."} tone="yellow" />
          <InsightCard label="En Çok Terk Edilen" value={mostAbandonedGame ? getGameLabel(mostAbandonedGame.gameName) : "-"} detail={mostAbandonedGame ? `${formatNumber(mostAbandonedGame.abandoned)} adet 15 dakikadan eski tamamlanmamış başlangıç.` : "Henüz veri yok."} tone="red" />
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-green-400/15 bg-green-400/[0.025]">
          <div className="border-b border-white/10 px-5 py-4">
            <p className="font-black">⚔️ Düello Funnel</p>
            <p className="mt-1 text-xs text-slate-500">Davetten maçı bitirmeye kadar gerçek düello akışı. Bu bölüm doğrudan duels tablosundan hesaplanır; eski düellolar da dahildir.</p>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <MiniCard label="Davet" value={formatNumber(duelSummary.created)} />
            <MiniCard label="Kabul" value={formatNumber(duelSummary.accepted)} />
            <MiniCard label="Başladı" value={formatNumber(duelSummary.started)} />
            <MiniCard label="Tamamlandı" value={formatNumber(duelSummary.completed)} />
            <MiniCard label="Reddedildi" value={formatNumber(duelSummary.rejected)} />
            <MiniCard label="İptal" value={formatNumber(duelSummary.cancelled)} />
            <MiniCard label="Tekil Oyuncu" value={formatNumber(duelSummary.uniquePlayers)} />
          </div>
          <div className="grid gap-3 border-t border-white/10 p-5 md:grid-cols-3">
            <InsightCard label="Davet → Kabul" value={formatPercentage(duelAcceptRate)} detail="Seçili aralıkta kabul edilen davetler / oluşturulan davetler." tone="green" />
            <InsightCard label="Kabul → Başlama" value={formatPercentage(duelStartRate)} detail="Kabul edilen düelloların oyuna dönüşme oranı." tone="yellow" />
            <InsightCard label="Başlama → Bitiş" value={formatPercentage(duelCompletionRate)} detail="Başlatılan düelloların tamamlanma oranı." tone="green" />
          </div>
          <div className="overflow-x-auto border-t border-white/10">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-black/10"><tr className="text-[11px] font-black uppercase tracking-wider text-slate-500"><th className="px-5 py-4">Oyun</th><th className="px-5 py-4 text-right">Davet</th><th className="px-5 py-4 text-right">Kabul</th><th className="px-5 py-4 text-right">Başladı</th><th className="px-5 py-4 text-right">Bitti</th><th className="px-5 py-4 text-right">Red</th><th className="px-5 py-4 text-right">İptal</th></tr></thead>
              <tbody>{duelGames.length === 0 ? <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">Bu aralıkta düello verisi yok.</td></tr> : duelGames.map((game) => <tr key={game.gameCode} className="border-t border-white/5"><td className="px-5 py-4 font-black">{getGameLabel(game.gameCode)}</td><td className="px-5 py-4 text-right font-black">{formatNumber(game.created)}</td><td className="px-5 py-4 text-right font-black">{formatNumber(game.accepted)}</td><td className="px-5 py-4 text-right font-black">{formatNumber(game.started)}</td><td className="px-5 py-4 text-right font-black text-green-300">{formatNumber(game.completed)}</td><td className="px-5 py-4 text-right font-black text-red-300">{formatNumber(game.rejected)}</td><td className="px-5 py-4 text-right font-black text-slate-400">{formatNumber(game.cancelled)}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
            <div><p className="font-black">Oyun Bazlı Performans</p><p className="mt-1 text-xs text-slate-500">Tahmini terk; completion ile eşleşmeyen ve en az 15 dakika önce başlamış oturumdur. Aktif/yeni oturumlar terk sayılmaz.</p></div>
            <button type="button" onClick={() => void loadAnalytics()} disabled={loading} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-black text-slate-300 disabled:opacity-40">{loading ? "Yükleniyor..." : "Yenile"}</button>
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left">
              <thead className="border-b border-white/10 bg-black/10"><tr className="text-[11px] font-black uppercase tracking-wider text-slate-500"><th className="px-5 py-4">Oyun</th><th className="px-5 py-4 text-right">Başlatma</th><th className="px-5 py-4 text-right">Tamamlama</th><th className="px-5 py-4 text-right">Terk</th><th className="px-5 py-4 text-right">Oran</th><th className="px-5 py-4 text-right">Ort. Süre</th><th className="px-5 py-4 text-right">Tekrar</th><th className="px-5 py-4 text-right">Paylaşım</th></tr></thead>
              <tbody>{games.length === 0 ? <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-slate-500">{loading ? "Rapor yükleniyor..." : "Bu tarih aralığında oyun verisi yok."}</td></tr> : games.map((game) => <tr key={game.gameName} className="border-b border-white/5 last:border-0"><td className="px-5 py-4"><p className="font-black">{getGameLabel(game.gameName)}</p><p className="mt-1 text-[10px] text-slate-600">{game.gameName}</p></td><td className="px-5 py-4 text-right font-black">{formatNumber(game.started)}</td><td className="px-5 py-4 text-right font-black">{formatNumber(game.completed)}</td><td className="px-5 py-4 text-right font-black text-red-300">{formatNumber(game.abandoned)}</td><td className="px-5 py-4 text-right"><CompletionBadge value={game.completionRate} /></td><td className="px-5 py-4 text-right font-black">{formatDuration(game.averageDurationSeconds)}</td><td className="px-5 py-4 text-right font-black">{formatNumber(game.playAgain)}</td><td className="px-5 py-4 text-right font-black">{formatNumber(game.shared)}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="divide-y divide-white/5 md:hidden">{games.map((game) => <div key={game.gameName} className="p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-black">{getGameLabel(game.gameName)}</p><p className="mt-1 text-[10px] text-slate-600">{game.gameName}</p></div><CompletionBadge value={game.completionRate} /></div><div className="mt-4 grid grid-cols-2 gap-2"><MobileStat label="Başlatma" value={formatNumber(game.started)} /><MobileStat label="Tamamlama" value={formatNumber(game.completed)} /><MobileStat label="Tahmini Terk" value={formatNumber(game.abandoned)} /><MobileStat label="Ort. Süre" value={formatDuration(game.averageDurationSeconds)} /></div></div>)}</div>
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-yellow-300/15 bg-yellow-300/[0.025]">
          <div className="border-b border-white/10 px-5 py-4"><p className="font-black">O Mu Bu Mu? / Survivor Tamamlamaları</p><p className="mt-1 text-xs text-slate-500">Seçili tarih aralığında sonuç ekranına ulaşan turnuvalar. Başlatma eventi olmadığı için burada tamamlanma oranı değil, tamamlanma adedi gösterilir.</p></div>
          <div className="divide-y divide-white/5">
            {survivors.length === 0 ? <div className="px-5 py-10 text-sm text-slate-500">Henüz Survivor sonucu yok.</div> : survivors.map((item, index) => <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4"><div className="min-w-0"><p className="truncate font-black"><span className="mr-2 text-slate-600">#{index + 1}</span>{item.title}</p><p className="mt-1 text-[10px] text-slate-600">/{item.slug} · {item.isActive ? "aktif" : "pasif"}</p></div><div className="shrink-0 rounded-xl border border-yellow-300/20 bg-yellow-300/10 px-4 py-2 text-right"><p className="text-xl font-black text-yellow-200">{formatNumber(item.completions)}</p><p className="text-[9px] font-black uppercase text-yellow-200/50">Tamamlama</p></div></div>)}
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value, icon, loading }: { label: string; value: string; icon: string; loading: boolean }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</p><span className="text-lg">{icon}</span></div><p className="mt-3 text-2xl font-black">{loading ? "..." : value}</p></div>;
}
function MiniCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-black/10 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-xl font-black">{value}</p></div>;
}
function InsightCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "green" | "yellow" | "red" }) {
  const toneClass = tone === "green" ? "text-green-400" : tone === "yellow" ? "text-yellow-300" : "text-red-300";
  return <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><p className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</p><p className={`mt-2 text-2xl font-black ${toneClass}`}>{value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p></div>;
}
function CompletionBadge({ value }: { value: number }) {
  const className = value >= 70 ? "border-green-500/20 bg-green-500/10 text-green-300" : value >= 40 ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-300" : "border-red-500/20 bg-red-500/10 text-red-300";
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${className}`}>{formatPercentage(value)}</span>;
}
function MobileStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/5 bg-black/15 p-3"><p className="text-[10px] font-black uppercase tracking-wider text-slate-600">{label}</p><p className="mt-1 text-base font-black">{value}</p></div>;
}
