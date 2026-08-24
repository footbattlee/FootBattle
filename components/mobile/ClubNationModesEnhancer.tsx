"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Friend = { user: { id: string; displayName: string; username?: string | null } };

export default function ClubNationModesEnhancer() {
  const pathname = usePathname();
  const locale = pathname === "/en" || pathname.startsWith("/en/") ? "en" : "tr";
  const tr = locale === "tr";
  const plain = pathname.replace(/^\/(tr|en)(?=\/|$)/, "") || "/";
  const [duelTarget, setDuelTarget] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [friendsMode, setFriendsMode] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (plain !== "/duels") {
      setDuelTarget(null);
      return;
    }

    let stopped = false;
    const locate = () => {
      if (stopped) return;
      const heading = Array.from(document.querySelectorAll("h2")).find((node) => /Oyun seç|Choose a game/i.test(node.textContent ?? ""));
      const grid = heading?.closest("section")?.querySelector<HTMLElement>("div.mt-3.grid");
      if (grid) setDuelTarget(grid);
    };

    locate();
    const observer = new MutationObserver(locate);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      stopped = true;
      observer.disconnect();
    };
  }, [plain]);

  async function loadFriends() {
    setFriendsMode(true);
    setError("");
    try {
      const response = await fetch("/api/friends", { cache: "no-store" });
      const body = await response.json() as { ok?: boolean; error?: string; friends?: Friend[] };
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Arkadaşlar yüklenemedi.");
      setFriends(body.friends ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Arkadaşlar yüklenemedi.");
    }
  }

  async function invite(friend: Friend) {
    if (busy) return;
    setBusy(friend.user.id);
    setError("");
    try {
      const response = await fetch("/api/duels/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponentId: friend.user.id, gameCode: "club_nation" }),
      });
      const body = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Davet gönderilemedi.");
      setOpen(false);
      window.location.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Davet gönderilemedi.");
    } finally {
      setBusy("");
    }
  }

  const duelCard = (
    <button type="button" onClick={() => { setOpen(true); setFriendsMode(false); setError(""); }} className="rounded-2xl border border-green-400/15 bg-white/[0.035] p-4 text-left active:scale-[0.99]">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 text-2xl">🌍</div>
        <div className="min-w-0 flex-1">
          <h3 className="font-black">{tr ? "1 Takım 1 Millet" : "1 Club 1 Nation"}</h3>
          <p className="mt-1 text-[11px] text-slate-500">{tr ? "Takım + milliyet eşleşmesini rakibinden önce bul." : "Find the club + nation match before your rival."}</p>
        </div>
        <span className="text-green-300">→</span>
      </div>
    </button>
  );

  return <>
    {duelTarget ? createPortal(duelCard, duelTarget) : null}
    {open ? (
      <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/75 p-3 sm:items-center" onClick={() => setOpen(false)}>
        <div className="w-full max-w-md rounded-3xl border border-green-400/20 bg-[#101c2c] p-5 text-white" onClick={(event) => event.stopPropagation()}>
          <div className="flex justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-green-300">🌍 1 Takım 1 Millet</p>
              <h3 className="mt-1 text-xl font-black">{tr ? "Rakibini seç" : "Choose opponent"}</h3>
            </div>
            <button onClick={() => setOpen(false)}>×</button>
          </div>

          {!friendsMode ? (
            <div className="mt-5 grid gap-3">
              <button onClick={() => void loadFriends()} className="rounded-2xl border border-green-400/20 bg-green-500/10 p-4 text-left">
                <b>👥 {tr ? "Arkadaşlar" : "Friends"}</b>
                <p className="mt-1 text-xs text-slate-400">{tr ? "Ekli arkadaşına direkt düello gönder." : "Send a direct duel to a friend."}</p>
              </button>
              <button onClick={() => { window.location.href = "/duels/challenge?game=club_nation"; }} className="rounded-2xl border border-purple-400/20 bg-purple-500/10 p-4 text-left">
                <b>🔗 {tr ? "Link ile davet" : "Invite by link"}</b>
                <p className="mt-1 text-xs text-slate-400">{tr ? "Link oluşturup istediğin kişiye gönder." : "Create and share an invite link."}</p>
              </button>
            </div>
          ) : (
            <div className="mt-5">
              <button onClick={() => setFriendsMode(false)} className="mb-3 text-xs text-slate-400">← {tr ? "Geri" : "Back"}</button>
              <div className="max-h-[45vh] space-y-2 overflow-y-auto">
                {friends.length ? friends.map((friend) => (
                  <button key={friend.user.id} disabled={Boolean(busy)} onClick={() => void invite(friend)} className="flex w-full justify-between rounded-xl border border-white/10 p-3">
                    <span><b>{friend.user.displayName}</b>{friend.user.username ? <small className="ml-2 text-slate-500">@{friend.user.username}</small> : null}</span>
                    <span className="text-green-300">{busy === friend.user.id ? "…" : (tr ? "Davet Et" : "Invite")}</span>
                  </button>
                )) : <p className="text-sm text-slate-400">{tr ? "Arkadaş yok; link ile daveti kullanabilirsin." : "No friends; use link invite."}</p>}
              </div>
            </div>
          )}

          {error ? <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-xs text-red-200">{error}</p> : null}
        </div>
      </div>
    ) : null}
  </>;
}
