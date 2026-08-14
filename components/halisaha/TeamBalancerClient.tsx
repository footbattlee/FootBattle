"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  Download,
  LockKeyhole,
  RefreshCcw,
  Scale,
  Share2,
  Shield,
  Swords,
  Users,
} from "lucide-react";
import { toPng } from "html-to-image";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  balanceTeams,
  type BalanceOptions,
  type BalancePair,
  type BalancePlayer,
  type BalancedTeams,
  type PlayerRatings,
  type PlayerRole,
} from "@/lib/halisaha/balance";
import type { MatchRow, MatchRsvpRow } from "@/lib/halisaha/match";

type MatchResponse = {
  ok?: boolean;
  error?: string;
  match?: MatchRow;
  rsvps?: MatchRsvpRow[];
};

type PlayerSetup = PlayerRatings & {
  role: PlayerRole;
  keeperLocked: boolean;
};

type SetupMap = Record<string, PlayerSetup>;

type PairRule = {
  id: string;
  kind: "together" | "apart";
  pair: BalancePair;
};

const DEFAULT_SETUP: PlayerSetup = {
  overall: 3,
  keeper: 3,
  defence: 3,
  attack: 3,
  stamina: 3,
  role: "any",
  keeperLocked: false,
};

const ROLE_LABELS: Record<PlayerRole, string> = {
  any: "Farketmez",
  keeper: "Kaleci",
  defence: "Defans",
  attack: "Hücum",
};

