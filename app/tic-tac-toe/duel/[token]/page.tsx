"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";

type Side = "challenger" | "opponent";
type Role = Side | "visitor";
type Winner = Side | "draw" | null;

type ChallengeResponse = {
  ok?: boolean;
  role?: Role;
  canJoin?: boolean;
  expired?: boolean;
  error?: string;
  challenge?: {
    token: string;
    gameCode: string;
    status: string;
    challenger: { name: string | null; score: number };
    opponent: { name: string | null; score: number } | null;
    winnerSide: Winner;
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
type Cell = { rowIndex: number; columnIndex: number; ownerSide: Side; player: Player };
type DuelState = {
  ok?: boolean;
  error?: string;
  role?: Side;
  completed?: boolean;
  result?: "win" | "loss" | "draw" | null;
  winnerSide?: Winner;
  currentTurn?: Side | null;
  isMyTurn?: boolean;
  turnRemainingSeconds?: number;
  drawOfferBy?: Side | null;
  challenge?: {
    status: string;
    challenger: { name: string; score: number };
    opponent: { name: string; score: number };
  };
  grid?: { rows: GridAxis[]; columns: GridAxis[]; cells: Cell[] };
};

type SearchResponse = { ok?: boolean; players?: Player[] };
type ApiResponse = { ok?: boolean; error?: string; message?: string; completed?: boolean };

function formatTimer(total: number) {
  const safe = Math.max(0, Math.floor(total));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export default function TicTacToeDuelPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);
  const [duel, setDuel] = useState<DuelState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ rowIndex: number; columnIndex: number } | null>(null);
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [searching, setSearching] = useState(false);
  const [clock, setClock] = useState(60);

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
    setClock(result.turnRemainingSeconds ?? 60);
    if (!result.isMyTurn) {
      setSelectedCell(null);
      setQuery("");
      setPlayers([]);
    }
    return result;
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const c = await loadChallenge();
        if (!cancelled && (c.challenge?.status === "playing" || c.challenge?.status === "completed")) await loadDuel();
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Düello yüklenemedi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loadChallenge, loadDuel]);

  useEffect(() => {
    const status = challenge?.challenge?.status;
    if (!status || status === "completed" || status === "expired") return;
    const id = window.setInterval(() => {
      void loadChallenge().then((c) => {
        if (c.challenge?.status === "playing") return loadDuel();
        return null;
      }).catch(() => undefined);
    }, 1400);
    return () => window.clearInterval(id);
  }, [challenge?.challenge?.status, loadChallenge, loadDuel]);

  useEffect(() => {
    if (!duel || duel.completed) return;
    const id = window.setInterval(() => setClock((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [duel?.currentTurn, duel?.completed]);

  useEffect(() => {
    if (!selectedCell || !duel?.isMyTurn || query.trim().length < 2) {
      setPlayers([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const id = window.setTimeout(() => {
      setSearching(true);
      void fetch(`/api/tic-tac-toe/search-player?q=${encodeURIComponent(query.trim())}`, { cache: "no-store", signal: controller.signal })
        .then((r) => r.json() as Promise<SearchResponse>)
        .then((result) => setPlayers(result.ok ? result.players ?? [] : []))
        .catch(() => undefined)
        .finally(() => setSearching(false));
    }, 220);
    return () => { controller.abort(); window.clearTimeout(id); };
  }, [duel?.isMyTurn, query, selectedCell]);

  const occupied = useMemo(() => {
    const map = new Map<string, Cell>();
    for (const cell of duel?.grid?.cells ?? []) map.set(`${cell.rowIndex}:${cell.columnIndex}`, cell);
    return map;
  }, [duel?.grid?.cells]);

  async function joinDuel() {
    await run(async () => {
      const response = await fetch("/api/challenges/join", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, opponentName: opponentName.trim() || "Misafir" }),
      });
      const result = await response.json() as ApiResponse;
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Düelloya katılınamadı.");
      await loadChallenge();
    });
  }

  async function startDuel() {
    await run(async () => {
      const response = await fetch("/api/challenges/start", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }),
      });
      const result = await response.json() as ApiResponse;
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Düello başlatılamadı.");
      await loadChallenge();
      await loadDuel();
    });
  }

  async function answer(player: Player) {
    if (!selectedCell || !duel?.isMyTurn) return;
    await run(async () => {
      const response = await fetch(`/api/challenges/${encodeURIComponent(token)}/tic-tac-toe/answer`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIndex: selectedCell.rowIndex, columnIndex: selectedCell.columnIndex, playerId: player.id }),
      });
      const result = await response.json() as ApiResponse;
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Cevap gönderilemedi.");
      setNotice(result.message ?? "Hamle tamamlandı.");
      setSelectedCell(null); setQuery(""); setPlayers([]);
      await loadDuel();
      if (result.completed) await loadChallenge();
    });
  }

  async function duelAction(action: "forfeit" | "offer_draw" | "accept_draw" | "decline_draw") {
    if (action === "forfeit" && !window.confirm("Pes etmek istediğine emin misin?")) return;
    await run(async () => {
      const response = await fetch(`/api/challenges/${encodeURIComponent(token)}/tic-tac-toe/action`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
      });
      const result = await response.json() as ApiResponse;
      if (!response.ok || !result.ok) throw new Error(result.error ?? "İşlem yapılamadı.");
      setNotice(result.message ?? "İşlem tamamlandı.");
      await loadDuel();
      if (result.completed) await loadChallenge();
    });
  }

  async function run(task: () => Promise<void>) {
    try { setBusy(true); setError(""); await task(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "İşlem yapılamadı."); }
    finally { setBusy(false); }
  }

  async function shareDuel() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: "FootBattle Tic Tac Toe Düello", text: "⚔️ Futbol Tic Tac Toe’da kapışalım!", url });
      else { await navigator.clipboard.writeText(url); setNotice("Link kopyalandı."); }
    } catch { /* share cancel */ }
  }

  if (loading) return <FullMessage text="Düello yükleniyor..." />;
  if (error && !challenge) return <FullMessage text={error} />;

  const current = challenge?.challenge;
  const role = challenge?.role ?? "visitor";
  const mySide = duel?.role;
  const incomingDraw = Boolean(duel?.drawOfferBy && duel.drawOfferBy !== mySide);
  const myDrawPending = Boolean(duel?.drawOfferBy && duel.drawOfferBy === mySide);
  const challengerMark = "X";
  const opponentMark = "O";

  return (
    <main className="min-h-screen bg-[#07111f] px-3 py-3 text-white sm:px-5 sm:py-6">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between gap-2">
          <Link href="/" className="rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-slate-400">← FootBattle</Link>
          <div className="flex gap-2">
            <Link href="/tic-tac-toe" className="rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-slate-400">Solo</Link>
            <button onClick={shareDuel} className="rounded-xl bg-yellow-400 px-3 py-2 text-sm font-black text-[#07111f]">↗ Paylaş</button>
          </div>
        </header>

        <section className="mt-3 rounded-3xl border border-white/10 bg-[#0d1828] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-yellow-300">⚔️ Tic Tac Toe Düello</p>
              <h1 className="mt-1 text-xl font-black sm:text-2xl">Üçlü yapan kazanır.</h1>
            </div>
            {duel && !duel.completed && (
              <div className={`min-w-20 rounded-2xl px-3 py-2 text-center ${duel.isMyTurn ? "bg-green-400/10 text-green-300" : "bg-purple-400/10 text-purple-300"}`}>
                <p className="text-[10px] font-black uppercase">Hamle</p>
                <p className="text-2xl font-black tabular-nums">{formatTimer(clock)}</p>
              </div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <PlayerCard name={current?.challenger.name ?? "Oyuncu 1"} mark={challengerMark} mine={role === "challenger"} turn={duel?.currentTurn === "challenger"} />
            <PlayerCard name={current?.opponent?.name ?? "Rakip bekleniyor"} mark={opponentMark} mine={role === "opponent"} turn={duel?.currentTurn === "opponent"} />
          </div>

          {duel && !duel.completed && (
            <div className={`mt-3 rounded-2xl px-4 py-3 text-center text-sm font-black ${duel.isMyTurn ? "border border-green-400/25 bg-green-400/10 text-green-300" : "border border-purple-400/25 bg-purple-400/10 text-purple-300"}`}>
              {duel.isMyTurn ? "🎯 Senin sıran — bir hücre seç" : "⏳ Rakibin sırası"}
            </div>
          )}
        </section>

        {error && <p className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">{error}</p>}
        {notice && <p className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200">{notice}</p>}

        {challenge?.expired ? (
          <Panel title="Düellonun süresi doldu" text="Yeni bir düello oluşturup tekrar deneyin." />
        ) : role === "visitor" && challenge?.canJoin ? (
          <section className="mt-3 rounded-3xl border border-green-400/20 bg-green-400/[0.05] p-5">
            <h2 className="text-xl font-black">{current?.challenger.name ?? "Bir oyuncu"} seni bekliyor.</h2>
            <input value={opponentName} onChange={(e) => setOpponentName(e.target.value)} maxLength={30} placeholder="Görünen adın" className="mt-4 w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3 outline-none focus:border-green-400/50" />
            <button onClick={joinDuel} disabled={busy} className="mt-3 w-full rounded-2xl bg-green-400 px-5 py-4 font-black text-[#07111f] disabled:opacity-50">⚔️ Düelloya Katıl</button>
          </section>
        ) : current?.status === "waiting" && role === "challenger" ? (
          <Panel title="Rakibini bekliyorsun" text="Davet linkini gönder. Rakip katıldığında burası otomatik güncellenecek." />
        ) : current?.status === "joined" && role === "challenger" ? (
          <section className="mt-3 rounded-3xl border border-green-400/20 bg-green-400/[0.05] p-5 text-center">
            <h2 className="text-xl font-black">Rakip hazır.</h2>
            <p className="mt-2 text-sm text-slate-400">Başlangıç oyuncusu %50 şansla belirlenecek.</p>
            <button onClick={startDuel} disabled={busy} className="mt-4 w-full rounded-2xl bg-green-400 px-5 py-4 font-black text-[#07111f] disabled:opacity-50">Oyunu Başlat</button>
          </section>
        ) : current?.status === "joined" && role === "opponent" ? (
          <Panel title="Hazırsın" text="Meydan okuyan oyuncunun maçı başlatmasını bekliyorsun." />
        ) : duel ? (
          <>
            {duel.completed ? (
              <ResultCard result={duel.result ?? null} />
            ) : (
              <>
                {incomingDraw && (
                  <section className="mt-3 rounded-3xl border border-yellow-400/25 bg-yellow-400/10 p-4">
                    <p className="font-black text-yellow-200">🤝 Rakibin beraberlik teklif etti.</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button disabled={busy} onClick={() => duelAction("accept_draw")} className="rounded-xl bg-yellow-400 px-3 py-3 font-black text-[#07111f]">Kabul Et</button>
                      <button disabled={busy} onClick={() => duelAction("decline_draw")} className="rounded-xl border border-white/15 px-3 py-3 font-black">Reddet</button>
                    </div>
                  </section>
                )}

                <section className="mt-3 rounded-3xl border border-white/10 bg-[#0d1828] p-2.5 sm:p-4">
                  <div className="grid grid-cols-[72px_repeat(3,minmax(0,1fr))] gap-1.5 sm:grid-cols-[100px_repeat(3,minmax(0,1fr))] sm:gap-2">
                    <div />
                    {(duel.grid?.columns ?? []).map((axis) => <AxisLabel key={`c-${axis.index}`} text={axis.value} />)}
                    {(duel.grid?.rows ?? []).flatMap((row) => [
                      <AxisLabel key={`r-${row.index}`} text={row.value} />,
                      ...(duel.grid?.columns ?? []).map((column) => {
                        const key = `${row.index}:${column.index}`;
                        const cell = occupied.get(key);
                        const selected = selectedCell?.rowIndex === row.index && selectedCell.columnIndex === column.index;
                        const canSelect = Boolean(duel.isMyTurn && !cell && !busy);
                        return (
                          <button key={key} disabled={!canSelect} onClick={() => { setSelectedCell({ rowIndex: row.index, columnIndex: column.index }); setQuery(""); setPlayers([]); setNotice(""); }} className={`aspect-square min-h-0 rounded-xl border text-center transition ${cell?.ownerSide === "challenger" ? "border-green-400/50 bg-green-400/15" : cell?.ownerSide === "opponent" ? "border-purple-400/50 bg-purple-400/15" : selected ? "border-yellow-300 bg-yellow-300/10" : "border-white/10 bg-[#07111f]"} ${canSelect ? "active:scale-95" : "opacity-90"}`}>
                            {cell ? <><span className={`block text-2xl font-black sm:text-3xl ${cell.ownerSide === "challenger" ? "text-green-300" : "text-purple-300"}`}>{cell.ownerSide === "challenger" ? challengerMark : opponentMark}</span><span className="mt-0.5 block truncate px-1 text-[9px] font-bold text-slate-400 sm:text-xs">{cell.player.name}</span></> : <span className="text-xl text-slate-600">+</span>}
                          </button>
                        );
                      }),
                    ])}
                  </div>
                </section>

                <section className="mt-3 rounded-3xl border border-white/10 bg-[#0d1828] p-4">
                  {!duel.isMyTurn ? (
                    <p className="py-3 text-center font-bold text-slate-500">Rakibin hamlesi bekleniyor.</p>
                  ) : !selectedCell ? (
                    <p className="py-3 text-center font-bold text-slate-400">Önce boş bir hücre seç.</p>
                  ) : (
                    <>
                      <p className="text-xs font-black uppercase tracking-wider text-yellow-300">Oyuncuyu seç</p>
                      <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Futbolcu ara..." className="mt-2 w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3 text-base outline-none focus:border-yellow-300/50" />
                      <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                        {searching && <p className="px-2 py-3 text-sm text-slate-500">Aranıyor...</p>}
                        {!searching && query.trim().length >= 2 && players.length === 0 && <p className="px-2 py-3 text-sm text-slate-500">Oyuncu bulunamadı.</p>}
                        {players.map((player) => <button key={player.id} disabled={busy} onClick={() => answer(player)} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-left"><span className="font-bold">{player.name}</span><span className="text-xs text-slate-500">Seç →</span></button>)}
                      </div>
                    </>
                  )}
                </section>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button disabled={busy || myDrawPending} onClick={() => duelAction("offer_draw")} className="rounded-2xl border border-yellow-400/25 bg-yellow-400/[0.06] px-3 py-3 text-sm font-black text-yellow-200 disabled:opacity-50">{myDrawPending ? "🤝 Teklif bekliyor" : "🤝 Beraberlik Teklif Et"}</button>
                  <button disabled={busy} onClick={() => duelAction("forfeit")} className="rounded-2xl border border-red-400/25 bg-red-400/[0.06] px-3 py-3 text-sm font-black text-red-300">🏳️ Pes Et</button>
                </div>
              </>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}

function AxisLabel({ text }: { text: string }) {
  return <div className="flex min-w-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-1 py-2 text-center text-[10px] font-black leading-tight text-slate-300 sm:text-sm">{text}</div>;
}

function PlayerCard({ name, mark, mine, turn }: { name: string; mark: string; mine: boolean; turn: boolean }) {
  return <div className={`rounded-2xl border p-3 ${turn ? "border-yellow-300/40 bg-yellow-300/[0.06]" : "border-white/10 bg-[#07111f]"}`}><div className="flex items-center justify-between"><div className="min-w-0"><p className="truncate font-black">{name}</p><p className="mt-0.5 text-xs font-bold text-slate-500">{mine ? "Sen" : turn ? "Sırada" : "Rakip"}</p></div><span className="text-2xl font-black text-yellow-300">{mark}</span></div></div>;
}

function ResultCard({ result }: { result: "win" | "loss" | "draw" | null }) {
  const title = result === "win" ? "🏆 Kazandın!" : result === "loss" ? "🥈 Bu kez rakip aldı." : "🤝 Berabere.";
  return <section className="mt-3 rounded-3xl border border-yellow-400/25 bg-yellow-400/[0.05] p-6 text-center"><div className="text-5xl">{result === "win" ? "🏆" : result === "loss" ? "🥈" : "🤝"}</div><h2 className="mt-3 text-3xl font-black">{title}</h2><p className="mt-2 text-sm text-slate-400">Yeni bir düello oluşturabilir veya solo oyuna dönebilirsin.</p><div className="mt-5 grid grid-cols-2 gap-2"><Link href="/duels" className="rounded-2xl bg-yellow-400 px-4 py-3 font-black text-[#07111f]">Yeni Düello</Link><Link href="/tic-tac-toe" className="rounded-2xl border border-white/10 px-4 py-3 font-black text-slate-300">Solo Oyna</Link></div></section>;
}

function Panel({ title, text }: { title: string; text: string }) {
  return <section className="mt-3 rounded-3xl border border-white/10 bg-[#0d1828] p-6 text-center"><h2 className="text-xl font-black">{title}</h2><p className="mt-2 text-sm text-slate-400">{text}</p></section>;
}

function FullMessage({ text }: { text: string }) {
  return <main className="flex min-h-screen items-center justify-center bg-[#07111f] px-5 text-center text-white"><p className="rounded-3xl border border-white/10 bg-[#0d1828] px-6 py-5 font-black">{text}</p></main>;
}
