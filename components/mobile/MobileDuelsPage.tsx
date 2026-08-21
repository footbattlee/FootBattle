"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/config";

type Duel = {
  id: number;
  gameCode: string;
  gameLabel: string;
  status: string;
  otherPlayer?: { displayName?: string } | null;
  myScore?: number;
  opponentScore?: number;
};

type Data = {
  ok?: boolean;
  error?: string;
  summary?: { incomingCount?: number; activeCount?: number; historyCount?: number; wins?: number };
  incoming?: Duel[];
  outgoing?: Duel[];
  active?: Duel[];
  history?: Duel[];
};

type Friend = {
  friendshipId: number;
  user: {
    id: string;
    displayName: string;
    username?: string | null;
    online?: boolean;
    lastSeenText?: string;
  };
};

type FriendsData = { ok?: boolean; error?: string; friends?: Friend[] };

type GameCode = "tic_tac_toe" | "club_clash";

const GAME_INFO: Record<GameCode, { icon: string; titleTr: string; titleEn: string; textTr: string; textEn: string; linkHref: string }> = {
  tic_tac_toe: {
    icon: "⭕",
    titleTr: "Futbol Tic Tac Toe",
    titleEn: "Football Tic Tac Toe",
    textTr: "Aynı 3×3 grid, aynı 120 saniye.",
    textEn: "Same 3×3 grid, same 120 seconds.",
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

export default function MobileDuelsPage({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<GameCode | null>(null);
  const [inviteStep, setInviteStep] = useState<"method" | "friends">("method");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState("");

  const loadDuels = useCallback(async () => {
    try {
      const response = await fetch("/api/duels", { cache: "no-store" });
      const body = (await response.json()) as Data;
      setData(response.ok ? body : { ok: false, error: body.error });
    } catch {
      setData({ ok: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDuels(); }, [loadDuels]);

  async function openFriends() {
    setInviteStep("friends");
    setFriendsLoading(true);
    setInviteError("");
    try {
      const response = await fetch("/api/friends", { cache: "no-store" });
      const body = (await response.json()) as FriendsData;
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Arkadaşlar yüklenemedi.");
      setFriends(body.friends ?? []);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Arkadaşlar yüklenemedi.");
    } finally {
      setFriendsLoading(false);
    }
  }

  async function sendFriendDuel(friend: Friend) {
    if (!selectedGame || sendingTo) return;
    setSendingTo(friend.user.id);
    setInviteError("");
    try {
      const response = await fetch("/api/duels/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponentId: friend.user.id, gameCode: selectedGame }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok || !body.duel?.id) throw new Error(body.error ?? "Düello daveti gönderilemedi.");
      window.location.href = `/duels/${body.duel.id}`;
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Düello daveti gönderilemedi.");
    } finally {
      setSendingTo(null);
    }
  }

  function closeInvite() {
    setSelectedGame(null);
    setInviteStep("method");
    setInviteError("");
    setFriends([]);
  }

  const active = data?.active ?? [];
  const incoming = data?.incoming ?? [];
  const outgoing = data?.outgoing ?? [];
  const history = data?.history ?? [];
  const game = selectedGame ? GAME_INFO[selectedGame] : null;

  return (
    <main className="min-h-screen bg-[#07111f] px-4 pb-24 pt-5 text-white">
      <div className="mx-auto max-w-xl">
        <Link href={`/${locale}`} aria-label="FootBattle" className="inline-flex">
          <img src="/footbattle-logo.png" alt="FootBattle" className="h-9 w-auto object-contain" />
        </Link>

        <div className="mt-6 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-green-300">⚔️ FootBattle Arena</p>
            <h1 className="mt-2 text-3xl font-black">{tr ? "Düello" : "Duel"}</h1>
          </div>
          {incoming.length > 0 ? (
            <span className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-black text-white">🔔 {incoming.length}</span>
          ) : null}
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-400">{tr ? "Oyunu seç, rakibini belirle; arkadaşına direkt davet gönder veya link paylaş." : "Choose a game and rival, then invite a friend directly or share a link."}</p>

        {data?.ok && incoming.length > 0 ? (
          <section className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-400/[0.05] p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-amber-200">🔔 {tr ? "Gelen Düellolar" : "Incoming Duels"}</h2>
              <span className="rounded-full bg-amber-400/15 px-2 py-1 text-[10px] font-black text-amber-200">{incoming.length}</span>
            </div>
            <div className="mt-3 space-y-2">
              {incoming.map((duel) => <DuelRow key={duel.id} duel={duel} tr={tr} emphasized />)}
            </div>
          </section>
        ) : null}

        <section className="mt-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{tr ? "Yeni düello" : "New duel"}</p>
              <h2 className="mt-1 text-xl font-black">{tr ? "Oyun seç" : "Choose a game"}</h2>
            </div>
            <span className="text-[10px] text-slate-600">{tr ? "2 saat arkadaş daveti" : "2h friend invite"}</span>
          </div>
          <div className="mt-3 grid gap-3">
            {(Object.keys(GAME_INFO) as GameCode[]).map((code) => {
              const item = GAME_INFO[code];
              return (
                <button key={code} type="button" onClick={() => { setSelectedGame(code); setInviteStep("method"); setInviteError(""); }} className="rounded-2xl border border-green-400/15 bg-white/[0.035] p-4 text-left transition active:scale-[0.99]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 text-2xl">{item.icon}</div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black">{tr ? item.titleTr : item.titleEn}</h3>
                      <p className="mt-1 text-[11px] leading-4 text-slate-500">{tr ? item.textTr : item.textEn}</p>
                    </div>
                    <span className="text-green-300">→</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-7">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black">{tr ? "Düellolarım" : "My duels"}</h2>
            {data?.ok ? <span className="text-[10px] font-bold text-slate-500">{Number(data.summary?.wins ?? 0)} {tr ? "galibiyet" : "wins"}</span> : null}
          </div>

          {loading ? <p className="mt-3 rounded-2xl border border-white/10 p-4 text-sm text-slate-500">{tr ? "Yükleniyor..." : "Loading..."}</p> : !data?.ok ? (
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
              <p className="text-sm font-bold text-slate-400">{tr ? "Davetlerini ve aktif düellolarını görmek için giriş yap." : "Sign in to see invites and active duels."}</p>
              <Link href="/login" className="mt-4 inline-flex rounded-xl bg-green-500 px-5 py-3 text-sm font-black text-[#07111f]">{tr ? "Giriş Yap" : "Sign In"}</Link>
            </div>
          ) : (
            <div className="mt-3 space-y-5">
              {incoming.length === 0 ? <DuelSection title={tr ? "Gelen Düellolar" : "Incoming"} items={incoming} empty={tr ? "Bekleyen davetin yok." : "No pending invites."} tr={tr} /> : null}
              <DuelSection title={tr ? "Aktif Düellolar" : "Active Duels"} items={active} empty={tr ? "Aktif düellon yok." : "No active duels."} tr={tr} />
              <DuelSection title={tr ? "Gönderilen Davetler" : "Sent Invites"} items={outgoing} empty={tr ? "Bekleyen gönderilmiş davetin yok." : "No sent invites."} tr={tr} muted />
              <DuelSection title={tr ? "Son Düellolar" : "Recent Duels"} items={history.slice(0, 5)} empty={tr ? "Henüz düello geçmişin yok." : "No duel history yet."} tr={tr} muted />
            </div>
          )}
        </section>
      </div>

      {selectedGame && game ? (
        <div className="fixed inset-0 z-[80] flex items-end bg-black/70 p-3 sm:items-center sm:justify-center" onClick={closeInvite}>
          <div className="w-full max-w-md rounded-[24px] border border-white/10 bg-[#101c2c] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-green-300">{game.icon} {tr ? game.titleTr : game.titleEn}</p>
                <h2 className="mt-1 text-xl font-black">{inviteStep === "method" ? (tr ? "Rakibini seç" : "Choose your rival") : (tr ? "Arkadaşını seç" : "Choose a friend")}</h2>
              </div>
              <button type="button" onClick={closeInvite} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-slate-400">✕</button>
            </div>

            {inviteStep === "method" ? (
              <div className="mt-5 grid gap-3">
                <button type="button" onClick={() => void openFriends()} className="rounded-2xl border border-green-400/20 bg-green-500/10 p-4 text-left">
                  <p className="font-black">👥 {tr ? "Arkadaşlar" : "Friends"}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{tr ? "FootBattle arkadaşına uygulama içinden direkt düello gönder." : "Send a direct in-app duel to a FootBattle friend."}</p>
                </button>
                <Link href={game.linkHref} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="font-black">🔗 {tr ? "Link ile davet et" : "Invite by link"}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{tr ? "Link oluştur ve Android paylaşım ekranından gönder." : "Create a link and share it with Android's share sheet."}</p>
                </Link>
              </div>
            ) : (
              <div className="mt-5">
                <button type="button" onClick={() => setInviteStep("method")} className="mb-3 text-xs font-bold text-slate-400">← {tr ? "Davet yöntemine dön" : "Back"}</button>
                {friendsLoading ? <p className="rounded-xl border border-white/10 p-4 text-sm text-slate-500">{tr ? "Arkadaşlar yükleniyor..." : "Loading friends..."}</p> : friends.length ? (
                  <div className="max-h-[50vh] space-y-2 overflow-y-auto">
                    {friends.map((friend) => (
                      <button key={friend.user.id} type="button" disabled={sendingTo !== null} onClick={() => void sendFriendDuel(friend)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.035] p-3 text-left disabled:opacity-50">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">{friend.user.displayName}</p>
                          <p className="mt-1 text-[10px] text-slate-500">{friend.user.online ? "🟢 Çevrimiçi" : friend.user.lastSeenText ?? "Çevrimdışı"}</p>
                        </div>
                        <span className="shrink-0 rounded-lg bg-green-500 px-3 py-2 text-[11px] font-black text-[#07111f]">{sendingTo === friend.user.id ? "..." : tr ? "Düello Gönder" : "Challenge"}</span>
                      </button>
                    ))}
                  </div>
                ) : <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-500">{tr ? "Henüz düello gönderebileceğin bir arkadaşın yok." : "No friends available yet."}</p>}
              </div>
            )}

            {inviteError ? <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-300">{inviteError}</p> : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}

function DuelRow({ duel, tr, emphasized = false }: { duel: Duel; tr: boolean; emphasized?: boolean }) {
  return (
    <Link href={`/duels/${duel.id}`} className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 ${emphasized ? "border-amber-400/20 bg-black/15" : "border-white/[0.07] bg-white/[0.04]"}`}>
      <div className="min-w-0">
        <p className="truncate text-sm font-black">{duel.otherPlayer?.displayName ?? (tr ? "Rakip" : "Opponent")}</p>
        <p className="mt-1 truncate text-[10px] text-slate-500">{duel.gameLabel || duel.gameCode}</p>
      </div>
      <span className="shrink-0 rounded-lg bg-green-500 px-3 py-2 text-[10px] font-black text-[#07111f]">{duel.status === "pending" ? (tr ? "Görüntüle" : "Open") : `${Number(duel.myScore ?? 0)} - ${Number(duel.opponentScore ?? 0)}`}</span>
    </Link>
  );
}

function DuelSection({ title, items, empty, tr, muted = false }: { title: string; items: Duel[]; empty: string; tr: boolean; muted?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-2"><h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{title}</h3>{items.length ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-black">{items.length}</span> : null}</div>
      <div className="mt-2 space-y-2">{items.length ? items.map((duel) => <DuelRow key={duel.id} duel={duel} tr={tr} />) : <p className={`rounded-xl border border-dashed border-white/[0.07] px-3 py-3 text-[11px] ${muted ? "text-slate-700" : "text-slate-600"}`}>{empty}</p>}</div>
    </div>
  );
}
