"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Side = "challenger" | "opponent";
type ChallengeResponse = {
  ok?: boolean;
  role?: Side | "visitor";
  completed?: boolean;
  result?: "win" | "loss" | "draw" | null;
  challenge?: {
    gameCode?: string;
    status?: string;
    challenger?: { name?: string | null; score?: number };
    opponent?: { name?: string | null; score?: number } | null;
  };
};
type RematchResponse = {
  ok?: boolean;
  state?: "none" | "pending" | "accepted" | "declined" | string;
  role?: Side;
  requestedBy?: Side | null;
  token?: string | null;
  startsAt?: string | null;
  bot?: boolean;
  error?: string;
};

export default function ClubNationResultUX() {
  const pathname = usePathname();
  const router = useRouter();
  const token = useMemo(() => pathname.match(/^\/challenge\/([a-zA-Z0-9]+)$/)?.[1] ?? null, [pathname]);
  const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);
  const [rematch, setRematch] = useState<RematchResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [startCountdown, setStartCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!token) { setChallenge(null); return; }
    const challengeToken = token;
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/challenges/${encodeURIComponent(challengeToken)}`, { cache: "no-store" });
        const result = await response.json() as ChallengeResponse;
        if (cancelled || !response.ok || !result.ok || result.challenge?.gameCode !== "club_nation") return;
        setChallenge(result);
      } catch { /* existing game UI handles errors */ }
    }

    void load();
    const id = window.setInterval(load, 1000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [token]);

  function scheduleStart(result: RematchResponse) {
    if (!result.token) return;
    const target = result.startsAt ? new Date(result.startsAt).getTime() : Date.now();
    const tick = () => setStartCountdown(Math.max(0, Math.ceil((target - Date.now()) / 1000)));
    tick();
    const interval = window.setInterval(tick, 100);
    const wait = Math.max(0, target - Date.now());
    window.setTimeout(() => {
      window.clearInterval(interval);
      window.location.replace(`/challenge/${encodeURIComponent(result.token!)}`);
    }, wait);
  }

  useEffect(() => {
    if (!token || !challenge?.completed) { setRematch(null); return; }
    const challengeToken = token;
    let cancelled = false;

    async function loadRematch() {
      try {
        const response = await fetch(`/api/challenges/${encodeURIComponent(challengeToken)}/club-nation/rematch`, { cache: "no-store" });
        const result = await response.json() as RematchResponse;
        if (cancelled || !response.ok || !result.ok) return;
        setRematch(result);
        if (result.state === "accepted" && result.token) scheduleStart(result);
      } catch { /* result screen stays usable */ }
    }

    void loadRematch();
    const id = window.setInterval(loadRematch, 800);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [challenge?.completed, token]);

  useEffect(() => {
    if (!challenge?.completed) return;

    const hideLegacy = () => {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>("p,div,a,button"));
      for (const node of nodes) {
        const text = node.textContent?.trim() ?? "";
        if (text.includes("Rövanş akışını bir sonraki aşamada") || text.includes("rematch flow will be connected")) {
          const box = node.closest("div.rounded-2xl") as HTMLElement | null;
          if (box) box.style.setProperty("display", "none", "important");
        }
        if (/^FootBattle['’]?a Dön$/i.test(text) || /^Back to FootBattle$/i.test(text)) {
          node.style.setProperty("display", "none", "important");
        }
      }
    };

    hideLegacy();
    const observer = new MutationObserver(hideLegacy);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [challenge?.completed]);

  async function requestRematch() {
    if (!token || busy) return;
    try {
      setBusy(true);
      setMessage("");
      const response = await fetch(`/api/challenges/${encodeURIComponent(token)}/club-nation/rematch`, { method: "POST" });
      const result = await response.json() as RematchResponse;
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Rövanş isteği gönderilemedi.");
      setRematch(result);
      if (result.state === "accepted" && result.token) {
        setMessage(result.bot ? "Bot Eren rövanşı hazır. Maç başlıyor…" : "Rövanş kabul edildi. Maç başlıyor…");
        scheduleStart(result);
      } else {
        setMessage("Rövanş isteği gönderildi. Rakibin onayı bekleniyor.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Rövanş isteği gönderilemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function respondRematch(action: "accept" | "decline") {
    if (!token || busy) return;
    try {
      setBusy(true);
      setMessage("");
      const response = await fetch(`/api/challenges/${encodeURIComponent(token)}/club-nation/rematch`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json() as RematchResponse;
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Rövanş yanıtlanamadı.");
      setRematch(result);
      if (action === "accept" && result.token) {
        setMessage("Rövanş kabul edildi. İki oyuncu birlikte başlıyor…");
        scheduleStart(result);
      } else {
        setMessage("Rövanş isteği reddedildi.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Rövanş yanıtlanamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function fallbackCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setShareMessage("Sonuç bağlantısı panoya kopyalandı.");
    } catch {
      setShareMessage("Paylaşım açılamadı. Tekrar deneyebilirsin.");
    }
  }

  async function shareResult() {
    if (!token || !challenge) return;

    const cName = challenge.challenge?.challenger?.name ?? "Oyuncu 1";
    const oName = challenge.challenge?.opponent?.name ?? "Oyuncu 2";
    const cScore = Number(challenge.challenge?.challenger?.score ?? 0);
    const oScore = Number(challenge.challenge?.opponent?.score ?? 0);
    const title = challenge.result === "win" ? "Kazandım!" : challenge.result === "loss" ? "Bu kez rakip aldı." : "Berabere!";
    const text = `🌍 FootBattle 1 Takım 1 Millet düellosu: ${title}\n${cName} ${cScore} - ${oScore} ${oName}`;
    const url = `https://playfootbattle.com/challenge/${token}`;
    const fullText = `${text}\n${url}`;

    setShareMessage("");

    if (navigator.share) {
      try {
        await navigator.share({ title: "1 Takım 1 Millet · FootBattle", text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    await fallbackCopy(fullText);
  }

  if (!token || !challenge?.completed || challenge.challenge?.gameCode !== "club_nation") return null;

  const incoming = rematch?.state === "pending" && rematch.role && rematch.requestedBy && rematch.role !== rematch.requestedBy;
  const outgoing = rematch?.state === "pending" && rematch.role && rematch.requestedBy === rematch.role;

  if (startCountdown !== null && rematch?.state === "accepted") {
    return (
      <div className="fixed inset-0 z-[360] flex items-center justify-center bg-[#07111f]/95 px-5 text-center text-white backdrop-blur-sm">
        <section className="w-full max-w-sm rounded-3xl border border-green-400/30 bg-[#101c2c] p-6 shadow-2xl">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-green-300">🔁 Rövanş</p>
          <h2 className="mt-2 text-2xl font-black">Maç başlıyor</h2>
          <div className="mt-5 text-6xl font-black tabular-nums text-green-300">{startCountdown}</div>
        </section>
      </div>
    );
  }

  return (
    <>
      {incoming ? (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm">
          <section className="w-full max-w-sm rounded-3xl border border-purple-400/30 bg-[#101c2c] p-5 text-center text-white shadow-2xl">
            <div className="text-4xl">🔁</div>
            <h2 className="mt-3 text-2xl font-black">Rövanş isteği</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Rakibin yeniden oynamak istiyor. Kabul ederseniz maç iki cihazda aynı anda başlayacak.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" data-rematch-consent-action="true" disabled={busy} onClick={() => void respondRematch("decline")} className="min-h-12 rounded-2xl border border-red-400/30 bg-red-400/10 font-black text-red-300 disabled:opacity-50">Reddet</button>
              <button type="button" data-rematch-consent-action="true" disabled={busy} onClick={() => void respondRematch("accept")} className="min-h-12 rounded-2xl bg-green-500 font-black text-[#07111f] disabled:opacity-50">Kabul Et</button>
            </div>
          </section>
        </div>
      ) : null}

      <div className="fixed inset-x-3 bottom-[calc(14px+env(safe-area-inset-bottom))] z-[80] mx-auto max-w-xl rounded-2xl border border-white/15 bg-[#101c2c]/95 p-2 shadow-2xl backdrop-blur-xl md:bottom-5">
        {message || outgoing || shareMessage ? (
          <div className="mb-2 rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 text-center text-xs font-bold text-yellow-100">
            {shareMessage || (outgoing ? "🔁 Rövanş isteği gönderildi · Rakibin onayı bekleniyor" : message)}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" data-rematch-consent-action="true" onClick={() => void requestRematch()} disabled={busy || Boolean(outgoing)} className="min-h-12 rounded-xl bg-yellow-400 px-3 font-black text-[#07111f] disabled:opacity-50">{busy ? "Hazırlanıyor..." : "🔁 Rövanş"}</button>
          <button type="button" onClick={() => void shareResult()} className="min-h-12 rounded-xl border border-green-400/30 bg-green-400/10 px-3 font-black text-green-200">↗ Sonucu Paylaş</button>
        </div>
        <button type="button" onClick={() => router.push("/")} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-white/5 px-3 font-black text-white">⌂ Ana Sayfa</button>
      </div>
    </>
  );
}
