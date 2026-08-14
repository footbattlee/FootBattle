"use client";

import Link from "next/link";
import { RefreshCcw, Scale, Shield, Swords, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { balanceTeams, type BalancePlayer, type PlayerRatings } from "@/lib/halisaha/balance";
import type { MatchRow, MatchRsvpRow } from "@/lib/halisaha/match";

type MatchResponse = {
  ok?: boolean;
  error?: string;
  match?: MatchRow;
  rsvps?: MatchRsvpRow[];
};

type RatingMap = Record<string, PlayerRatings>;

const DEFAULT_RATINGS: PlayerRatings = {
  overall: 3,
  keeper: 3,
  defence: 3,
  attack: 3,
  stamina: 3,
};

export default function TeamBalancerClient({ id }: { id: string }) {
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [players, setPlayers] = useState<MatchRsvpRow[]>([]);
  const [ratings, setRatings] = useState<RatingMap>({});
  const [result, setResult] = useState<ReturnType<typeof balanceTeams> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch(`/api/halisaha-matches/${id}`, { cache: "no-store" });
        const data = (await response.json()) as MatchResponse;
        if (!response.ok || !data.ok || !data.match) {
          throw new Error(data.error || "Maç yüklenemedi.");
        }

        const yesPlayers = (data.rsvps ?? []).filter((item) => item.status === "yes");
        setMatch(data.match);
        setPlayers(yesPlayers);

        const saved = window.localStorage.getItem(`halisaha-ratings:${id}`);
        const parsed = saved ? (JSON.parse(saved) as RatingMap) : {};
        const next: RatingMap = {};
        yesPlayers.forEach((player) => {
          next[player.id] = parsed[player.id] ?? { ...DEFAULT_RATINGS };
        });
        setRatings(next);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Maç yüklenemedi.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const balancePlayers = useMemo<BalancePlayer[]>(
    () =>
      players.map((player) => ({
        id: player.id,
        name: player.player_name,
        ratings: ratings[player.id] ?? DEFAULT_RATINGS,
      })),
    [players, ratings],
  );

  function updateRating(playerId: string, key: keyof PlayerRatings, value: number) {
    setRatings((current) => {
      const next = {
        ...current,
        [playerId]: {
          ...(current[playerId] ?? DEFAULT_RATINGS),
          [key]: value,
        },
      };
      window.localStorage.setItem(`halisaha-ratings:${id}`, JSON.stringify(next));
      return next;
    });
    setResult(null);
  }

  function runBalance() {
    try {
      setResult(balanceTeams(balancePlayers));
      setError("");
    } catch (balanceError) {
      setError(balanceError instanceof Error ? balanceError.message : "Takımlar dengelenemedi.");
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-[#07111f] p-6 text-center text-slate-400">Oyuncular yükleniyor...</main>;
  }

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href={`/halisaha-mac/${id}`} className="text-sm font-bold text-slate-400">← Maça dön</Link>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-green-400">Sprint 2</p>
            <h1 className="mt-1 text-3xl font-black sm:text-4xl">Takımları Dengele</h1>
            <p className="mt-2 text-sm text-slate-400">{match?.title ?? "Halısaha maçı"} · {players.length} oyuncu</p>
          </div>
          <button
            type="button"
            onClick={runBalance}
            disabled={players.length < 4}
            className="min-h-12 rounded-2xl bg-yellow-400 px-6 py-3 font-black text-[#07111f] disabled:opacity-40"
          >
            ⚖️ Takımları Oluştur
          </button>
        </header>

        {error ? <p className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm font-bold text-red-200">{error}</p> : null}

        <section className="mt-6 rounded-3xl border border-white/10 bg-[#0d1828] p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <Scale className="mt-1 text-yellow-300" size={22} />
            <div>
              <h2 className="text-xl font-black">Oyuncuları puanla</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">1 zayıf, 5 çok iyi. İlk sürümde puanlar sadece bu cihazda saklanıyor.</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {players.map((player) => {
              const playerRatings = ratings[player.id] ?? DEFAULT_RATINGS;
              return (
                <article key={player.id} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-400 font-black text-[#07111f]">{player.player_name.slice(0, 1).toUpperCase()}</div>
                    <h3 className="font-black">{player.player_name}</h3>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-5">
                    <RatingField label="Genel" value={playerRatings.overall} onChange={(value) => updateRating(player.id, "overall", value)} />
                    <RatingField label="Kaleci" value={playerRatings.keeper} onChange={(value) => updateRating(player.id, "keeper", value)} />
                    <RatingField label="Defans" value={playerRatings.defence} onChange={(value) => updateRating(player.id, "defence", value)} />
                    <RatingField label="Hücum" value={playerRatings.attack} onChange={(value) => updateRating(player.id, "attack", value)} />
                    <RatingField label="Kondisyon" value={playerRatings.stamina} onChange={(value) => updateRating(player.id, "stamina", value)} />
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {result ? (
          <section className="mt-6 grid gap-5 lg:grid-cols-2">
            <TeamCard title="Sarı Takım" icon={<Swords size={21} />} players={result.teamA} score={result.scoreA} />
            <TeamCard title="Siyah Takım" icon={<Shield size={21} />} players={result.teamB} score={result.scoreB} />
            <div className="lg:col-span-2 rounded-2xl border border-green-400/20 bg-green-400/[0.06] p-4 text-center">
              <p className="text-sm font-bold text-slate-400">Güç farkı</p>
              <p className="mt-1 text-3xl font-black text-green-300">{result.difference}</p>
              <button type="button" onClick={runBalance} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-black">
                <RefreshCcw size={16} /> Yeniden hesapla
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function RatingField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#07111f] px-3 font-black outline-none"
      >
        {[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score} ⭐</option>)}
      </select>
    </label>
  );
}

function TeamCard({ title, icon, players, score }: { title: string; icon: React.ReactNode; players: BalancePlayer[]; score: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0d1828] p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-yellow-300">{icon}<h2 className="text-xl font-black text-white">{title}</h2></div>
        <span className="rounded-full bg-white/5 px-3 py-1 text-sm font-black text-slate-300">{score}</span>
      </div>
      <div className="mt-4 space-y-2">
        {players.map((player, index) => (
          <div key={player.id} className="flex items-center gap-3 rounded-xl bg-black/10 px-3 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-xs font-black text-slate-400">{index + 1}</span>
            <span className="font-bold">{player.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
