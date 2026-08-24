"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Friend = { user: { id: string; displayName: string; username?: string | null } };
type FriendsData = { ok?: boolean; error?: string; friends?: Friend[] };
type MatchResponse = {
  ok?: boolean;
  error?: string;
  state?: "searching" | "matched";
  botInMs?: number;
  match?: { id: string; opponent_kind: "human" | "bot"; bot_name?: string | null };
};

export default function ClubNationModesEnhancer() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname === "/en" || pathname.startsWith("/en/") ? "en" : "tr";
  const tr = locale === "tr";
  const plain = pathname.replace(/^\/(tr|en)(?=\/|$)/, "") || "/";
  const [duelTarget, setDuelTarget] = useState<HTMLElement | null>(null);
  const [rankTarget, setRankTarget] = useState<HTMLElement | null>(null);
  const [duelOpen, setDuelOpen] = useState(false);
  const [step, setStep] = useState<"method" | "friends">("method");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [rankSearching, setRankSearching] = useState(false);
  const [rankMessage, setRankMessage] = useState("");
  const [botIn, setBotIn] = useState<number | null>(null);

  useEffect(() => {
    if (plain !== "/duels" && plain !== "/rank") {
      setDuelTarget(null); setRankTarget(null); return;
    }
    let stopped = false;
    const findTargets = () => {
      if (stopped) return;
      if (plain === "/duels") {
        const headings = Array.from(document.querySelectorAll("h2"));
        const heading = headings.find((node) => /Oyun seç|Choose a game/i.test(node.textContent ?? ""));
        const section = heading?.closest("section");
        const grid = section?.querySelector<HTMLElement>("div.mt-3.grid");
        if (grid) setDuelTarget(grid);
      }
      if (plain === "/rank") {
        const headings = Array.from(document.querySelectorAll("h2"));
        const heading = headings.find((node) => /Oyununu seç|Choose your game/i.test(node.textContent ?? ""));
        const section = heading?.closest("section");
        const grid = section?.querySelector<HTMLElement>("div.mt-4.grid");
        if (grid) setRankTarget(grid);
      }
    };
    findTargets();
    const observer = new MutationObserver(findTargets);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { stopped = true; observer.disconnect(); };
  }, [plain]);

  async function openFriends() {
    setStep("friends"); setLoadingFriends(true); setMessage("");
    try {
      const response = await fetch("/api/friends", { cache: "no-store" });
      const body = await response.json() as FriendsData;
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Arkadaşlar yüklenemedi.");
      setFriends(body.friends ?? []);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Arkadaşlar yüklenemedi."); }
    finally { setLoadingFriends(false); }
  }

  async function inviteFriend(friend: Friend) {
    if (sending) return;
    try {
      setSending(friend.user.id); setMessage("");
      const response = await fetch("/api/duels/request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponentId: friend.user.id, gameCode: "club_nation" }),
      });
      const body = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Düello daveti gönderilemedi.");
      setDuelOpen(false); setStep("method");
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Düello daveti gönderilemedi."); }
    finally { setSending(null); }
  }

  function linkInvite() {
    window.location.href = "/duels/challenge?game=club_nation";
  }

  async function rankedTick() {
    try {
      const response = await fetch("/api/rank/matchmaking", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameCode: "club_nation" }),
      });
      const result = await response.json() as MatchResponse;
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Rakip aranamadı.");
      if (result.state === "matched" && result.match) {
        setRankMessage(result.match.opponent_kind === "bot" ? `Rakip bulundu: ${result.match.bot_name ?? "Bot Eren :)"} • Bot` : (tr ? "Gerçek oyuncu bulundu!" : "Real player found!"));
        setBotIn(null);
        window.setTimeout(() => router.push(`/${locale}/rank/match/${result.match!.id}`), 900);
        return;
      }
      setBotIn(Math.max(0, Math.ceil(Number(result.botInMs ?? 0) / 1000)));
      setRankMessage(tr ? "1 Takım 1 Millet için rakip aranıyor…" : "Searching for a 1 Club 1 Nation opponent…");
      window.setTimeout(() => void rankedTick(), 1200);
    } catch (error) {
      setRankSearching(false); setBotIn(null);
      setRankMessage(error instanceof Error ? error.message : (tr ? "Rakip aranamadı." : "Could not find an opponent."));
    }
  }

  async function startRanked() {
    if (rankSearching) return;
    setRankSearching(true); setRankMessage(tr ? "Rakip aranıyor…" : "Searching…");
    await rankedTick();
  }

  async function cancelRanked() {
    await fetch("/api/rank/matchmaking", { method: "DELETE" }).catch(() => null);
    setRankSearching(false); setRankMessage(""); setBotIn(null);
  }

  return <>
    {duelTarget ? createPortal(
      <button type="button" onClick={() => { setDuelOpen(true); setStep("method"); setMessage(""); }} className="rounded-2xl border border-green-400/15 bg-white/[0.035] p-4 text-left active:scale-[0.99]">
        <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 text-2xl">🌍</div><div className="min-w-0 flex-1"><h3 className="font-black">{tr ? "1 Takım 1 Millet" : "1 Club 1 Nation"}</h3><p className="mt-1 text-[11px] text-slate-500">{tr ? "Takım + milliyet eşleşmesini rakibinden önce bul." : "Find the club + nation match before your rival."}</p></div><span className="text-green-300">→</span></div>
      </button>, duelTarget) : null}

    {rankTarget ? createPortal(
      <div className="rounded-2xl border border-white/10 bg-[#0c1929] p-4">
        <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/20 text-xl">🌍</span><span className="min-w-0 flex-1"><span className="block font-black">{tr ? "1 Takım 1 Millet" : "1 Club 1 Nation"}</span><span className="mt-0.5 block text-[11px] text-slate-500">{tr ? "İlk 3 roundu alan kazanır." : "First to 3 rounds wins."}</span></span></div>
        {!rankSearching ? <button type="button" onClick={() => void startRanked()} className="mt-3 w-full rounded-xl border border-green-400/30 bg-green-500/10 px-3 py-2.5 text-xs font-black text-green-300">🔎 {tr ? "Bu oyunda rakip ara" : "Find opponent"}</button> : <div className="mt-3 rounded-xl border border-purple-400/20 bg-purple-500/[0.08] p-3 text-center"><p className="text-xs font-black">{rankMessage}</p>{botIn !== null && botIn > 0 ? <p className="mt-1 text-[10px] text-slate-500">{botIn} sn → Bot Eren :)</p> : null}<button type="button" onClick={() => void cancelRanked()} className="mt-2 text-[10px] font-black text-slate-400">{tr ? "İptal" : "Cancel"}</button></div>}
      </div>, rankTarget) : null}

    {duelOpen ? <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center" onClick={() => setDuelOpen(false)}><div className="w-full max-w-md rounded-3xl border border-green-400/20 bg-[#101c2c] p-5 text-white" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-wider text-green-300">🌍 {tr ? "1 Takım 1 Millet" : "1 Club 1 Nation"}</p><h3 className="mt-1 text-xl font-black">{tr ? "Rakibini seç" : "Choose opponent"}</h3></div><button onClick={() => setDuelOpen(false)} className="h-9 w-9 rounded-full border border-white/10">×</button></div>
      {step === "method" ? <div className="mt-5 grid gap-3"><button onClick={() => void openFriends()} className="rounded-2xl border border-green-400/20 bg-green-500/10 p-4 text-left"><b>👥 {tr ? "Arkadaşlar" : "Friends"}</b><p className="mt-1 text-xs text-slate-400">{tr ? "Ekli arkadaşına direkt düello gönder." : "Send a direct duel to a friend."}</p></button><button onClick={linkInvite} className="rounded-2xl border border-purple-400/20 bg-purple-500/10 p-4 text-left"><b>🔗 {tr ? "Link ile davet" : "Invite by link"}</b><p className="mt-1 text-xs text-slate-400">{tr ? "Link oluştur, istediğin kişiye gönder." : "Create a link and share it."}</p></button></div> : <div className="mt-5"><button onClick={() => setStep("method")} className="mb-3 text-xs font-black text-slate-400">← {tr ? "Geri" : "Back"}</button>{loadingFriends ? <p className="py-6 text-center text-sm text-slate-400">{tr ? "Arkadaşlar yükleniyor…" : "Loading friends…"}</p> : friends.length ? <div className="max-h-[45vh] space-y-2 overflow-y-auto">{friends.map((friend) => <button key={friend.user.id} disabled={Boolean(sending)} onClick={() => void inviteFriend(friend)} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] p-3 text-left"><span><b>{friend.user.displayName}</b>{friend.user.username ? <small className="ml-2 text-slate-500">@{friend.user.username}</small> : null}</span><span className="text-green-300">{sending === friend.user.id ? "…" : (tr ? "Davet Et" : "Invite")}</span></button>)}</div> : <p className="rounded-xl border border-white/10 p-4 text-sm text-slate-400">{tr ? "Henüz arkadaşın yok. Link ile daveti kullanabilirsin." : "No friends yet. Use link invite."}</p>}</div>}
      {message ? <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-xs font-bold text-red-200">{message}</p> : null}
    </div></div> : null}
  </>;
}
