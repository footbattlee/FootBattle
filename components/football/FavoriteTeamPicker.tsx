"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { Locale } from "@/lib/i18n/config";

type TeamOption = {
  teamId: string;
  teamName: string;
  logo: string | null;
  competition: string;
  competitionName: string;
  competitionNameEn: string;
};

type FavoriteTeam = {
  teamId: string;
  teamName: string | null;
  competition: string | null;
  logo: string | null;
};

type FavoriteTeamResponse = {
  ok?: boolean;
  authenticated?: boolean;
  favorite?: FavoriteTeam | null;
  options?: TeamOption[];
  error?: string;
};

const SKIP_KEY = "footbattle_favorite_team_prompt_skip_until";
const SKIP_DAYS = 7;

export default function FavoriteTeamPicker({ locale, mode = "prompt" }: { locale: Locale; mode?: "prompt" | "page" }) {
  const tr = locale === "tr";
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [favorite, setFavorite] = useState<FavoriteTeam | null>(null);
  const [options, setOptions] = useState<TeamOption[]>([]);
  const [competition, setCompetition] = useState("super-lig");
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (mode === "prompt") {
      const skipUntil = Number(window.localStorage.getItem(SKIP_KEY) ?? 0);
      if (Number.isFinite(skipUntil) && skipUntil > Date.now()) {
        setDismissed(true);
        setLoading(false);
        return;
      }
    }

    void (async () => {
      try {
        const response = await fetch("/api/profile/favorite-team", { cache: "no-store" });
        if (response.status === 401) {
          setAuthenticated(false);
          return;
        }
        const data = (await response.json()) as FavoriteTeamResponse;
        if (!response.ok || !data.ok) throw new Error(data.error ?? "LOAD_FAILED");
        setAuthenticated(true);
        setFavorite(data.favorite ?? null);
        setOptions(data.options ?? []);
        if (data.favorite?.competition) setCompetition(data.favorite.competition);
      } catch {
        setMessage(tr ? "Takım listesi şu anda yüklenemedi." : "Team list is temporarily unavailable.");
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, tr]);

  const competitions = useMemo(() => {
    const map = new Map<string, { key: string; tr: string; en: string }>();
    for (const item of options) {
      if (!map.has(item.competition)) {
        map.set(item.competition, { key: item.competition, tr: item.competitionName, en: item.competitionNameEn });
      }
    }
    return Array.from(map.values());
  }, [options]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(tr ? "tr-TR" : "en-US");
    return options
      .filter((item) => item.competition === competition)
      .filter((item) => !normalizedQuery || item.teamName.toLocaleLowerCase(tr ? "tr-TR" : "en-US").includes(normalizedQuery));
  }, [competition, options, query, tr]);

  const selected = options.find((item) => `${item.competition}:${item.teamId}` === selectedKey) ?? null;

  async function saveFavorite() {
    if (!selected || saving) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/profile/favorite-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: selected.teamId, competition: selected.competition }),
      });
      const data = (await response.json()) as FavoriteTeamResponse;
      if (!response.ok || !data.ok || !data.favorite) throw new Error(data.error ?? "SAVE_FAILED");
      setFavorite(data.favorite);
      window.localStorage.removeItem(SKIP_KEY);
      setMessage(tr ? "Favori takımın kaydedildi. ✅" : "Your favorite team was saved. ✅");
      if (mode === "prompt") window.setTimeout(() => setDismissed(true), 700);
    } catch {
      setMessage(tr ? "Takım kaydedilemedi. Tekrar deneyebilirsin." : "Team could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function skip() {
    const until = Date.now() + SKIP_DAYS * 24 * 60 * 60 * 1000;
    window.localStorage.setItem(SKIP_KEY, String(until));
    setDismissed(true);
  }

  if (loading || dismissed || !authenticated) return null;
  if (mode === "prompt" && favorite) return null;

  const content = (
    <section className={mode === "prompt" ? "w-full max-w-lg rounded-3xl border border-emerald-300/20 bg-[#0b1625] p-5 shadow-2xl" : "rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-7"}>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-xl">⚽</div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-300">{tr ? "SANA ÖZEL FOOTBATTLE" : "YOUR FOOTBATTLE"}</p>
          <h2 className="mt-1 text-xl font-black text-white">{tr ? "Hangi takımı destekliyorsun?" : "Which team do you support?"}</h2>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            {tr ? "Favori takımını kaydedelim; fikstür, tahmin ve oyun önerilerini ileride sana göre kişiselleştirelim." : "Save your favorite team so we can personalize fixtures, predictions and game recommendations later."}
          </p>
        </div>
      </div>

      {favorite && mode === "page" ? (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-400/[.06] p-3">
          {favorite.logo ? <img src={favorite.logo} alt="" className="h-10 w-10 object-contain" /> : <div className="h-10 w-10 rounded-xl bg-white/10" />}
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">{tr ? "Mevcut takımın" : "Current team"}</p>
            <p className="truncate text-sm font-black text-white">{favorite.teamName ?? "-"}</p>
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-slate-400">
          {tr ? "Lig" : "League"}
          <select value={competition} onChange={(event) => { setCompetition(event.target.value); setSelectedKey(""); }} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-sm font-black text-white outline-none">
            {competitions.map((item) => <option key={item.key} value={item.key}>{tr ? item.tr : item.en}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-400">
          {tr ? "Takım ara" : "Search team"}
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tr ? "Galatasaray..." : "Arsenal..."} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600" />
        </label>
      </div>

      <div className="mt-4 max-h-56 space-y-2 overflow-y-auto pr-1">
        {filtered.map((team) => {
          const key = `${team.competition}:${team.teamId}`;
          const active = selectedKey === key;
          return (
            <button key={key} type="button" onClick={() => setSelectedKey(key)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${active ? "border-emerald-300/50 bg-emerald-400/10" : "border-white/[.07] bg-white/[.025]"}`}>
              {team.logo ? <img src={team.logo} alt="" className="h-8 w-8 shrink-0 object-contain" /> : <div className="h-8 w-8 shrink-0 rounded-full bg-white/10" />}
              <span className="min-w-0 flex-1 truncate text-sm font-black text-white">{team.teamName}</span>
              {active ? <span className="text-emerald-300">✓</span> : null}
            </button>
          );
        })}
        {!filtered.length ? <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">{tr ? "Takım bulunamadı." : "No team found."}</p> : null}
      </div>

      {message ? <p className="mt-3 text-xs font-bold text-emerald-200">{message}</p> : null}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button type="button" disabled={!selected || saving} onClick={() => void saveFavorite()} className="flex-1 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-[#07111f] disabled:cursor-not-allowed disabled:opacity-40">
          {saving ? (tr ? "Kaydediliyor..." : "Saving...") : favorite && mode === "page" ? (tr ? "Takımımı Güncelle" : "Update My Team") : (tr ? "Takımımı Kaydet" : "Save My Team")}
        </button>
        {mode === "prompt" ? (
          <button type="button" onClick={skip} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-slate-400">{tr ? "Şimdilik geç" : "Not now"}</button>
        ) : (
          <Link href={`/${locale}/profile`} className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-black text-slate-300">{tr ? "Profile Dön" : "Back to Profile"}</Link>
        )}
      </div>
    </section>
  );

  if (mode === "page") return content;
  return <div className="fixed inset-x-0 bottom-24 z-[70] flex justify-center px-4 sm:bottom-6">{content}</div>;
}
