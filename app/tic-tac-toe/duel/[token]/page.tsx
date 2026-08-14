"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";

type Role = "challenger" | "opponent" | "visitor";
type ChallengeResponse = {
  ok?: boolean;
  role?: Role;
  canJoin?: boolean;
  waitingForOpponent?: boolean;
  expired?: boolean;
  error?: string;
  challenge?: {
    id: number;
    token: string;
    gameCode: string;
    status: string;
    challenger: { name: string | null; score: number };
    opponent: { name: string | null; score: number } | null;
    winnerSide: "challenger" | "opponent" | "draw" | null;
    startedAt: string | null;
    completedAt: string | null;
  };
};

type GridAxis = { index: number; type: "club" | "nationality"; value: string };
type Player = {
  id: number;
  name: string;
  nationality: string | null;
  currentClubName: string | null;
  imageUrl: string | null;
};
type DuelState = {
  ok?: boolean;
  error?: string;
  role?: "challenger" | "opponent";
  completed?: boolean;
  result?: "win" | "loss" | "draw" | null;
  winnerSide?: "challenger" | "opponent" | "draw" | null;
  remainingSeconds?: number;
  challenge?: {
    status: string;
    challenger: { name: string; score: number };
    opponent: { name: string; score: number };
  };
  grid?: {
    rows: GridAxis[];
    columns: GridAxis[];
    cells: Array<{ rowIndex: number; columnIndex: number; player: Player }>;
  };
  me?: { score: number; correctCount: number; wrongCount: number };
  opponent?: { score: number; correctCount: number; wrongCount: number };
};

type SearchResponse = { ok?: boolean; error?: string; players?: Player[] };

type AnswerResponse = {
  ok?: boolean;
  error?: string;
  correct?: boolean;
  completed?: boolean;
  message?: string;
};

