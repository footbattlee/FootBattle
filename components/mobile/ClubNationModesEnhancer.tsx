"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Friend = { user: { id: string; displayName: string; username?: string | null } };
type Match = { id: string; opponent_kind: "human" | "bot"; bot_name?: string | null };

export default function ClubNationModesEnhancer() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname === "/en" || pathname.startsWith("/en/") ? "en" : "tr";
  const tr = locale === "tr";
  const plain = pathname.replace(/^\/(tr|en)(?=\/|$)/, "") || "/";
  const [duelTarget, setDuelTarget] = useState<HTMLElement | null>(null);
  const [rankTarget, setRankTarget] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [friendsMode, setFriendsMode] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [botIn, setBotIn] = useState<number | null>(null);

  useEffect(() => {
    let stopped = false;
    const locate = () => {
      if (stopped) return;
      if (plain === "/duels") {
        const h = Array.from(document.querySelectorAll("h2")).find((x) => /Oyun seç|Choose a game/i.test(x.textContent ?? ""));
        const grid = h?.closest("section")?.querySelector<HTMLElement>("div.mt-3.grid");
        if (grid) setDuelTarget(grid);
      } else setDuelTarget(null);
      if (plain === "/rank") {
        const h = Array.from(document.querySelectorAll("h2")).find((x) => /Oyununu seç|Choose your game/i.test(x.textContent ?? ""));
        const grid = h?.closest("section")?.querySelector<HTMLElement>("div.mt-4.grid");
        if (grid) setRankTarget(grid);
      } else setRankTarget(null);
    };
    locate();
    const observer = new MutationObserver(locate);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { stopped = true; observer.disconnect(); };
  }, [plain]);

  async function loadFriends() {
    setFriendsMode(true); setError("");
    try {
      const r = await fetch("/api/friends", { cache: "no-store" });
      const b = await r.json() as { ok?: boolean; error?: string; friends?: Friend[] };
      if (!r.ok || !b.ok) throw new Error(b.error ?? "Arkadaşlar yüklenemedi.");
      setFriends(b.friends ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Arkadaşlar yüklenemedi."); }
  }

  async function invite(friend: Friend) {
    if (busy) return;
    setBusy(friend.user.id); setError("");
    try {
      const r = await fetch("/api/duels/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opponentId: friend.user.id, gameCode: "club_nation" }) });
      const b = await r.json() as { ok?: boolean; error?: string };
      if (!r.ok || !b.ok) throw new Error(b.error ?? "Davet gönderilemedi.");
      setOpen(false); window.location.reload();
    } catch (e) { setError(e instanceof Error ? e.message : "Davet gönderilemedi."); }
    finally { setBusy(""); }
  }

  async function tick() {
    try {
      const r = await fetch("/api/rank/club-nation-matchmaking", { method: "POST" });
      const b = await r.json() as { ok?: boolean; error?: string; state?: string; botInMs?: number; match?: Match };
      if (!r.ok || !b.ok) throw new Error(b.error ?? "Rakip aranamadı.");
      if (b.state === "matched" && b.match) {
        setSearchText(b.match.opponent_kind === "bot" ? `Rakip bulundu: ${b.match.bot_name ?? "Bot Eren :)"} • Bot` : (tr ? "Gerçek oyuncu bulundu!" : "Real player found!"));
        setBotIn(null);
        window.setTimeout(() => router.push(`/${locale}/rank/match/${b.match!.id}`), 900);
        return;
      }
      setBotIn(Math.max(0, Math.ceil(Number(b.botInMs ?? 0) / 1000)));
      setSearchText(tr ? "1 Takım 1 Millet için rakip aranıyor…" : "Searching for a 1 Club 1 Nation opponent…");
      window.setTimeout(() => void tick(), 1200);
    } catch (e) {
      setSearching(false); setBotIn(null); setSearchText(e instanceof Error ? e.message : "Rakip aranamadı.");
    }
  }

  async function cancel() {
    await fetch("/api/rank/club-nation-matchmaking", { method: "DELETE" }).catch(() => null);
    setSearching(false); setSearchText(""); setBotIn(null);
  }

  const duelCard = <button type="button" onClick={() => { setOpen(true); setFriendsMode(false); setError(""); }} className="rounded-2xl border border-green-400/15 bg-white/[0.035] p-4 text-left active:scale-[0.99]"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 text-2xl">🌍</div><div className="min-w-0 flex-1"><h3 className="font-black">{tr ? "1 Takım 1 Millet" : "1 Club 1 Nation"}</h3><p className="mt-1 text-[11px] text-slate-500">{tr ? "Takım + milliyet eşleşmesini rakibinden önce bul." : "Find the club + nation match before your rival."}</p></div><span className="text-green-300">→</span></div></button>;

  const rankCard = <div className="rounded-2xl border border-white/10 bg-[#0c1929] p-4"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/20 text-xl">🌍</span><span className="min-w-0 flex-1"><b className="block">{tr ? "1 Takım 1 Millet" : "1 Club 1 Nation"}</b><small className="text-slate-500">{tr ? "İlk 3 roundu alan kazanır." : "First to 3 rounds wins."}</small></span></div>{!searching ? <button onClick={() => { setSearching(true); setSearchText(tr ? "Rakip aranıyor…" : "Searching…"); void tick(); }} className="mt-3 w-full rounded-xl border border-green-400/30 bg-green-500/10 px-3 py-2.5 text-xs font-black text-green-300">🔎 {tr ? "Bu oyunda rakip ara" : "Find opponent"}</button> : <div className="mt-3 rounded-xl bg-purple-500/10 p-3 text-center"><p className="text-xs font-black">{searchText}</p>{botIn !== null && botIn > 0 ? <p className="mt-1 text-[10px] text-slate-500">{botIn} sn → Bot Eren :)</p> : null}<button onClick={() => void cancel()} className="mt-2 text-[10px] font-black text-slate-400">{tr ? "İptal" : "Cancel"}</button></div>}</div>;

  return <>{duelTarget ? createPortal(duelCard, duelTarget) : null}{rankTarget ? createPortal(rankCard, rankTarget) : null}{open ? <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/75 p-3 sm:items-center" onClick={() => setOpen(false)}><div className="w-full max-w-md rounded-3xl border border-green-400/20 bg-[#101c2c] p-5 text-white" onClick={(e) => e.stopPropagation()}><div className="flex justify-between"><div><p className="text-[10px] font-black uppercase text-green-300">🌍 1 Takım 1 Millet</p><h3 className="mt-1 text-xl font-black">{tr ? "Rakibini seç" : "Choose opponent"}</h3></div><button onClick={() => setOpen(false)}>×</button></div>{!friendsMode ? <div className="mt-5 grid gap-3"><button onClick={() => void loadFriends()} className="rounded-2xl border border-green-400/20 bg-green-500/10 p-4 text-left"><b>👥 {tr ? "Arkadaşlar" : "Friends"}</b><p className="mt-1 text-xs text-slate-400">{tr ? "Ekli arkadaşına direkt düello gönder." : "Send a direct duel to a friend."}</p></button><button onClick={() => { window.location.href = "/duels/challenge?game=club_nation"; }} className="rounded-2xl border border-purple-400/20 bg-purple-500/10 p-4 text-left"><b>🔗 {tr ? "Link ile davet" : "Invite by link"}</b><p className="mt-1 text-xs text-slate-400">{tr ? "Link oluşturup istediğin kişiye gönder." : "Create and share an invite link."}</p></button></div> : <div className="mt-5"><button onClick={() => setFriendsMode(false)} className="mb-3 text-xs text-slate-400">← {tr ? "Geri" : "Back"}</button><div className="max-h-[45vh] space-y-2 overflow-y-auto">{friends.length ? friends.map((f) => <button key={f.user.id} disabled={Boolean(busy)} onClick={() => void invite(f)} className="flex w-full justify-between rounded-xl border border-white/10 p-3"><span><b>{f.user.displayName}</b>{f.user.username ? <small className="ml-2 text-slate-500">@{f.user.username}</small> : null}</span><span className="text-green-300">{busy === f.user.id ? "…" : (tr ? "Davet Et" : "Invite")}</span></button>) : <p className="text-sm text-slate-400">{tr ? "Arkadaş yok; link ile daveti kullanabilirsin." : "No friends; use link invite."}</p>}</div></div>}{error ? <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-xs text-red-200">{error}</p> : null}</div></div> : null}</>;
}
