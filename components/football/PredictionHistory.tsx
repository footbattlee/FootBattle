"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { COMPETITIONS, type CompetitionKey } from "@/lib/football/competition-hubs";
import type { Locale } from "@/lib/i18n/config";
import type { MatchPrediction } from "@/components/football/MatchPredictionControls";

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-GB", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function PredictionHistory({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  const [rows, setRows] = useState<MatchPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/predictions?history=1", { cache: "no-store" }).catch(() => null);
      if (!response) { setLoading(false); return; }
      if (response.status === 401) { setUnauthorized(true); setLoading(false); return; }
      const payload = await response.json().catch(() => null);
      setRows(Array.isArray(payload?.predictions) ? payload.predictions : []);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const settled = rows.filter((row) => row.status === "settled");
    return {
      total: rows.length,
      exact: settled.filter((row) => row.xp_awarded === 100).length,
      correct: settled.filter((row) => row.xp_awarded >= 20).length,
      xp: settled.reduce((sum, row) => sum + row.xp_awarded, 0),
    };
  }, [rows]);

  if (unauthorized) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[.035] p-6 text-center">
        <h2 className="text-xl font-black">{tr ? "Tahminlerini görmek için giriş yap" : "Sign in to view your predictions"}</h2>
        <Link href={`/login?next=/${locale}/predictions`} className="mt-4 inline-flex rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-[#07111f]">
          {tr ? "Giriş Yap" : "Sign In"}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[{ label: tr ? "Tahmin" : "Predictions", value: stats.total }, { label: tr ? "Tam İsabet" : "Exact", value: stats.exact }, { label: tr ? "Doğru Sonuç" : "Correct result", value: stats.correct }, { label: "XP", value: stats.xp }].map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{item.label}</p>
            <p className="mt-1 text-2xl font-black text-white">{item.value}</p>
          </div>
        ))}
      </div>

      {loading ? <p className="text-sm text-slate-500">{tr ? "Tahminler yükleniyor..." : "Loading predictions..."}</p> : null}
      {!loading && !rows.length ? <p className="rounded-2xl border border-white/10 p-5 text-sm text-slate-500">{tr ? "Henüz tahmin yapmadın." : "You have not made any predictions yet."}</p> : null}

      <div className="space-y-3">
        {rows.map((row) => {
          const key = row.competition as CompetitionKey;
          const competition = COMPETITIONS[key];
          return (
            <article key={row.id} className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[.14em] text-cyan-300">{competition ? `${competition.emoji} ${tr ? competition.trName : competition.enName}` : row.competition}</p>
                  <p className="mt-1 truncate text-sm font-black text-white">{row.home_team} vs {row.away_team}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{formatDate(row.kickoff_at, locale)}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-white">{row.predicted_home}-{row.predicted_away}</p>
                  {row.status === "settled" ? <p className="text-xs font-black text-emerald-300">+{row.xp_awarded} XP</p> : <p className="text-[10px] font-black text-amber-300">{tr ? "BEKLİYOR" : "PENDING"}</p>}
                </div>
              </div>
              {row.status === "settled" ? (
                <div className="mt-3 border-t border-white/5 pt-3 text-xs text-slate-400">
                  {tr ? "Maç sonucu" : "Final score"}: <span className="font-black text-white">{row.actual_home}-{row.actual_away}</span>
                  <span className="ml-3">{row.xp_awarded === 100 ? (tr ? "🎯 Tam isabet" : "🎯 Exact score") : row.xp_awarded === 20 ? (tr ? "✓ Sonuç doğru" : "✓ Correct result") : (tr ? "Tahmin tutmadı" : "Missed")}</span>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