export default function TeamBalancerClient({ id }: { id: string }) {
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [players, setPlayers] = useState<MatchRsvpRow[]>([]);
  const [setups, setSetups] = useState<SetupMap>({});
  const [result, setResult] = useState<BalancedTeams | null>(null);
  const [rules, setRules] = useState<PairRule[]>([]);
  const [pairFirst, setPairFirst] = useState("");
  const [pairSecond, setPairSecond] = useState("");
  const [selectedA, setSelectedA] = useState("");
  const [selectedB, setSelectedB] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch(`/api/halisaha-matches/${id}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as MatchResponse;
        if (!response.ok || !data.ok || !data.match) {
          throw new Error(data.error || "Maç yüklenemedi.");
        }

        const yesPlayers = (data.rsvps ?? []).filter((item) => item.status === "yes");
        setMatch(data.match);
        setPlayers(yesPlayers);

        const saved = window.localStorage.getItem(`halisaha-ratings:${id}`);
        const parsed = saved ? (JSON.parse(saved) as SetupMap) : {};
        const next: SetupMap = {};
        yesPlayers.forEach((player) => {
          next[player.id] = { ...DEFAULT_SETUP, ...(parsed[player.id] ?? {}) };
        });
        setSetups(next);

        const savedRules = window.localStorage.getItem(`halisaha-rules:${id}`);
        if (savedRules) setRules(JSON.parse(savedRules) as PairRule[]);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Maç yüklenemedi.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const balancePlayers = useMemo<BalancePlayer[]>(
    () =>
      players.map((player) => {
        const setup = setups[player.id] ?? DEFAULT_SETUP;
        return {
          id: player.id,
          name: player.player_name,
          ratings: {
            overall: setup.overall,
            keeper: setup.keeper,
            defence: setup.defence,
            attack: setup.attack,
            stamina: setup.stamina,
          },
          preferredRole: setup.role,
          keeperLocked: setup.keeperLocked,
        };
      }),
    [players, setups],
  );

  const balanceOptions = useMemo<BalanceOptions>(() => {
    return {
      together: rules.filter((rule) => rule.kind === "together").map((rule) => rule.pair),
      apart: rules.filter((rule) => rule.kind === "apart").map((rule) => rule.pair),
    };
  }, [rules]);

  function updateSetup(playerId: string, patch: Partial<PlayerSetup>) {
    setSetups((current) => {
      const next = {
        ...current,
        [playerId]: {
          ...(current[playerId] ?? DEFAULT_SETUP),
          ...patch,
        },
      };
      window.localStorage.setItem(`halisaha-ratings:${id}`, JSON.stringify(next));
      return next;
    });
    setResult(null);
  }

  function runBalance() {
    try {
      setResult(balanceTeams(balancePlayers, balanceOptions));
      setSelectedA("");
      setSelectedB("");
      setError("");
      setMessage("");
    } catch (balanceError) {
      setError(balanceError instanceof Error ? balanceError.message : "Takımlar dengelenemedi.");
    }
  }

  function addRule(kind: PairRule["kind"]) {
    if (!pairFirst || !pairSecond || pairFirst === pairSecond) {
      setMessage("Kural için iki farklı oyuncu seç.");
      return;
    }
    const exists = rules.some(
      (rule) =>
        rule.kind === kind &&
        rule.pair.includes(pairFirst) &&
        rule.pair.includes(pairSecond),
    );
    if (exists) {
      setMessage("Bu kural zaten ekli.");
      return;
    }
    const next = [
      ...rules,
      {
        id: crypto.randomUUID(),
        kind,
        pair: [pairFirst, pairSecond] as BalancePair,
      },
    ];
    setRules(next);
    window.localStorage.setItem(`halisaha-rules:${id}`, JSON.stringify(next));
    setPairFirst("");
    setPairSecond("");
    setResult(null);
    setMessage("");
  }

  function removeRule(ruleId: string) {
    const next = rules.filter((rule) => rule.id !== ruleId);
    setRules(next);
    window.localStorage.setItem(`halisaha-rules:${id}`, JSON.stringify(next));
    setResult(null);
  }

  function manualSwap() {
    if (!result || !selectedA || !selectedB) return;
    const playerA = result.teamA.find((player) => player.id === selectedA);
    const playerB = result.teamB.find((player) => player.id === selectedB);
    if (!playerA || !playerB) return;

    const teamA = result.teamA.map((player) => (player.id === playerA.id ? playerB : player));
    const teamB = result.teamB.map((player) => (player.id === playerB.id ? playerA : player));
    const recalculated = balanceTeams([...teamA, ...teamB], {
      together: [],
      apart: [],
    });

    setResult({
      ...result,
      teamA,
      teamB,
      scoreA: Math.round(teamA.reduce((sum, p) => sum + playerScore(p), 0) * 10) / 10,
      scoreB: Math.round(teamB.reduce((sum, p) => sum + playerScore(p), 0) * 10) / 10,
      difference: Math.round(Math.abs(
        teamA.reduce((sum, p) => sum + playerScore(p), 0) -
          teamB.reduce((sum, p) => sum + playerScore(p), 0),
      ) * 10) / 10,
      balancePercent: recalculated.balancePercent,
    });
    setSelectedA("");
    setSelectedB("");
  }

  function openTeamInBuilder(team: BalancePlayer[], teamName: string, bodyColor: string) {
    if (!match || team.length < 5) {
      setMessage("Saha editörü için takımda en az 5 oyuncu olmalı.");
      return;
    }
    const selected = team.slice(0, 11);
    const payload = {
      squadName: `${match.title} - ${teamName}`,
      playerCount: selected.length,
      players: selected.map((player) => player.name),
      bodyColor,
      sleeveColor: bodyColor === "#111827" ? "#ffffff" : "#111827",
      tactic: "balanced",
      positions: [],
      drawings: [],
    };
    const encoded = window.btoa(encodeURIComponent(JSON.stringify(payload)));
    window.location.href = `/halisaha-kadro?kadro=${encoded}`;
  }

  async function buildShareImage() {
    if (!shareRef.current) return null;
    return toPng(shareRef.current, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#07111f",
    });
  }

  async function downloadTeams() {
    const dataUrl = await buildShareImage();
    if (!dataUrl) return;
    const anchor = document.createElement("a");
    anchor.href = dataUrl;
    anchor.download = `footbattle-${match?.title ?? "halisaha"}-takimlar.png`;
    anchor.click();
  }

  async function shareTeams() {
    try {
      const dataUrl = await buildShareImage();
      if (!dataUrl) return;
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "footbattle-takimlar.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${match?.title ?? "Halısaha"} takımları`,
          text: "⚽ FootBattle dengeli halısaha takımları",
          files: [file],
        });
        return;
      }
      await downloadTeams();
      setMessage("Paylaşım desteklenmediği için görsel indirildi.");
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      setMessage("Görsel paylaşılırken hata oluştu.");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07111f] p-6 text-center text-slate-400">
        Oyuncular yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href={`/halisaha-mac/${id}`} className="text-sm font-bold text-slate-400">
              ← Maça dön
            </Link>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-green-400">
              FootBattle Takım Dengeleyici
            </p>
            <h1 className="mt-1 text-3xl font-black sm:text-4xl">Takımları Dengele</h1>
            <p className="mt-2 text-sm text-slate-400">
              {match?.title ?? "Halısaha maçı"} · {players.length} oyuncu
            </p>
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

        {error ? (
          <p className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm font-bold text-red-200">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-5 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm font-bold text-yellow-100">
            {message}
          </p>
        ) : null}

        <section className="mt-6 rounded-3xl border border-white/10 bg-[#0d1828] p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <Scale className="mt-1 text-yellow-300" size={22} />
            <div>
              <h2 className="text-xl font-black">Oyuncuları puanla</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                1 zayıf, 5 çok iyi. Pozisyon tercihi ve kaleci kilidi dengelemede hesaba katılır.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {players.map((player) => {
              const setup = setups[player.id] ?? DEFAULT_SETUP;
              return (
                <article key={player.id} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-400 font-black text-[#07111f]">
                        {player.player_name.slice(0, 1).toUpperCase()}
                      </div>
                      <h3 className="font-black">{player.player_name}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateSetup(player.id, { keeperLocked: !setup.keeperLocked })}
                      className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-black ${
                        setup.keeperLocked
                          ? "border-yellow-400/40 bg-yellow-400 text-[#07111f]"
                          : "border-white/10 bg-white/5 text-slate-300"
                      }`}
                    >
                      <LockKeyhole size={15} /> {setup.keeperLocked ? "Kaleci Kilitli" : "Kaleci Kilitle"}
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <RoleField value={setup.role} onChange={(role) => updateSetup(player.id, { role })} />
                    <RatingField label="Genel" value={setup.overall} onChange={(value) => updateSetup(player.id, { overall: value })} />
                    <RatingField label="Kaleci" value={setup.keeper} onChange={(value) => updateSetup(player.id, { keeper: value })} />
                    <RatingField label="Defans" value={setup.defence} onChange={(value) => updateSetup(player.id, { defence: value })} />
                    <RatingField label="Hücum" value={setup.attack} onChange={(value) => updateSetup(player.id, { attack: value })} />
                    <RatingField label="Kondisyon" value={setup.stamina} onChange={(value) => updateSetup(player.id, { stamina: value })} />
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-[#0d1828] p-4 sm:p-6">
          <h2 className="text-xl font-black">Takım kuralları <span className="text-sm text-slate-500">(opsiyonel)</span></h2>
          <p className="mt-1 text-sm text-slate-400">İki oyuncuyu aynı takımda tut veya özellikle ayır.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <PlayerSelect value={pairFirst} players={players} placeholder="1. oyuncu" onChange={setPairFirst} />
            <PlayerSelect value={pairSecond} players={players} placeholder="2. oyuncu" onChange={setPairSecond} />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => addRule("together")} className="min-h-11 rounded-xl bg-green-400 px-4 font-black text-[#07111f]">
              🤝 Aynı Takımda
            </button>
            <button type="button" onClick={() => addRule("apart")} className="min-h-11 rounded-xl bg-red-400 px-4 font-black text-[#07111f]">
              ↔️ Ayrı Takımlarda
            </button>
          </div>
          {rules.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {rules.map((rule) => (
                <button
                  key={rule.id}
                  type="button"
                  onClick={() => removeRule(rule.id)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300"
                  title="Kuralı kaldır"
                >
                  {rule.kind === "together" ? "🤝" : "↔️"} {playerName(players, rule.pair[0])} + {playerName(players, rule.pair[1])} ×
                </button>
              ))}
            </div>
          ) : null}
        </section>

        {result ? (
          <>
            <div ref={shareRef} className="mt-6 rounded-3xl bg-[#07111f] p-3 sm:p-5">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-green-400">FootBattle</p>
                  <h2 className="mt-1 text-2xl font-black">{match?.title ?? "Halısaha"}</h2>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-500">Denge</p>
                  <p className="text-2xl font-black text-green-300">%{result.balancePercent}</p>
                </div>
              </div>
              <section className="grid gap-5 lg:grid-cols-2">
                <TeamCard title="Sarı Takım" icon={<Swords size={21} />} players={result.teamA} score={result.scoreA} variant="yellow" />
                <TeamCard title="Siyah Takım" icon={<Shield size={21} />} players={result.teamB} score={result.scoreB} variant="black" />
              </section>
              <p className="mt-4 text-center text-xs font-bold text-slate-600">foot-battle.vercel.app · Futbolu biliyorsan, kanıtla.</p>
            </div>

            <section className="mt-4 rounded-3xl border border-green-400/20 bg-green-400/[0.05] p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <PlayerSelect value={selectedA} players={toRsvp(result.teamA)} placeholder="Sarı takımdan seç" onChange={setSelectedA} />
                <PlayerSelect value={selectedB} players={toRsvp(result.teamB)} placeholder="Siyah takımdan seç" onChange={setSelectedB} />
              </div>
              <button
                type="button"
                disabled={!selectedA || !selectedB}
                onClick={manualSwap}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 font-black disabled:opacity-40"
              >
                <ArrowLeftRight size={17} /> Seçilen Oyuncuları Değiştir
              </button>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <button type="button" onClick={() => void shareTeams()} className="min-h-11 rounded-xl bg-yellow-400 px-3 font-black text-[#07111f]">
                  <span className="inline-flex items-center gap-2"><Share2 size={16} /> Görseli Paylaş</span>
                </button>
                <button type="button" onClick={() => void downloadTeams()} className="min-h-11 rounded-xl border border-white/10 px-3 font-black">
                  <span className="inline-flex items-center gap-2"><Download size={16} /> PNG İndir</span>
                </button>
                <button type="button" onClick={() => openTeamInBuilder(result.teamA, "Sarı Takım", "#facc15")} className="min-h-11 rounded-xl border border-yellow-400/30 px-3 font-black text-yellow-300">
                  Sarıyı Sahaya Taşı
                </button>
                <button type="button" onClick={() => openTeamInBuilder(result.teamB, "Siyah Takım", "#111827")} className="min-h-11 rounded-xl border border-white/20 px-3 font-black">
                  Siyahı Sahaya Taşı
                </button>
              </div>

              <button type="button" onClick={runBalance} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-black">
                <RefreshCcw size={16} /> Yeniden Dengele
              </button>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

function playerScore(player: BalancePlayer) {
  const r = player.ratings;
  return r.overall * 3 + r.defence * 1.5 + r.attack * 1.5 + r.stamina + r.keeper * 0.75;
}

function playerName(players: MatchRsvpRow[], id: string) {
  return players.find((player) => player.id === id)?.player_name ?? "Oyuncu";
}

function toRsvp(players: BalancePlayer[]): MatchRsvpRow[] {
  return players.map((player) => ({
    id: player.id,
    match_id: "",
    participant_token: "",
    player_name: player.name,
    status: "yes",
    updated_at: "",
    created_at: "",
  }));
}

function RatingField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#07111f] px-3 font-black outline-none">
        {[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score} ⭐</option>)}
      </select>
    </label>
  );
}

function RoleField({ value, onChange }: { value: PlayerRole; onChange: (value: PlayerRole) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">Pozisyon</span>
      <select value={value} onChange={(event) => onChange(event.target.value as PlayerRole)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#07111f] px-3 font-black outline-none">
        {(Object.keys(ROLE_LABELS) as PlayerRole[]).map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
      </select>
    </label>
  );
}

function PlayerSelect({ value, players, placeholder, onChange }: { value: string; players: MatchRsvpRow[]; placeholder: string; onChange: (value: string) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-white/10 bg-[#07111f] px-3 font-bold outline-none">
      <option value="">{placeholder}</option>
      {players.map((player) => <option key={player.id} value={player.id}>{player.player_name}</option>)}
    </select>
  );
}

function TeamCard({ title, icon, players, score, variant }: { title: string; icon: React.ReactNode; players: BalancePlayer[]; score: number; variant: "yellow" | "black" }) {
  const yellow = variant === "yellow";
  return (
    <div className={`rounded-3xl border p-5 ${yellow ? "border-yellow-400/30 bg-yellow-400/[0.08]" : "border-white/15 bg-[#0d1828]"}`}>
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 ${yellow ? "text-yellow-300" : "text-slate-200"}`}>{icon}<h2 className="text-xl font-black text-white">{title}</h2></div>
        <span className="rounded-full bg-white/5 px-3 py-1 text-sm font-black text-slate-300">{score}</span>
      </div>
      <div className="mt-4 space-y-2">
        {players.map((player, index) => (
          <div key={player.id} className="flex items-center justify-between gap-3 rounded-xl bg-black/10 px-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${yellow ? "bg-yellow-400 text-[#07111f]" : "bg-white/10 text-white"}`}>{index + 1}</span>
              <span className="truncate font-bold">{player.name}</span>
            </div>
            <span className="shrink-0 text-xs font-black text-slate-500">{ROLE_LABELS[player.preferredRole ?? "any"]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
