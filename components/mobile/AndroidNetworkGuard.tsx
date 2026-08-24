"use client";

import { Capacitor } from "@capacitor/core";
import { useEffect, useRef, useState } from "react";

const PROBE_TIMEOUT_MS = 5000;

async function canReachApp() {
  if (!navigator.onLine) return false;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const response = await fetch("/api/health", {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

export default function AndroidNetworkGuard() {
  const [offline, setOffline] = useState(false);
  const [checking, setChecking] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;

    async function update(forceProbe = false) {
      if (!navigator.onLine) {
        wasOffline.current = true;
        if (active) setOffline(true);
        return;
      }

      if (!forceProbe && !wasOffline.current) {
        if (active) setOffline(false);
        return;
      }

      if (active) setChecking(true);
      const reachable = await canReachApp();
      if (!active) return;
      setChecking(false);
      setOffline(!reachable);
      if (reachable) wasOffline.current = false;
    }

    void update(true);
    const online = () => void update(true);
    const offlineHandler = () => void update(false);
    const visibility = () => {
      if (document.visibilityState === "visible") void update(wasOffline.current);
    };
    const pageshow = () => void update(wasOffline.current);

    window.addEventListener("online", online);
    window.addEventListener("offline", offlineHandler);
    window.addEventListener("pageshow", pageshow);
    document.addEventListener("visibilitychange", visibility);

    return () => {
      active = false;
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offlineHandler);
      window.removeEventListener("pageshow", pageshow);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  if (!Capacitor.isNativePlatform() || !offline) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#07111f] px-5 text-white">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#101c2c] p-6 text-center shadow-2xl">
        <div className="text-4xl">📡</div>
        <h2 className="mt-4 text-xl font-black">İnternet bağlantısı yok</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          FootBattle oyunları, Ranked ve düellolar için bağlantı gerekiyor. İnternet geri geldiğinde kaldığın ekrandan devam etmeyi deneyeceğiz.
        </p>
        <button
          type="button"
          disabled={checking}
          onClick={async () => {
            setChecking(true);
            const reachable = await canReachApp();
            setChecking(false);
            if (reachable) {
              wasOffline.current = false;
              setOffline(false);
              window.dispatchEvent(new Event("footbattle:network-restored"));
            }
          }}
          className="mt-5 min-h-12 w-full rounded-xl bg-green-500 px-4 font-black text-[#07111f] disabled:opacity-60"
        >
          {checking ? "Bağlantı kontrol ediliyor..." : "Tekrar Dene"}
        </button>
      </div>
    </div>
  );
}
