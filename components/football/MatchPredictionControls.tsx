"use client";

import { useEffect, useState } from "react";

import type { CompetitionKey, MatchRow } from "@/lib/football/competition-hubs";
import type { Locale } from "@/lib/i18n/config";

export type MatchPrediction = {
  id: string;
  competition: string;
  match_id: string;
  kickoff_at: string;
  home_team: string;
  away_team: string;
  predicted_home: number;
  predicted_away: number;
  actual_home: number | null;
  actual_away: number | null;
  xp_awarded: number;
  status: "pending" | "settled" | "void";
};

export default function MatchPredictionControls({
  match,
  competition,
  locale,
  prediction,
  authRequired,
  onSaved,
}: {
  match: MatchRow;
  competition: CompetitionKey;
  locale: Locale;
  prediction: MatchPrediction | null;
  authRequired: boolean;
  onSaved: (prediction: MatchPrediction) => void;
}) {
  const tr = locale === "tr";
  const [home, setHome] = useState(String(prediction?.predicted_home ?? ""));
  const [away, setAway] = useState(String(prediction?.predicted_away ?? ""));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setHome(prediction ? String(prediction.predicted_home) : "");
    setAway(prediction ? String(prediction.predicted_away) : "");
  }, [prediction?.id, prediction?.predicted_home, prediction?.predicted_away]);

  const kickoffLocked = new Date(match.date).getTime() <= Date.now();
  const locked = kickoffLocked || match.state !== "pre" || prediction?.status === "settled";

  if (prediction?.status === "settled") {
    const exact = prediction.xp_awarded === 100;
    const result = prediction.xp_awarded === 20;
    return (
      <div className="mt-4 rounded-xl border border-white/10 bg-black/15 p-3">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-black text-white">{tr ? "Tahminin" : "Your pick"}: {prediction.predicted_home}-{prediction.predicted_away}</span>
          <span className={exact ? "font-black text-emerald-300" : result ? "font-black text-cyan-300" : "font-black text-slate-500"}>
            +{prediction.xp_awarded} XP
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          {exact ? (tr ? "🎯 Tam isabet" : "🎯 Exact score") : result ? (tr ? "✓ Maç sonucu doğru" : "✓ Correct result") : (tr ? "Tahmin tutmadı" : "Prediction missed")}
        </p>
      </div>
    );
  }

  if (locked) {
    if (!prediction) return null;
    return (
      <div className="mt-4 rounded-xl border border-white/10 bg-black/15 p-3 text-xs">
        <span className="font-black text-white">{tr ? "Tahminin" : "Your pick"}: {prediction.predicted_home}-{prediction.predicted_away}</span>
        <span className="ml-2 text-slate-500">🔒 {tr ? "Kilitledi" : "Locked"}</span>
      </div>
    );
  }

  const submit = async () => {
    if (authRequired) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }
    const h = Number(home);
    const a = Number(away);
    if (!Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0 || h > 20 || a > 20) {
      setMessage(tr ? "0-20 arasında geçerli skor gir." : "Enter a valid score between 0 and 20.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/predictions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ competition, matchId: match.id, homeScore: h, awayScore: a }),
      });
      const payload = await response.json().catch(() => null);
      if (response.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        return;
      }
      if (!response.ok || !payload?.prediction) {
        setMessage(payload?.error === "PREDICTION_LOCKED" ? (tr ? "Maç başladı, tahmin kilitlendi." : "The match has started. Prediction is locked.") : (tr ? "Tahmin kaydedilemedi." : "Could not save prediction."));
        return;
      }
      onSaved(payload.prediction as MatchPrediction);
      setMessage(tr ? "Tahmin kaydedildi ✓" : "Prediction saved ✓");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/[.045] p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-300">{tr ? "SKOR TAHMİNİ" : "SCORE PREDICTION"}</span>
        {prediction ? <span className="text-[10px] font-black text-slate-500">{tr ? "Başlama saatine kadar değişir" : "Editable until kickoff"}</span> : null}
      </div>
      <div className="mt-3 grid grid-cols-[1fr_54px_12px_54px] items-center gap-2">
        <span className="truncate text-xs font-black text-white">{match.home.name}</span>
        <input value={home} onChange={(event) => setHome(event.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" aria-label={`${match.home.name} score`} className="h-10 rounded-lg border border-white/10 bg-[#0d1828] text-center text-base font-black text-white outline-none focus:border-emerald-300/50" />
        <span className="text-center font-black text-slate-500">-</span>
        <input value={away} onChange={(event) => setAway(event.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" aria-label={`${match.away.name} score`} className="h-10 rounded-lg border border-white/10 bg-[#0d1828] text-center text-base font-black text-white outline-none focus:border-emerald-300/50" />
      </div>
      <button type="button" onClick={submit} disabled={saving} className="mt-3 w-full rounded-lg bg-emerald-400 px-3 py-2.5 text-xs font-black text-[#07111f] disabled:opacity-50">
        {authRequired ? (tr ? "Giriş yap ve tahmin et" : "Sign in to predict") : saving ? (tr ? "Kaydediliyor..." : "Saving...") : prediction ? (tr ? "Tahmini Güncelle" : "Update Prediction") : (tr ? "Tahmini Kaydet" : "Save Prediction")}
      </button>
      {message ? <p className="mt-2 text-[11px] font-bold text-slate-400">{message}</p> : null}
    </div>
  );
}
