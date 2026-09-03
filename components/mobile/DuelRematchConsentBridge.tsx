"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

const REMATCH_POLL_MS = 5000;

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

function important(el: HTMLElement, property: string, value: string) {
  el.style.setProperty(property, value, "important");
}

function forceHorizontalPlayerResults() {
  if (typeof window === "undefined" || !window.location.pathname.startsWith("/tic-tac-toe/duel/")) return;
  const buttons = Array.from(document.querySelectorAll("button"));
  for (const button of buttons) {
    if (!button.textContent?.includes("Seç →")) continue;
    const el = button as HTMLButtonElement;
    const parent = el.parentElement;
    if (parent) {
      important(parent, "display", "block");
      important(parent, "width", "100%");
      important(parent, "min-width", "0");
    }
    important(el, "display", "grid");
    important(el, "grid-template-columns", "minmax(0, 1fr) max-content");
    important(el, "align-items", "center");
    important(el, "width", "100%");
    important(el, "min-width", "0");
    important(el, "max-width", "100%");
    important(el, "gap", "12px");
    important(el, "white-space", "nowrap");
    important(el, "word-break", "normal");
    important(el, "overflow-wrap", "normal");
    important(el, "writing-mode", "horizontal-tb");

    const first = el.querySelector("span:first-child") as HTMLElement | null;
    const last = el.querySelector("span:last-child") as HTMLElement | null;
    if (first) {
      important(first, "display", "block");
      important(first, "width", "100%");
      important(first, "min-width", "0");
      important(first, "max-width", "100%");
      important(first, "white-space", "nowrap");
      important(first, "word-break", "normal");
      important(first, "overflow-wrap", "normal");
      important(first, "writing-mode", "horizontal-tb");
      important(first, "overflow", "hidden");
      important(first, "text-overflow", "ellipsis");
      important(first, "line-height", "1.25");
    }
    if (last) {
      important(last, "display", "block");
      important(last, "width", "auto");
      important(last, "min-width", "max-content");
      important(last, "white-space", "nowrap");
      important(last, "word-break", "normal");
      important(last, "overflow-wrap", "normal");
      important(last, "writing-mode", "horizontal-tb");
    }
  }
}

export default function DuelRematchConsentBridge() {
  const [context, setContext] = useState<Context | null>(null);
  const [rematch, setRematch] = useState<RematchState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [startCountdown, setStartCountdown] = useState<number | null>(null);
  const navigationScheduled = useRef<string | null>(null);

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

  function scheduleAcceptedStart(result: RematchState, ctx: Context) {
    if (!result.token) return;
    const key = `${result.token}:${result.startsAt ?? "now"}`;
    if (navigationScheduled.current === key) return;
    navigationScheduled.current = key;

    const target = result.startsAt ? new Date(result.startsAt).getTime() : Date.now();
    const tick = () => setStartCountdown(Math.max(0, Math.ceil((target - Date.now()) / 1000)));
    tick();
    const countdownId = window.setInterval(tick, 100);
    const wait = Math.max(0, target - Date.now());
    window.setTimeout(() => {
      window.clearInterval(countdownId);
      setStartCountdown(0);
      window.location.replace(ctx.targetPath(result.token!));
    }, wait);
  }

  useEffect(() => {
    if (!context) { setRematch(null); return; }
    let cancelled = false;

    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch(context.endpoint, { cache: "no-store" });
        const result = await response.json() as RematchState;
        if (cancelled || !response.ok || !result.ok) return;
        setRematch(result);
        if (result.state === "accepted" && result.token) scheduleAcceptedStart(result, context);
      } catch { /* page stays usable */ }
    };

    void load();
    const id = window.setInterval(load, REMATCH_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
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
        setMessage("Rövanş kabul edildi. İki oyuncu birlikte başlıyor…");
        scheduleAcceptedStart(result, context);
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

  if (startCountdown !== null && rematch?.state === "accepted") {
    return (
      <div className="fixed inset-0 z-[360] flex items-center justify-center bg-[#07111f]/95 px-5 text-center text-white backdrop-blur-sm">
        <section className="w-full max-w-sm rounded-3xl border border-green-400/30 bg-[#101c2c] p-6 shadow-2xl">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-green-300">🔁 Rövanş kabul edildi</p>
          <h2 className="mt-2 text-2xl font-black">Maç birlikte başlıyor</h2>
          <div className="mt-5 text-6xl font-black tabular-nums text-green-300">{startCountdown}</div>
        </section>
      </div>
    );
  }

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
