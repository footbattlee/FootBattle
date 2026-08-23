"use client";

import { useEffect, useMemo, useState } from "react";

type Side = "challenger" | "opponent";
type RematchState = {
  ok?: boolean;
  state?: "none" | "pending" | "accepted" | "declined" | string;
  role?: Side;
  requestedBy?: Side | null;
  token?: string | null;
  startsAt?: string | null;
  error?: string;
};

type Context = {
  token: string;
  kind: "tic-tac-toe" | "club-clash";
  endpoint: string;
  targetPath: (token: string) => string;
};

function readContext(): Context | null {
  if (typeof window === "undefined") return null;
  const ttt = window.location.pathname.match(/^\/tic-tac-toe\/duel\/([^/?]+)/);
  if (ttt?.[1]) {
    const token = ttt[1];
    return {
      token,
      kind: "tic-tac-toe",
      endpoint: `/api/challenges/${encodeURIComponent(token)}/tic-tac-toe/rematch`,
      targetPath: (nextToken) => `/tic-tac-toe/duel/${encodeURIComponent(nextToken)}`,
    };
  }

  const club = window.location.pathname.match(/^\/challenge\/([^/?]+)/);
  if (club?.[1]) {
    const token = club[1];
    return {
      token,
      kind: "club-clash",
      endpoint: `/api/challenges/${encodeURIComponent(token)}/club-clash/rematch`,
      targetPath: (nextToken) => `/challenge/${encodeURIComponent(nextToken)}`,
    };
  }
  return null;
}

function forceHorizontalPlayerResults() {
  if (typeof window === "undefined" || !window.location.pathname.startsWith("/tic-tac-toe/duel/")) return;
  const buttons = Array.from(document.querySelectorAll("button"));
  for (const button of buttons) {
    if (!button.textContent?.includes("Seç →")) continue;
    const el = button as HTMLButtonElement;
    el.style.display = "flex";
    el.style.width = "100%";
    el.style.flexDirection = "row";
    el.style.alignItems = "center";
    el.style.justifyContent = "space-between";
    el.style.gap = "12px";
    el.style.whiteSpace = "nowrap";
    el.style.wordBreak = "normal";
    el.style.writingMode = "horizontal-tb";
    const first = el.querySelector("span:first-child") as HTMLElement | null;
    if (first) {
      first.style.display = "block";
      first.style.flex = "1 1 auto";
      first.style.minWidth = "0";
      first.style.width = "auto";
      first.style.whiteSpace = "nowrap";
      first.style.wordBreak = "normal";
      first.style.overflowWrap = "normal";
      first.style.writingMode = "horizontal-tb";
      first.style.overflow = "hidden";
      first.style.textOverflow = "ellipsis";
    }
  }
}

export default function DuelRematchConsentBridge() {
  const [context, setContext] = useState<Context | null>(null);
  const [rematch, setRematch] = useState<RematchState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const sync = () => setContext(readContext());
    sync();
    window.addEventListener("popstate", sync);
    const observer = new MutationObserver(() => {
      forceHorizontalPlayerResults();
      const next = readContext();
      setContext((current) => current?.endpoint === next?.endpoint ? current : next);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    forceHorizontalPlayerResults();
    return () => {
      window.removeEventListener("popstate", sync);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!context) { setRematch(null); return; }
    let cancelled = false;
    let redirectTimer: number | null = null;

    const load = async () => {
      try {
        const response = await fetch(context.endpoint, { cache: "no-store" });
        const result = await response.json() as RematchState;
        if (cancelled || !response.ok || !result.ok) return;
        setRematch(result);
        if (result.state === "accepted" && result.token) {
          const wait = result.startsAt ? Math.max(0, new Date(result.startsAt).getTime() - Date.now()) : 0;
          redirectTimer = window.setTimeout(() => {
            window.location.href = context.targetPath(result.token!);
          }, wait);
        }
      } catch { /* page stays usable */ }
    };

    void load();
    const id = window.setInterval(load, 1100);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      if (redirectTimer) window.clearTimeout(redirectTimer);
    };
  }, [context]);

  useEffect(() => {
    if (!context) return;
    const intercept = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button") as HTMLButtonElement | null;
      if (!button || !button.textContent?.includes("Rövanş")) return;
      if (button.dataset.rematchConsentAction === "true") return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (busy) return;

      setBusy(true);
      setMessage("");
      void fetch(context.endpoint, { method: "POST" })
        .then(async (response) => {
          const result = await response.json() as RematchState;
          if (!response.ok || !result.ok) throw new Error(result.error ?? "Rövanş isteği gönderilemedi.");
          setRematch(result);
          setMessage("Rövanş isteği gönderildi. Rakibin onayı bekleniyor.");
        })
        .catch((error) => setMessage(error instanceof Error ? error.message : "Rövanş isteği gönderilemedi."))
        .finally(() => setBusy(false));
    };
    document.addEventListener("click", intercept, true);
    return () => document.removeEventListener("click", intercept, true);
  }, [busy, context]);

  async function respond(action: "accept" | "decline") {
    if (!context || busy) return;
    try {
      setBusy(true);
      setMessage("");
      const response = await fetch(context.endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json() as RematchState;
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Rövanş yanıtlanamadı.");
      setRematch(result);
      if (action === "decline") setMessage("Rövanş isteği reddedildi.");
      if (action === "accept" && result.token) {
        setMessage("Rövanş kabul edildi. Maç başlıyor…");
        const wait = result.startsAt ? Math.max(0, new Date(result.startsAt).getTime() - Date.now()) : 0;
        window.setTimeout(() => { window.location.href = context.targetPath(result.token!); }, wait);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Rövanş yanıtlanamadı.");
    } finally { setBusy(false); }
  }

  const incoming = useMemo(
    () => rematch?.state === "pending" && rematch.role && rematch.requestedBy && rematch.role !== rematch.requestedBy,
    [rematch],
  );
  const outgoing = rematch?.state === "pending" && rematch.role && rematch.requestedBy === rematch.role;

  if (!context || (!incoming && !outgoing && !message)) return null;

  if (incoming) {
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm">
        <section className="w-full max-w-sm rounded-3xl border border-purple-400/30 bg-[#101c2c] p-5 text-center text-white shadow-2xl">
          <div className="text-4xl">🔁</div>
          <h2 className="mt-3 text-2xl font-black">Rövanş isteği</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Rakibin yeniden oynamak istiyor. Kabul edersen iki taraf için maç aynı anda başlayacak.</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button data-rematch-consent-action="true" disabled={busy} onClick={() => void respond("decline")} className="min-h-12 rounded-2xl border border-red-400/30 bg-red-400/10 font-black text-red-300 disabled:opacity-50">Reddet</button>
            <button data-rematch-consent-action="true" disabled={busy} onClick={() => void respond("accept")} className="min-h-12 rounded-2xl bg-green-500 font-black text-[#07111f] disabled:opacity-50">Kabul Et</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-3 bottom-[calc(88px+env(safe-area-inset-bottom))] z-[250] mx-auto max-w-md rounded-2xl border border-yellow-400/25 bg-[#101c2c]/95 px-4 py-3 text-center text-sm font-bold text-yellow-100 shadow-xl backdrop-blur-xl">
      {outgoing ? "🔁 Rövanş isteği gönderildi · Rakibin onayı bekleniyor" : message}
    </div>
  );
}
