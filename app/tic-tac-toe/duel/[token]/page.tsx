"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";

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
type Player = { id: number; name: string; nationality: string | null; currentClubName: string | null; imageUrl: string | null };
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
  challenge?: { status: string; challenger: { name: string; score: number }; opponent: { name: string; score: number } };
  grid?: { rows: GridAxis[]; columns: GridAxis[]; cells: Cell[] };
};
type SearchResponse = { ok?: boolean; players?: Player[] };
type ApiResponse = { ok?: boolean; error?: string; message?: string; completed?: boolean; token?: string | null };

const GREEN = "#86efac";
const PURPLE = "#d8b4fe";

function formatTimer(total: number) {
  const safe = Math.max(0, Math.floor(total));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

function winningKeys(cells: Cell[], winner: Winner) {
  const out = new Set<string>();
  if (!winner || winner === "draw") return out;
  const owned = new Set(cells.filter((cell) => cell.ownerSide === winner).map((cell) => `${cell.rowIndex}:${cell.columnIndex}`));
  const lines = [
    [[0,0],[0,1],[0,2]], [[1,0],[1,1],[1,2]], [[2,0],[2,1],[2,2]],
    [[0,0],[1,0],[2,0]], [[0,1],[1,1],[2,1]], [[0,2],[1,2],[2,2]],
    [[0,0],[1,1],[2,2]], [[0,2],[1,1],[2,0]],
  ];
  for (const line of lines) {
    const keys = line.map(([r,c]) => `${r}:${c}`);
    if (keys.every((key) => owned.has(key))) { keys.forEach((key) => out.add(key)); break; }
  }
  return out;
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
  const lastTurnRef = useRef<Side | null>(null);
  const lastClockRef = useRef(60);

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
    if (lastTurnRef.current === result.role && result.currentTurn !== result.role && lastClockRef.current <= 1) {
      setNotice("⏱️ Süren doldu, sıra rakibe geçti.");
    }
    lastTurnRef.current = result.currentTurn ?? null;
    lastClockRef.current = result.turnRemainingSeconds ?? 60;
    setDuel(result);
    setClock(result.turnRemainingSeconds ?? 60);
    if (!result.isMyTurn) { setSelectedCell(null); setQuery(""); setPlayers([]); }
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
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [loadChallenge, loadDuel]);

  useEffect(() => {
    const status = challenge?.challenge?.status;
    if (!status || status === "expired") return;
    const id = window.setInterval(() => {
      void loadChallenge().then((c) => {
        if (c.challenge?.status === "playing" || c.challenge?.status === "completed") return loadDuel();
        return null;
      }).catch(() => undefined);
    }, 1200);
    return () => window.clearInterval(id);
  }, [challenge?.challenge?.status, loadChallenge, loadDuel]);

  useEffect(() => {
    if (!duel || duel.completed) return;
    const id = window.setInterval(() => setClock((value) => {
      const next = Math.max(0, value - 1);
      lastClockRef.current = next;
      return next;
    }), 1000);
    return () => window.clearInterval(id);
  }, [duel?.currentTurn, duel?.completed]);

  useEffect(() => {
    if (!duel?.completed) return;
    const id = window.setInterval(() => {
      void fetch(`/api/challenges/${encodeURIComponent(token)}/tic-tac-toe/rematch`, { cache: "no-store" })
        .then((r) => r.json() as Promise<ApiResponse>)
        .then((r) => { if (r.ok && r.token) window.location.href = `/tic-tac-toe/duel/${r.token}`; })
        .catch(() => undefined);
    }, 1500);
    return () => window.clearInterval(id);
  }, [duel?.completed, token]);

  useEffect(() => {
    if (!selectedCell || !duel?.isMyTurn || query.trim().length < 2) { setPlayers([]); setSearching(false); return; }
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

  useEffect(() => {
    if (!selectedCell) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [selectedCell]);

  const occupied = useMemo(() => {
    const map = new Map<string, Cell>();
    for (const cell of duel?.grid?.cells ?? []) map.set(`${cell.rowIndex}:${cell.columnIndex}`, cell);
    return map;
  }, [duel?.grid?.cells]);
  const winKeys = useMemo(() => winningKeys(duel?.grid?.cells ?? [], duel?.winnerSide ?? null), [duel?.grid?.cells, duel?.winnerSide]);

  async function run(task: () => Promise<void>) {
    try { setBusy(true); setError(""); await task(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "İşlem yapılamadı."); }
    finally { setBusy(false); }
  }

  async function joinDuel() {
    await run(async () => {
      const response = await fetch("/api/challenges/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, opponentName: opponentName.trim() || "Misafir" }) });
      const result = await response.json() as ApiResponse;
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Düelloya katılınamadı.");
      await loadChallenge();
      await loadDuel();
    });
  }

  async function answer(player: Player) {
    if (!selectedCell || !duel?.isMyTurn) return;
    await run(async () => {
      const response = await fetch(`/api/challenges/${encodeURIComponent(token)}/tic-tac-toe/answer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rowIndex: selectedCell.rowIndex, columnIndex: selectedCell.columnIndex, playerId: player.id }) });
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
      const response = await fetch(`/api/challenges/${encodeURIComponent(token)}/tic-tac-toe/action`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const result = await response.json() as ApiResponse;
      if (!response.ok || !result.ok) throw new Error(result.error ?? "İşlem yapılamadı.");
      setNotice(result.message ?? "İşlem tamamlandı.");
      await loadDuel();
      if (result.completed) await loadChallenge();
    });
  }

  async function rematch() {
    await run(async () => {
      const response = await fetch(`/api/challenges/${encodeURIComponent(token)}/tic-tac-toe/rematch`, { method: "POST" });
      const result = await response.json() as ApiResponse;
      if (!response.ok || !result.ok || !result.token) throw new Error(result.error ?? "Rövanş oluşturulamadı.");
      window.location.href = `/tic-tac-toe/duel/${result.token}`;
    });
  }

  async function shareInvite() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: "FootBattle Tic Tac Toe Düello", text: "⚔️ Futbol Tic Tac Toe’da kapışalım!", url });
      else { await navigator.clipboard.writeText(url); setNotice("Link kopyalandı."); }
    } catch { /* cancelled */ }
  }

  async function resultImage() {
    if (!duel?.grid) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1080; canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#07111f"; ctx.fillRect(0, 0, 1080, 1350);
    ctx.fillStyle = GREEN; ctx.font = "700 38px sans-serif"; ctx.fillText("FOOTBATTLE", 70, 90);
    ctx.fillStyle = "#ffffff"; ctx.font = "800 54px sans-serif";
    const title = duel.result === "win" ? "Kazandın!" : duel.result === "loss" ? "Rakip kazandı" : "Berabere";
    ctx.fillText(`Tic Tac Toe Düello · ${title}`, 70, 170);
    ctx.font = "700 30px sans-serif"; ctx.fillStyle = "#cbd5e1";
    ctx.fillText(`${duel.challenge?.challenger.name ?? "X"} (X)  vs  ${duel.challenge?.opponent.name ?? "O"} (O)`, 70, 225);
    const x0 = 240, y0 = 390, size = 240, gap = 12;
    ctx.textAlign = "center"; ctx.font = "700 25px sans-serif"; ctx.fillStyle = "#cbd5e1";
    (duel.grid.columns ?? []).forEach((col, i) => ctx.fillText(col.value, x0 + i * (size + gap) + size / 2, y0 - 45));
    (duel.grid.rows ?? []).forEach((row, i) => ctx.fillText(row.value, 115, y0 + i * (size + gap) + size / 2));
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const cell = occupied.get(`${r}:${c}`);
      const x = x0 + c * (size + gap), y = y0 + r * (size + gap);
      ctx.fillStyle = cell?.ownerSide === "challenger" ? "#123d32" : cell?.ownerSide === "opponent" ? "#322653" : "#0d1828";
      ctx.fillRect(x, y, size, size);
      ctx.strokeStyle = winKeys.has(`${r}:${c}`) ? "#fde047" : cell?.ownerSide === "challenger" ? GREEN : cell?.ownerSide === "opponent" ? PURPLE : "#334155";
      ctx.lineWidth = winKeys.has(`${r}:${c}`) ? 8 : 3; ctx.strokeRect(x, y, size, size);
      if (cell) {
        ctx.fillStyle = cell.ownerSide === "challenger" ? GREEN : PURPLE; ctx.font = "900 72px sans-serif";
        ctx.fillText(cell.ownerSide === "challenger" ? "X" : "O", x + size / 2, y + 95);
        ctx.fillStyle = "#ffffff"; ctx.font = "700 24px sans-serif";
        const name = cell.player.name.length > 18 ? `${cell.player.name.slice(0, 17)}…` : cell.player.name;
        ctx.fillText(name, x + size / 2, y + 155);
      }
    }
    ctx.textAlign = "left"; ctx.fillStyle = "#94a3b8"; ctx.font = "600 28px sans-serif";
    ctx.fillText("Futbolu biliyorsan, kanıtla. · playfootbattle.com", 70, 1260);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 0.95));
  }

  async function shareResult() {
    try {
      const blob = await resultImage();
      const text = `⚔️ FootBattle Tic Tac Toe düellosu: ${duel?.result === "win" ? "Kazandım!" : duel?.result === "loss" ? "Bu kez rakip aldı." : "Berabere!"}`;
      if (blob) {
        const file = new File([blob], "footbattle-tic-tac-toe.png", { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) { await navigator.share({ title: "FootBattle Tic Tac Toe", text, files: [file] }); return; }
      }
      if (navigator.share) await navigator.share({ title: "FootBattle Tic Tac Toe", text, url: "https://playfootbattle.com/tic-tac-toe" });
      else { await navigator.clipboard.writeText(`${text}\nhttps://playfootbattle.com/tic-tac-toe`); setNotice("Sonuç kopyalandı."); }
    } catch { /* cancelled */ }
  }

  if (loading) return <FullMessage text="Düello yükleniyor..." />;
  if (error && !challenge) return <FullMessage text={error} />;

  const current = challenge?.challenge;
  const role = challenge?.role ?? "visitor";
  const mySide = duel?.role;
  const incomingDraw = Boolean(duel?.drawOfferBy && duel.drawOfferBy !== mySide);
  const myDrawPending = Boolean(duel?.drawOfferBy && duel.drawOfferBy === mySide);

  const gridView = duel?.grid ? (
    <section className="mt-3 rounded-3xl border border-white/10 bg-[#0d1828] p-2.5 sm:p-4">
      <div className="grid grid-cols-[72px_repeat(3,minmax(0,1fr))] gap-1.5 sm:grid-cols-[100px_repeat(3,minmax(0,1fr))] sm:gap-2">
        <div />
        {(duel.grid.columns ?? []).map((axis) => <AxisLabel key={`c-${axis.index}`} text={axis.value} />)}
        {(duel.grid.rows ?? []).flatMap((row) => [
          <AxisLabel key={`r-${row.index}`} text={row.value} />,
          ...(duel.grid?.columns ?? []).map((column) => {
            const key = `${row.index}:${column.index}`;
            const cell = occupied.get(key);
            const selected = selectedCell?.rowIndex === row.index && selectedCell.columnIndex === column.index;
            const canSelect = Boolean(!duel.completed && duel.isMyTurn && !cell && !busy);
            const winner = winKeys.has(key);
            return <button key={key} disabled={!canSelect} onClick={() => {
              setSelectedCell({ rowIndex: row.index, columnIndex: column.index });
              setQuery(""); setPlayers([]); setNotice("");
            }} className={`aspect-square min-h-0 rounded-xl border text-center transition ${cell?.ownerSide === "challenger" ? "border-green-400/60 bg-green-400/15" : cell?.ownerSide === "opponent" ? "border-purple-400/60 bg-purple-400/15" : selected ? "border-yellow-300 bg-yellow-300/10" : "border-white/10 bg-[#07111f]"} ${winner ? "ring-4 ring-yellow-300/80" : ""} ${canSelect ? "active:scale-95" : "opacity-90"}`}>
              {cell ? <><span className={`block text-2xl font-black sm:text-3xl ${cell.ownerSide === "challenger" ? "text-green-300" : "text-purple-300"}`}>{cell.ownerSide === "challenger" ? "X" : "O"}</span><span className="mt-0.5 block truncate px-1 text-[9px] font-bold text-slate-300 sm:text-xs">{cell.player.name}</span></> : <span className="text-xl text-slate-600">+</span>}
            </button>;
          }),
        ])}
      </div>
    </section>
  ) : null;

  const showPlayerSheet = Boolean(duel && !duel.completed && duel.isMyTurn && selectedCell);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#07111f] px-3 py-3 text-white sm:px-5 sm:py-6">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between gap-2">
          <Link href="/" className="rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-slate-400">← FootBattle</Link>
          {current?.status === "waiting" && role === "challenger" && <button onClick={shareInvite} className="rounded-xl bg-yellow-400 px-3 py-2 text-sm font-black text-[#07111f]">↗ Davet Et</button>}
        </header>

        <section className="mt-3 rounded-3xl border border-white/10 bg-[#0d1828] p-4">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[11px] font-black uppercase tracking-[0.2em] text-yellow-300">⚔️ Tic Tac Toe Düello</p><h1 className="mt-1 text-xl font-black sm:text-2xl">Üçlü yapan kazanır.</h1></div>
            {duel && !duel.completed && <div className={`min-w-20 rounded-2xl px-3 py-2 text-center ${duel.currentTurn === "challenger" ? "bg-green-400/10 text-green-300" : "bg-purple-400/10 text-purple-300"}`}><p className="text-[10px] font-black uppercase">Hamle</p><p className="text-2xl font-black tabular-nums">{formatTimer(clock)}</p></div>}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <PlayerCard name={current?.challenger.name ?? "Oyuncu 1"} mark="X" mine={role === "challenger"} turn={duel?.currentTurn === "challenger"} side="challenger" />
            <PlayerCard name={current?.opponent?.name ?? "Rakip bekleniyor"} mark="O" mine={role === "opponent"} turn={duel?.currentTurn === "opponent"} side="opponent" />
          </div>
          {duel && !duel.completed && <div className={`mt-3 rounded-2xl px-4 py-3 text-center text-sm font-black ${duel.isMyTurn ? "border border-green-400/25 bg-green-400/10 text-green-300" : "border border-purple-400/25 bg-purple-400/10 text-purple-300"}`}>{duel.isMyTurn ? "🎯 Senin sıran — bir hücre seç" : "⏳ Rakibin sırası"}</div>}
        </section>

        {error && <p className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">{error}</p>}
        {notice && <p className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200">{notice}</p>}

        {challenge?.expired ? <Panel title="Düellonun süresi doldu" text="Yeni bir düello oluşturup tekrar deneyin." />
        : role === "visitor" && challenge?.canJoin ? <section className="mt-3 rounded-3xl border border-green-400/20 bg-green-400/[0.05] p-5"><h2 className="text-xl font-black">{current?.challenger.name ?? "Bir oyuncu"} seni bekliyor.</h2><input value={opponentName} onChange={(e) => setOpponentName(e.target.value)} maxLength={30} placeholder="Görünen adın" className="mt-4 w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3 text-base outline-none focus:border-green-400/50" /><button onClick={joinDuel} disabled={busy} className="mt-3 w-full rounded-2xl bg-green-400 px-5 py-4 font-black text-[#07111f] disabled:opacity-50">⚔️ Düelloya Katıl</button></section>
        : current?.status === "waiting" && role === "challenger" ? <Panel title="Rakibini bekliyorsun" text="Davet linkini gönder. Rakip katıldığı anda maç otomatik başlayacak." />
        : duel ? <>
          {duel.completed && <ResultCard result={duel.result ?? null} onRematch={rematch} onShare={shareResult} busy={busy} />}
          {incomingDraw && !duel.completed && <section className="mt-3 rounded-3xl border border-yellow-400/25 bg-yellow-400/10 p-4"><p className="font-black text-yellow-200">🤝 Rakibin beraberlik teklif etti.</p><div className="mt-3 grid grid-cols-2 gap-2"><button disabled={busy} onClick={() => duelAction("accept_draw")} className="rounded-xl bg-yellow-400 px-3 py-3 font-black text-[#07111f]">Kabul Et</button><button disabled={busy} onClick={() => duelAction("decline_draw")} className="rounded-xl border border-white/15 px-3 py-3 font-black">Reddet</button></div></section>}
          {gridView}
          {!duel.completed && <>
            <section className="mt-3 rounded-3xl border border-white/10 bg-[#0d1828] p-4">
              {!duel.isMyTurn ? <p className="py-3 text-center font-bold text-slate-500">Rakibin hamlesi bekleniyor.</p> : !selectedCell ? <p className="py-3 text-center font-bold text-slate-400">Önce boş bir hücre seç.</p> : <p className="py-3 text-center font-bold text-yellow-200">Oyuncu arama paneli açık.</p>}
            </section>
            <div className="mt-3 grid grid-cols-2 gap-2"><button disabled={busy || myDrawPending} onClick={() => duelAction("offer_draw")} className="rounded-2xl border border-yellow-400/25 bg-yellow-400/[0.06] px-3 py-3 text-sm font-black text-yellow-200 disabled:opacity-50">{myDrawPending ? "🤝 Teklif bekliyor" : "🤝 Beraberlik Teklif Et"}</button><button disabled={busy} onClick={() => duelAction("forfeit")} className="rounded-2xl border border-red-400/25 bg-red-400/[0.06] px-3 py-3 text-sm font-black text-red-300">🏳️ Pes Et</button></div>
          </>}
        </> : null}
      </div>

      {showPlayerSheet && <div className="fixed inset-0 z-[100] flex items-end bg-black/45" onClick={() => { setSelectedCell(null); setQuery(""); setPlayers([]); }}>
        <section className="w-full rounded-t-3xl border border-white/10 bg-[#0d1828] px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 shadow-2xl" style={{ maxHeight: "min(62dvh, 520px)" }} onClick={(e) => e.stopPropagation()}>
          <div className="mx-auto max-w-3xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-yellow-300">Oyuncuyu seç</p><p className="mt-1 text-sm text-slate-400">Seçtiğin hücre için futbolcu ara.</p></div>
              <button type="button" onClick={() => { setSelectedCell(null); setQuery(""); setPlayers([]); }} className="rounded-full border border-white/10 px-3 py-2 text-sm font-black text-slate-300">✕</button>
            </div>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Futbolcu ara..." inputMode="search" enterKeyHint="search" className="w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3 text-base outline-none focus:border-yellow-300/50" />
            <div className="mt-2 min-h-[56px] max-h-[220px] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#07111f] p-1">
              {query.trim().length < 2 && <p className="px-3 py-4 text-sm text-slate-500">En az 2 harf yaz.</p>}
              {searching && <p className="px-3 py-4 text-sm text-slate-500">Aranıyor...</p>}
              {!searching && query.trim().length >= 2 && players.length === 0 && <p className="px-3 py-4 text-sm text-slate-500">Oyuncu bulunamadı.</p>}
              {players.map((player) => <button key={player.id} disabled={busy} onClick={() => answer(player)} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left active:bg-white/[0.06]"><span className="truncate font-bold">{player.name}</span><span className="ml-3 shrink-0 text-xs text-slate-500">Seç →</span></button>)}
            </div>
          </div>
        </section>
      </div>}
    </main>
  );
}

function AxisLabel({ text }: { text: string }) { return <div className="flex min-w-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-1 py-2 text-center text-[10px] font-black leading-tight text-slate-300 sm:text-sm">{text}</div>; }

function PlayerCard({ name, mark, mine, turn, side }: { name: string; mark: string; mine: boolean; turn: boolean; side: Side }) {
  const own = side === "challenger";
  return <div className={`rounded-2xl border p-3 ${turn ? own ? "border-green-400/60 bg-green-400/10" : "border-purple-400/60 bg-purple-400/10" : "border-white/10 bg-[#07111f]"}`}><div className="flex items-center justify-between"><div className="min-w-0"><p className="truncate font-black">{name}</p><p className={`mt-0.5 text-xs font-bold ${own ? "text-green-300" : "text-purple-300"}`}>{mine ? "Sen" : turn ? "Sırada" : "Rakip"}</p></div><span className={`text-2xl font-black ${own ? "text-green-300" : "text-purple-300"}`}>{mark}</span></div></div>;
}

function ResultCard({ result, onRematch, onShare, busy }: { result: "win" | "loss" | "draw" | null; onRematch: () => void; onShare: () => void; busy: boolean }) {
  const title = result === "win" ? "🏆 Kazandın!" : result === "loss" ? "🥈 Bu kez rakip aldı." : "🤝 Berabere.";
  return <section className="mt-3 rounded-3xl border border-yellow-400/25 bg-yellow-400/[0.05] p-6 text-center"><div className="text-5xl">{result === "win" ? "🏆" : result === "loss" ? "🥈" : "🤝"}</div><h2 className="mt-3 text-3xl font-black">{title}</h2><p className="mt-2 text-sm text-slate-400">Final grid aşağıda. Kazandıran üçlü sarı çerçeveyle vurgulandı.</p><div className="mt-5 grid grid-cols-2 gap-2"><button disabled={busy} onClick={onRematch} className="rounded-2xl bg-yellow-400 px-4 py-3 font-black text-[#07111f] disabled:opacity-50">🔁 Rövanş</button><button disabled={busy} onClick={onShare} className="rounded-2xl border border-green-400/30 bg-green-400/10 px-4 py-3 font-black text-green-200 disabled:opacity-50">↗ Sonucu Paylaş</button></div></section>;
}

function Panel({ title, text }: { title: string; text: string }) { return <section className="mt-3 rounded-3xl border border-white/10 bg-[#0d1828] p-6 text-center"><h2 className="text-xl font-black">{title}</h2><p className="mt-2 text-sm text-slate-400">{text}</p></section>; }
function FullMessage({ text }: { text: string }) { return <main className="flex min-h-screen items-center justify-center bg-[#07111f] px-5 text-center text-white"><p className="rounded-3xl border border-white/10 bg-[#0d1828] px-6 py-5 font-black">{text}</p></main>; }