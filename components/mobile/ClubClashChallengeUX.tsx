"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { GAME_NAMES, trackPlayAgain, trackShared } from "@/lib/analytics/game-analytics";

type Side = "challenger" | "opponent";
type Round = {
  roundNo: number;
  left: { value: string };
  right: { value: string };
  winnerSide: Side | "draw" | null;
  challengerAnswer?: string | null;
  opponentAnswer?: string | null;
};
type State = {
  ok?: boolean;
  role?: Side;
  completed?: boolean;
  result?: "win" | "loss" | "draw" | null;
  winnerSide?: Side | "draw" | null;
  score?: { challenger: number; opponent: number };
  players?: {
    challenger: { name: string | null; score: number };
    opponent: { name: string | null; score: number };
  };
  rounds?: Round[];
};
type Challenge = { ok?: boolean; challenge?: { gameCode?: string; status?: string } };
type Rematch = { ok?: boolean; token?: string | null; error?: string };

export default function ClubClashChallengeUX() {
  const pathname = usePathname();
  const router = useRouter();
  const token = useMemo(() => pathname.match(/^\/challenge\/([a-zA-Z0-9]+)$/)?.[1] ?? null, [pathname]);
  const [active, setActive] = useState(false);
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) { setActive(false); setState(null); return; }
    const challengeToken = token;
    let cancelled = false;
    async function load() {
      try {
        const c = await fetch(`/api/challenges/${encodeURIComponent(challengeToken)}`, { cache: "no-store" });
        const cj = await c.json() as Challenge;
        if (cancelled || !c.ok || !cj.ok || cj.challenge?.gameCode !== "club_clash") return;
        setActive(true);
        document.body.classList.add("club-clash-challenge-mobile");
        const s = await fetch(`/api/challenges/${encodeURIComponent(challengeToken)}/club-clash`, { cache: "no-store" });
        const sj = await s.json() as State;
        if (!cancelled && s.ok && sj.ok) setState(sj);
      } catch { /* existing page handles errors */ }
    }
    void load();
    const id = window.setInterval(load, 1500);
    return () => { cancelled = true; window.clearInterval(id); document.body.classList.remove("club-clash-challenge-mobile"); };
  }, [token]);

  useEffect(() => {
    if (!active || !state?.completed || !token) return;
    const challengeToken = token;
    const id = window.setInterval(() => {
      void fetch(`/api/challenges/${encodeURIComponent(challengeToken)}/club-clash/rematch`, { cache: "no-store" })
        .then((r) => r.json() as Promise<Rematch>)
        .then((r) => { if (r.ok && r.token) router.replace(`/challenge/${r.token}`); })
        .catch(() => undefined);
    }, 1500);
    return () => window.clearInterval(id);
  }, [active, state?.completed, token, router]);

  useEffect(() => {
    if (!active || !state?.completed) return;
    const nodes = Array.from(document.querySelectorAll("p"));
    const p = nodes.find((node) => node.textContent?.trim() === "⚔️ Rövanş?");
    const box = p?.closest("div.rounded-2xl") as HTMLElement | null;
    if (box) box.style.display = "none";
    return () => { if (box) box.style.display = ""; };
  }, [active, state?.completed]);

  async function rematch() {
    if (!token || busy) return;
    try {
      setBusy(true);
      await trackPlayAgain(GAME_NAMES.CLUB_CLASH, token);
      const response = await fetch(`/api/challenges/${encodeURIComponent(token)}/club-clash/rematch`, { method: "POST" });
      const result = await response.json() as Rematch;
      if (!response.ok || !result.ok || !result.token) throw new Error(result.error ?? "Rövanş oluşturulamadı.");
      router.replace(`/challenge/${result.token}`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Rövanş oluşturulamadı.");
    } finally { setBusy(false); }
  }

  async function makeImage() {
    if (!state) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1080; canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#07111f"; ctx.fillRect(0, 0, 1080, 1350);
    ctx.fillStyle = "#86efac"; ctx.font = "700 38px sans-serif"; ctx.fillText("FOOTBATTLE", 70, 85);
    ctx.fillStyle = "#fff"; ctx.font = "800 58px sans-serif"; ctx.fillText("2 Takım 1 Oyuncu · Düello", 70, 170);
    const title = state.result === "win" ? "Kazandım!" : state.result === "loss" ? "Rakip kazandı" : "Berabere";
    ctx.fillStyle = "#fde047"; ctx.font = "800 48px sans-serif"; ctx.fillText(title, 70, 240);
    const cName = state.players?.challenger.name ?? "Oyuncu 1";
    const oName = state.players?.opponent.name ?? "Oyuncu 2";
    ctx.fillStyle = "#cbd5e1"; ctx.font = "700 30px sans-serif";
    ctx.fillText(`${cName} ${state.score?.challenger ?? 0}  —  ${state.score?.opponent ?? 0} ${oName}`, 70, 300);

    let y = 385;
    for (const round of state.rounds ?? []) {
      const winnerName = round.winnerSide === "challenger" ? cName : round.winnerSide === "opponent" ? oName : "Berabere";
      const answer = round.winnerSide === "challenger" ? round.challengerAnswer : round.winnerSide === "opponent" ? round.opponentAnswer : null;
      ctx.fillStyle = "#0d1828"; ctx.fillRect(70, y, 940, 150);
      ctx.strokeStyle = round.winnerSide ? "#475569" : "#243244"; ctx.lineWidth = 2; ctx.strokeRect(70, y, 940, 150);
      ctx.fillStyle = "#94a3b8"; ctx.font = "700 23px sans-serif"; ctx.fillText(`ROUND ${round.roundNo}`, 100, y + 35);
      ctx.fillStyle = "#fff"; ctx.font = "800 29px sans-serif"; ctx.fillText(`${round.left.value}  ×  ${round.right.value}`, 100, y + 78);
      ctx.fillStyle = "#86efac"; ctx.font = "700 24px sans-serif"; ctx.fillText(`${winnerName}${answer ? ` · ${answer}` : ""}`, 100, y + 118);
      y += 165;
    }
    ctx.fillStyle = "#94a3b8"; ctx.font = "600 27px sans-serif"; ctx.fillText("Futbolu biliyorsan, kanıtla. · playfootbattle.com", 70, 1280);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 0.95));
  }

  async function shareResult() {
    if (!token) return;
    const text = `⚔️ FootBattle 2 Takım 1 Oyuncu düellosu: ${state?.result === "win" ? "Kazandım!" : state?.result === "loss" ? "Bu kez rakip aldı." : "Berabere!"}`;
    const url = `https://playfootbattle.com/challenge/${token}`;
    try {
      const blob = await makeImage();
      if (blob) {
        const file = new File([blob], "footbattle-2-takim-1-oyuncu.png", { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title: "2 Takım 1 Oyuncu · FootBattle", text, url, files: [file] });
          await trackShared(GAME_NAMES.CLUB_CLASH, token);
          return;
        }
      }
      if (navigator.share) await navigator.share({ title: "2 Takım 1 Oyuncu · FootBattle", text, url });
      else await navigator.clipboard.writeText(`${text}\n${url}`);
      await trackShared(GAME_NAMES.CLUB_CLASH, token);
    } catch { /* cancelled */ }
  }

  if (!active || !state?.completed) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(14px+env(safe-area-inset-bottom))] z-[80] mx-auto max-w-xl rounded-2xl border border-white/15 bg-[#101c2c]/95 p-2 shadow-2xl backdrop-blur-xl md:bottom-5">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={rematch} disabled={busy} className="min-h-12 rounded-xl bg-yellow-400 px-3 font-black text-[#07111f] disabled:opacity-50">{busy ? "Hazırlanıyor..." : "🔁 Rövanş"}</button>
        <button type="button" onClick={shareResult} className="min-h-12 rounded-xl border border-green-400/30 bg-green-400/10 px-3 font-black text-green-200">↗ Sonucu Paylaş</button>
      </div>
      <button type="button" onClick={() => router.push("/")} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-white/5 px-3 font-black text-white transition hover:bg-white/10">⌂ Ana Sayfa</button>
    </div>
  );
}
