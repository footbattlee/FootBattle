"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n/config";

type Duel = {
  id: number;
  gameCode: "tic_tac_toe" | "club_clash" | string;
  gameLabel: string;
  status: "pending" | "accepted" | "active" | "completed" | "rejected" | "cancelled";
  viewerRole: "challenger" | "opponent";
  otherPlayer?: { displayName?: string; username?: string | null } | null;
  myScore?: number;
  opponentScore?: number;
  gameUrl?: string;
  startedAt?: string | null;
};
type Data = {
  ok?: boolean;
  error?: string;
  summary?: { incomingCount?: number; activeCount?: number; wins?: number };
  incoming?: Duel[];
  outgoing?: Duel[];
  active?: Duel[];
  history?: Duel[];
};
type Friend = {
  friendshipId: number;
  user: { id: string; displayName: string; username?: string | null; online?: boolean; lastSeenText?: string };
};
type FriendsData = { ok?: boolean; error?: string; friends?: Friend[] };
type ActionResponse = { ok?: boolean; error?: string; message?: string; game?: { url?: string } };
type GameCode = "tic_tac_toe" | "club_clash";

const FAST_POLL_MS = 2_500;
const IDLE_POLL_MS = 9_000;

const GAME_INFO: Record<GameCode, { icon: string; titleTr: string; titleEn: string; textTr: string; textEn: string; linkHref: string }> = {
  tic_tac_toe: {
    icon: "⭕",
    titleTr: "Futbol Tic Tac Toe",
    titleEn: "Football Tic Tac Toe",
    textTr: "Sırayla hücre kap; üçlüyü yapan kazanır.",
    textEn: "Claim cells by turn; first three-in-a-row wins.",
    linkHref: "/tic-tac-toe/duel",
  },
  club_clash: {
    icon: "⚽",
    titleTr: "2 Takım 1 Oyuncu",
    titleEn: "2 Clubs 1 Player",
    textTr: "Ortak futbolcuyu rakibinden önce bul.",
    textEn: "Find the shared player before your rival.",
    linkHref: "/duels/challenge?game=club_clash",
  },
};

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function MobileDuelsPage({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionDuelId, setActionDuelId] = useState<number | null>(null);
  const [preparingDuelId, setPreparingDuelId] = useState<number | null>(null);
  const [prepareSeconds, setPrepareSeconds] = useState(3);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedGame, setSelectedGame] = useState<GameCode | null>(null);
  const [inviteStep, setInviteStep] = useState<"method" | "friends">("method");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const autoOpened = useRef(new Set<number>());
  const dataRef = useRef<Data | null>(null);
  const loadInFlight = useRef(false);

  const loadDuels = useCallback(async (showLoading = false) => {
    if (loadInFlight.current) return;
    loadInFlight.current = true;
    try {
      if (showLoading) setLoading(true);
      const response = await fetch("/api/duels", { cache: "no-store" });
      const body = (await response.json()) as Data;
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Düellolar yüklenemedi.");
      dataRef.current = body;
      setData(body);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Düellolar yüklenemedi.");
    } finally {
      loadInFlight.current = false;
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let stopped = false;
    let timer: number | null = null;

    function stopTimer() {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    }

    function nextDelay() {
      const snapshot = dataRef.current;
      const hasIncoming = (snapshot?.incoming?.length ?? 0) > 0;
      const hasPreparing = (snapshot?.outgoing ?? []).some((duel) => duel.status === "accepted");
      const hasFreshActive = (snapshot?.active ?? []).some((duel) => {
        if (!duel.startedAt) return false;
        const started = new Date(duel.startedAt).getTime();
        return Number.isFinite(started) && Date.now() - started < 15_000;
      });
      return hasIncoming || hasPreparing || hasFreshActive ? FAST_POLL_MS : IDLE_POLL_MS;
    }

    async function poll(showLoading = false) {
      stopTimer();
      if (stopped || document.visibilityState !== "visible") return;
      await loadDuels(showLoading);
      if (stopped || document.visibilityState !== "visible") return;
      timer = window.setTimeout(() => void poll(false), nextDelay());
    }

    void poll(true);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void poll(false);
      else stopTimer();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopped = true;
      stopTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadDuels]);

  useEffect(() => {
    const active = data?.active ?? [];
    const now = Date.now();
    const justStarted = active.find((duel) => {
      if (duel.status !== "active" || !duel.gameUrl || !duel.startedAt || autoOpened.current.has(duel.id)) return false;
      const started = new Date(duel.startedAt).getTime();
      return Number.isFinite(started) && now - started >= 0 && now - started < 12_000;
    });
    if (!justStarted) return;
    autoOpened.current.add(justStarted.id);
    window.location.href = justStarted.gameUrl!;
  }, [data?.active]);

  async function startDuel(duelId: number) {
    const response = await fetch("/api/duels/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duelId }),
    });
    const result = (await response.json()) as ActionResponse;
    if (!response.ok || !result.ok) throw new Error(result.error ?? "Düello başlatılamadı.");
    await loadDuels(false);
    if (result.game?.url) window.location.href = result.game.url;
  }

  async function respondToDuel(duelId: number, action: "accept" | "reject") {
    if (actionDuelId !== null) return;
    try {
      setActionDuelId(duelId);
      setMessage("");
      setError("");
      const response = await fetch("/api/duels/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duelId, action }),
      });
      const result = (await response.json()) as ActionResponse;
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Düello işlemi başarısız.");

      if (action === "reject") {
        setMessage(tr ? "Düello reddedildi." : "Duel rejected.");
        await loadDuels(false);
        return;
      }

      setPreparingDuelId(duelId);
      setPrepareSeconds(3);
      setMessage(tr ? "Kabul edildi. Maç hazırlanıyor…" : "Accepted. Preparing match…");
      for (let second = 3; second > 0; second -= 1) {
        setPrepareSeconds(second);
        await sleep(second === 1 ? 500 : 1000);
      }
      await startDuel(duelId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Düello işlemi başarısız.");
    } finally {
      setActionDuelId(null);
      setPreparingDuelId(null);
    }
  }

  async function openFriends() {
    setInviteStep("friends");
    setFriendsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/friends", { cache: "no-store" });
      const body = (await response.json()) as FriendsData;
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Arkadaşlar yüklenemedi.");
      setFriends(body.friends ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Arkadaşlar yüklenemedi.");
    } finally {
      setFriendsLoading(false);
    }
  }

  async function sendFriendDuel(friend: Friend) {
    if (!selectedGame || sendingTo) return;
    setSendingTo(friend.user.id);
    setError("");
    try {
      const response = await fetch("/api/duels/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponentId: friend.user.id, gameCode: selectedGame }),
      });
      const body = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Düello daveti gönderilemedi.");
      setSelectedGame(null);
      setInviteStep("method");
      setMessage(tr ? "Düello daveti gönderildi." : "Duel invitation sent.");
      await loadDuels(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Düello daveti gönderilemedi.");
    } finally {
      setSendingTo(null);
    }
  }

  const incoming = data?.incoming ?? [];
  const active = data?.active ?? [];
  const outgoing = data?.outgoing ?? [];
  const history = data?.history ?? [];
  const selected = selectedGame ? GAME_INFO[selectedGame] : null;

  return (
    <main className="min-h-screen bg-[#07111f] px-4 pb-24 pt-5 text-white">
      <div className="mx-auto max-w-xl">
        <Link href={`/${locale}`} className="inline-flex"><img src="/footbattle-logo.png" alt="FootBattle" className="h-9 w-auto object-contain" /></Link>
        <div className="mt-6 flex items-start justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-green-300">⚔️ FootBattle Arena</p><h1 className="mt-2 text-3xl font-black">{tr ? "Düello" : "Duel"}</h1></div>
          {incoming.length ? <span className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-black">🔔 {incoming.length}</span> : null}
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-400">{tr ? "Oyunu seç, arkadaşına davet gönder. Kabul edildiğinde maç otomatik başlar." : "Choose a game and invite a friend. The match starts automatically after acceptance."}</p>

        {message ? <div className="mt-4 rounded-xl border border-green-400/20 bg-green-400/10 p-3 text-xs font-bold text-green-200">{message}</div> : null}
        {error ? <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs font-bold text-red-200">{error}</div> : null}

        {incoming.length ? (
          <section className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-400/[0.05] p-4">
            <h2 className="text-sm font-black text-amber-100">🔔 {tr ? "Gelen Düellolar" : "Incoming Duels"}</h2>
            <div className="mt-3 space-y-3">
              {incoming.map((duel) => (
                <article key={duel.id} className="rounded-xl border border-white/10 bg-[#07111f]/80 p-3">
                  <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black">{duel.otherPlayer?.displayName ?? (tr ? "Rakip" : "Opponent")}</p><p className="mt-1 text-[11px] font-bold text-slate-400">{duel.gameLabel}</p></div>{preparingDuelId === duel.id ? <span className="rounded-lg bg-green-400 px-3 py-2 text-sm font-black text-[#07111f]">{prepareSeconds}</span> : null}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" disabled={actionDuelId !== null} onClick={() => void respondToDuel(duel.id, "accept")} className="rounded-xl bg-green-400 px-3 py-3 text-xs font-black text-[#07111f] disabled:opacity-50">✓ {preparingDuelId === duel.id ? (tr ? "Hazırlanıyor" : "Preparing") : (tr ? "Kabul Et" : "Accept")}</button>
                    <button type="button" disabled={actionDuelId !== null} onClick={() => void respondToDuel(duel.id, "reject")} className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-3 text-xs font-black text-red-200 disabled:opacity-50">✕ {tr ? "Reddet" : "Reject"}</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-6">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{tr ? "Yeni düello" : "New duel"}</p>
          <h2 className="mt-1 text-xl font-black">{tr ? "Oyun seç" : "Choose a game"}</h2>
          <div className="mt-3 grid gap-3">
            {(Object.keys(GAME_INFO) as GameCode[]).map((code) => {
              const game = GAME_INFO[code];
              return <button key={code} type="button" onClick={() => { setSelectedGame(code); setInviteStep("method"); setError(""); }} className="rounded-2xl border border-green-400/15 bg-white/[0.035] p-4 text-left active:scale-[0.99]"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 text-2xl">{game.icon}</div><div className="min-w-0 flex-1"><h3 className="font-black">{tr ? game.titleTr : game.titleEn}</h3><p className="mt-1 text-[11px] text-slate-500">{tr ? game.textTr : game.textEn}</p></div><span className="text-green-300">→</span></div></button>;
            })}
          </div>
        </section>

        <section className="mt-7">
          <div className="flex items-center justify-between"><h2 className="text-lg font-black">{tr ? "Düellolarım" : "My duels"}</h2><span className="text-[10px] text-slate-500">{Number(data?.summary?.wins ?? 0)} {tr ? "galibiyet" : "wins"}</span></div>
          {loading ? <p className="mt-3 text-sm text-slate-500">{tr ? "Yükleniyor..." : "Loading..."}</p> : (
            <div className="mt-3 space-y-5">
              <DuelList title={tr ? "Aktif Düellolar" : "Active Duels"} items={active} empty={tr ? "Aktif düellon yok." : "No active duels."} tr={tr} />
              <DuelList title={tr ? "Gönderilen Davetler" : "Sent Invites"} items={outgoing} empty={tr ? "Bekleyen davetin yok." : "No sent invites."} tr={tr} />
              <DuelList title={tr ? "Son Düellolar" : "Recent Duels"} items={history.slice(0, 5)} empty={tr ? "Henüz geçmiş yok." : "No history yet."} tr={tr} />
            </div>
          )}
        </section>
      </div>

      {selectedGame && selected ? (
        <div className="fixed inset-0 z-[80] flex items-end bg-black/70 p-3 sm:items-center sm:justify-center" onClick={() => setSelectedGame(null)}>
          <div className="w-full max-w-md rounded-[24px] border border-white/10 bg-[#101c2c] p-5" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-wider text-green-300">{selected.icon} {tr ? selected.titleTr : selected.titleEn}</p><h2 className="mt-1 text-xl font-black">{inviteStep === "method" ? (tr ? "Rakibini seç" : "Choose rival") : (tr ? "Arkadaşını seç" : "Choose friend")}</h2></div><button type="button" onClick={() => setSelectedGame(null)} className="h-9 w-9 rounded-full bg-white/5">✕</button></div>
            {inviteStep === "method" ? <div className="mt-5 grid gap-3"><button type="button" onClick={() => void openFriends()} className="rounded-2xl border border-green-400/20 bg-green-500/10 p-4 text-left"><p className="font-black">👥 {tr ? "Arkadaşlar" : "Friends"}</p><p className="mt-1 text-xs text-slate-400">{tr ? "Uygulama içinden direkt düello gönder." : "Send a direct in-app duel."}</p></button><Link href={selected.linkHref} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="font-black">🔗 {tr ? "Link ile davet et" : "Invite by link"}</p><p className="mt-1 text-xs text-slate-400">{tr ? "Tek dokunuşla paylaşım linki oluştur." : "Create a share link in one tap."}</p></Link></div> : <div className="mt-5"><button type="button" onClick={() => setInviteStep("method")} className="mb-3 text-xs font-bold text-slate-400">← {tr ? "Geri" : "Back"}</button>{friendsLoading ? <p className="p-4 text-sm text-slate-500">{tr ? "Arkadaşlar yükleniyor..." : "Loading..."}</p> : friends.length ? <div className="max-h-[50vh] space-y-2 overflow-y-auto">{friends.map((friend) => <button key={friend.user.id} type="button" disabled={sendingTo !== null} onClick={() => void sendFriendDuel(friend)} className="flex w-full items-center justify-between rounded-xl border border-white/10 p-3 text-left disabled:opacity-50"><div><p className="text-sm font-black">{friend.user.displayName}</p><p className="text-[10px] text-slate-500">{friend.user.online ? "🟢 Çevrimiçi" : friend.user.lastSeenText ?? "Çevrimdışı"}</p></div><span className="rounded-lg bg-green-400 px-3 py-2 text-[11px] font-black text-[#07111f]">{sendingTo === friend.user.id ? "..." : (tr ? "Gönder" : "Send")}</span></button>)}</div> : <p className="p-4 text-sm text-slate-500">{tr ? "Henüz arkadaşın yok." : "No friends yet."}</p>}</div>}
          </div>
        </div>
      ) : null}
    </main>
  );
}

function DuelList({ title, items, empty, tr }: { title: string; items: Duel[]; empty: string; tr: boolean }) {
  return <section><h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{title}</h3>{items.length ? <div className="mt-2 space-y-2">{items.map((duel) => <article key={duel.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"><div className="min-w-0"><p className="truncate text-sm font-black">{duel.otherPlayer?.displayName ?? (tr ? "Rakip" : "Opponent")}</p><p className="mt-1 truncate text-[10px] text-slate-500">{duel.gameLabel} · {duel.status === "accepted" ? (tr ? "Hazırlanıyor" : "Preparing") : duel.status === "active" ? (tr ? "Devam ediyor" : "Active") : duel.status}</p></div>{duel.status === "active" || duel.status === "accepted" ? <Link href={duel.gameUrl ?? `/duels/${duel.id}`} className="shrink-0 rounded-lg bg-green-400 px-3 py-2 text-[11px] font-black text-[#07111f]">{tr ? "Oyuna Gir" : "Play"}</Link> : null}</article>)}</div> : <p className="mt-2 rounded-xl border border-dashed border-white/10 p-3 text-xs text-slate-600">{empty}</p>}</section>;
}