function formatTimer(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export default function TicTacToeDuelPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);
  const [duel, setDuel] = useState<DuelState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [selectedCell, setSelectedCell] = useState<{ rowIndex: number; columnIndex: number } | null>(null);
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [searching, setSearching] = useState(false);
  const [answerMessage, setAnswerMessage] = useState("");
  const [answerCorrect, setAnswerCorrect] = useState<boolean | null>(null);

  const loadChallenge = useCallback(async () => {
    const response = await fetch(`/api/challenges/${encodeURIComponent(token)}`, { cache: "no-store" });
    const result = (await response.json()) as ChallengeResponse;
    if (!response.ok || !result.ok) throw new Error(result.error ?? "Düello yüklenemedi.");
    if (result.challenge?.gameCode !== "tic_tac_toe") throw new Error("Bu bağlantı Tic Tac Toe düellosu değil.");
    setChallenge(result);
    return result;
  }, [token]);

  const loadDuel = useCallback(async () => {
    const response = await fetch(`/api/challenges/${encodeURIComponent(token)}/tic-tac-toe/state`, { cache: "no-store" });
    const result = (await response.json()) as DuelState;
    if (!response.ok || !result.ok) {
      if (response.status === 409) return null;
      throw new Error(result.error ?? "Oyun durumu yüklenemedi.");
    }
    setDuel(result);
    return result;
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const current = await loadChallenge();
        if (!cancelled && (current.challenge?.status === "playing" || current.challenge?.status === "completed")) {
          await loadDuel();
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Düello yüklenemedi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadChallenge, loadDuel]);

  useEffect(() => {
    const status = challenge?.challenge?.status;
    if (!status || status === "completed" || status === "expired") return;

    const id = window.setInterval(() => {
      void loadChallenge()
        .then((current) => {
          if (current.challenge?.status === "playing") return loadDuel();
          return null;
        })
        .catch(() => undefined);
    }, 2200);
    return () => window.clearInterval(id);
  }, [challenge?.challenge?.status, loadChallenge, loadDuel]);

  useEffect(() => {
    if (challenge?.challenge?.status !== "playing" || duel?.completed) return;
    const id = window.setInterval(() => {
      void loadDuel().catch(() => undefined);
    }, 1400);
    return () => window.clearInterval(id);
  }, [challenge?.challenge?.status, duel?.completed, loadDuel]);

  useEffect(() => {
    if (!selectedCell || query.trim().length < 2) {
      setPlayers([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const id = window.setTimeout(() => {
      setSearching(true);
      void fetch(`/api/tic-tac-toe/search-player?q=${encodeURIComponent(query.trim())}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then((response) => response.json() as Promise<SearchResponse>)
        .then((result) => setPlayers(result.ok ? result.players ?? [] : []))
        .catch(() => undefined)
        .finally(() => setSearching(false));
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(id);
    };
  }, [query, selectedCell]);

  async function joinDuel() {
    try {
      setActionLoading(true);
      setError("");
      const response = await fetch("/api/challenges/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, opponentName: opponentName.trim() || "Misafir" }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Düelloya katılınamadı.");
      await loadChallenge();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Düelloya katılınamadı.");
    } finally {
      setActionLoading(false);
    }
  }

  async function startDuel() {
    try {
      setActionLoading(true);
      setError("");
      const response = await fetch("/api/challenges/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Düello başlatılamadı.");
      await loadChallenge();
      await loadDuel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Düello başlatılamadı.");
    } finally {
      setActionLoading(false);
    }
  }

  async function shareDuel() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "FootBattle Tic Tac Toe Düello",
          text: "⚔️ Futbol Tic Tac Toe’da kapışalım!",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      // User may cancel native sharing.
    }
  }

  async function answer(player: Player) {
    if (!selectedCell) return;
    try {
      setActionLoading(true);
      setAnswerMessage("");
      setAnswerCorrect(null);
      const response = await fetch(`/api/challenges/${encodeURIComponent(token)}/tic-tac-toe/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rowIndex: selectedCell.rowIndex,
          columnIndex: selectedCell.columnIndex,
          playerId: player.id,
        }),
      });
      const result = (await response.json()) as AnswerResponse;
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Cevap gönderilemedi.");
      setAnswerCorrect(Boolean(result.correct));
      setAnswerMessage(result.message ?? (result.correct ? "Doğru!" : "Yanlış."));
      if (result.correct) {
        setSelectedCell(null);
        setQuery("");
        setPlayers([]);
      }
      await loadDuel();
      if (result.completed) await loadChallenge();
    } catch (err) {
      setAnswerCorrect(false);
      setAnswerMessage(err instanceof Error ? err.message : "Cevap gönderilemedi.");
    } finally {
      setActionLoading(false);
    }
  }

  const solvedMap = useMemo(() => {
    const map = new Map<string, Player>();
    for (const cell of duel?.grid?.cells ?? []) {
      map.set(`${cell.rowIndex}:${cell.columnIndex}`, cell.player);
    }
    return map;
  }, [duel?.grid?.cells]);

  if (loading) {
    return <FullMessage text="Düello yükleniyor..." />;
  }

  if (error && !challenge) {
    return <FullMessage text={error} error />;
  }

  const current = challenge?.challenge;
  const role = challenge?.role ?? "visitor";

  return (
    <main className="min-h-screen bg-[#07111f] px-3 py-5 text-white sm:px-5 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-400 transition hover:text-white">← FootBattle</Link>
          <div className="flex gap-2">
            <Link href="/tic-tac-toe" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-400">Solo</Link>
            <button onClick={shareDuel} className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-[#07111f]">{copied ? "Kopyalandı ✓" : "↗ Paylaş"}</button>
          </div>
        </header>

        <section className="mt-5 rounded-3xl border border-white/10 bg-[#0d1828] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-300">⚔️ Tic Tac Toe Düello</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">Aynı grid. Aynı süre. Bahane yok.</h1>
            </div>
            {duel && !duel.completed && (
              <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-3 text-center">
                <p className="text-xs font-black uppercase tracking-wider text-red-300">Kalan Süre</p>
                <p className="mt-1 text-3xl font-black tabular-nums">{formatTimer(duel.remainingSeconds ?? 0)}</p>
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ScoreCard
              name={current?.challenger.name ?? "Oyuncu 1"}
              score={duel?.challenge?.challenger.score ?? current?.challenger.score ?? 0}
              meta={role === "challenger" ? "Sen" : duel ? `${duel.opponent?.correctCount ?? 0}/9` : "Meydan okuyan"}
              active={role === "challenger"}
            />
            <ScoreCard
              name={current?.opponent?.name ?? "Rakip bekleniyor"}
              score={duel?.challenge?.opponent.score ?? current?.opponent?.score ?? 0}
              meta={role === "opponent" ? "Sen" : duel ? `${duel.opponent?.correctCount ?? 0}/9` : "Rakip"}
              active={role === "opponent"}
            />
          </div>
        </section>

        {error && (
          <p className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">{error}</p>
        )}

        {challenge?.expired ? (
          <Panel title="Düellonun süresi doldu" text="Yeni bir düello oluşturup tekrar kapışabilirsiniz." />
        ) : role === "visitor" && challenge?.canJoin ? (
          <section className="mt-5 rounded-3xl border border-green-400/20 bg-green-400/[0.05] p-6">
            <p className="text-xs font-black uppercase tracking-wider text-green-300">Davet Aldın</p>
            <h2 className="mt-2 text-2xl font-black">{current?.challenger.name ?? "Bir oyuncu"} seni bekliyor.</h2>
            <input value={opponentName} onChange={(event) => setOpponentName(event.target.value)} maxLength={30} placeholder="Görünen adın" className="mt-5 w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3 text-base font-bold outline-none focus:border-green-400/50" />
            <button onClick={joinDuel} disabled={actionLoading} className="mt-3 w-full rounded-2xl bg-green-400 px-5 py-4 font-black text-[#07111f] disabled:opacity-60">{actionLoading ? "Katılınıyor..." : "⚔️ Düelloya Katıl"}</button>
          </section>
        ) : current?.status === "waiting" && role === "challenger" ? (
          <section className="mt-5 rounded-3xl border border-yellow-400/20 bg-yellow-400/[0.05] p-6 text-center">
            <div className="text-4xl">📲</div>
            <h2 className="mt-3 text-2xl font-black">Rakibini bekliyorsun.</h2>
            <p className="mt-2 text-sm text-slate-400">Linki WhatsApp’tan gönder. Rakip katıldığında ekran otomatik güncellenecek.</p>
            <button onClick={shareDuel} className="mt-5 rounded-2xl bg-yellow-400 px-6 py-3 font-black text-[#07111f]">↗ Düello Linkini Paylaş</button>
          </section>
        ) : current?.status === "ready" && (role === "challenger" || role === "opponent") ? (
          <section className="mt-5 rounded-3xl border border-green-400/20 bg-green-400/[0.05] p-6 text-center">
            <div className="text-4xl">✅</div>
            <h2 className="mt-3 text-2xl font-black">İki oyuncu da hazır.</h2>
            <p className="mt-2 text-sm text-slate-400">Başlatan anda 120 saniyelik sayaç ikiniz için de başlar.</p>
            <button onClick={startDuel} disabled={actionLoading} className="mt-5 w-full max-w-md rounded-2xl bg-green-400 px-6 py-4 font-black text-[#07111f] disabled:opacity-60">{actionLoading ? "Başlatılıyor..." : "🚀 Düelloyu Başlat"}</button>
          </section>
        ) : duel?.completed ? (
          <ResultPanel duel={duel} />
        ) : duel?.grid ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="rounded-3xl border border-white/10 bg-[#0d1828] p-3 sm:p-5">
              <div className="grid grid-cols-[86px_repeat(3,minmax(0,1fr))] gap-1.5 sm:grid-cols-[130px_repeat(3,minmax(0,1fr))] sm:gap-2">
                <div />
                {duel.grid.columns.map((column) => <Axis key={`c-${column.index}`} value={column.value} />)}
                {duel.grid.rows.map((row) => (
                  <div key={`r-${row.index}`} className="contents">
                    <Axis value={row.value} />
                    {duel.grid!.columns.map((column) => {
                      const key = `${row.index}:${column.index}`;
                      const solved = solvedMap.get(key);
                      const selected = selectedCell?.rowIndex === row.index && selectedCell?.columnIndex === column.index;
                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={Boolean(solved)}
                          onClick={() => {
                            setSelectedCell({ rowIndex: row.index, columnIndex: column.index });
                            setQuery("");
                            setPlayers([]);
                            setAnswerMessage("");
                          }}
                          className={`min-h-[88px] rounded-xl border p-2 text-center transition sm:min-h-[112px] ${solved ? "border-green-400/30 bg-green-400/10" : selected ? "border-yellow-400 bg-yellow-400/10" : "border-white/10 bg-[#07111f] hover:border-white/25"}`}
                        >
                          {solved ? (
                            <div>
                              <span className="text-xl">✅</span>
                              <p className="mt-1 line-clamp-2 text-xs font-black sm:text-sm">{solved.name}</p>
                            </div>
                          ) : (
                            <span className="text-xl text-slate-600">+</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </section>

            <aside className="rounded-3xl border border-white/10 bg-[#0d1828] p-5">
              <p className="text-xs font-black uppercase tracking-wider text-yellow-300">Oyuncu Seç</p>
              {selectedCell ? (
                <>
                  <p className="mt-2 text-sm text-slate-400">Seçili hücre için futbolcu ara.</p>
                  <input value={query} onChange={(event) => setQuery(event.target.value)} autoFocus placeholder="Oyuncu adı..." className="mt-4 w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 text-base font-bold outline-none focus:border-yellow-400/50" />
                  {answerMessage && (
                    <p className={`mt-3 rounded-xl border px-3 py-2 text-sm font-bold ${answerCorrect ? "border-green-400/20 bg-green-400/10 text-green-300" : "border-red-400/20 bg-red-400/10 text-red-300"}`}>{answerMessage}</p>
                  )}
                  <div className="mt-3 max-h-[390px] space-y-2 overflow-y-auto">
                    {searching ? <p className="py-6 text-center text-sm text-slate-500">Aranıyor...</p> : players.map((player) => (
                      <button key={player.id} disabled={actionLoading} onClick={() => answer(player)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-[#07111f] p-3 text-left transition hover:border-yellow-400/30 disabled:opacity-60">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5">{player.imageUrl ? <img src={player.imageUrl} alt="" className="h-full w-full object-cover" /> : "⚽"}</div>
                        <div className="min-w-0"><p className="truncate text-sm font-black">{player.name}</p><p className="truncate text-xs text-slate-500">{player.currentClubName ?? player.nationality ?? "Futbolcu"}</p></div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">Gridden boş bir hücre seç.</div>
              )}

              <div className="mt-5 grid grid-cols-2 gap-2">
                <MiniStat label="Doğru" value={`${duel.me?.correctCount ?? 0}/9`} />
                <MiniStat label="Yanlış" value={String(duel.me?.wrongCount ?? 0)} />
              </div>
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-wider text-slate-500">Rakip</span><span className="font-black text-yellow-300">{duel.opponent?.score ?? 0} puan</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-yellow-400 transition-all" style={{ width: `${Math.min(100, ((duel.opponent?.correctCount ?? 0) / 9) * 100)}%` }} /></div>
                <p className="mt-2 text-xs text-slate-500">{duel.opponent?.correctCount ?? 0}/9 doğru • {duel.opponent?.wrongCount ?? 0} yanlış</p>
              </div>
            </aside>
          </div>
        ) : (
          <Panel title="Düello hazırlanıyor" text="Grid birkaç saniye içinde hazır olacak." />
        )}
      </div>
    </main>
  );
}

function Axis({ value }: { value: string }) {
  return <div className="flex min-h-[64px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] p-2 text-center text-[10px] font-black leading-4 text-slate-200 sm:min-h-[72px] sm:text-xs">{value}</div>;
}

function ScoreCard({ name, score, meta, active }: { name: string; score: number; meta: string; active: boolean }) {
  return <div className={`rounded-2xl border p-4 ${active ? "border-green-400/25 bg-green-400/[0.06]" : "border-white/10 bg-[#07111f]"}`}><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate font-black">{name}</p><p className="mt-1 text-xs text-slate-500">{meta}</p></div><p className="text-2xl font-black text-yellow-300">{score}</p></div></div>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-[#07111f] p-3"><p className="text-lg font-black">{value}</p><p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-600">{label}</p></div>;
}

function Panel({ title, text }: { title: string; text: string }) {
  return <section className="mt-5 rounded-3xl border border-white/10 bg-[#0d1828] p-8 text-center"><h2 className="text-2xl font-black">{title}</h2><p className="mt-2 text-sm text-slate-400">{text}</p></section>;
}

function ResultPanel({ duel }: { duel: DuelState }) {
  const title = duel.result === "win" ? "Kazandın! 🏆" : duel.result === "loss" ? "Bu kez rakip aldı." : "Berabere! 🤝";
  return <section className="mt-5 rounded-3xl border border-yellow-400/20 bg-yellow-400/[0.045] p-6 text-center sm:p-8"><div className="text-5xl">{duel.result === "win" ? "🏆" : duel.result === "loss" ? "🥈" : "🤝"}</div><h2 className="mt-3 text-3xl font-black">{title}</h2><p className="mt-2 text-sm text-slate-400">Sen: {duel.me?.score ?? 0} puan • Rakip: {duel.opponent?.score ?? 0} puan</p><div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-3"><MiniStat label="Senin Doğrun" value={`${duel.me?.correctCount ?? 0}/9`} /><MiniStat label="Rakibin Doğrusu" value={`${duel.opponent?.correctCount ?? 0}/9`} /></div><div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row"><Link href="/tic-tac-toe/duel" className="rounded-2xl bg-yellow-400 px-6 py-3 font-black text-[#07111f]">Yeni Düello</Link><Link href="/tic-tac-toe" className="rounded-2xl border border-white/10 px-6 py-3 font-black text-slate-300">Solo Oyna</Link></div></section>;
}

function FullMessage({ text, error = false }: { text: string; error?: boolean }) {
  return <main className="flex min-h-screen items-center justify-center bg-[#07111f] p-6 text-white"><div className={`rounded-3xl border p-8 text-center ${error ? "border-red-500/20 bg-red-500/10" : "border-white/10 bg-[#0d1828]"}`}><p className={`font-black ${error ? "text-red-300" : "text-slate-300"}`}>{text}</p><Link href="/" className="mt-5 inline-block text-sm font-black text-yellow-300">← Ana Sayfa</Link></div></main>;
}
