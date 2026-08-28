"use client";

import { useCallback, useEffect, useState } from "react";

type Presence = {
  activeUsers: number;
  authenticatedUsers: number;
  guestUsers: number;
  windowMinutes: number;
  measuredAt: string;
};

type PresenceResponse = {
  ok?: boolean;
  error?: string;
  presence?: Presence;
};

const EMPTY_PRESENCE: Presence = {
  activeUsers: 0,
  authenticatedUsers: 0,
  guestUsers: 0,
  windowMinutes: 5,
  measuredAt: "",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

export default function ActivePresenceCards() {
  const [presence, setPresence] = useState(EMPTY_PRESENCE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPresence = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/presence", { cache: "no-store" });
      const result = (await response.json()) as PresenceResponse;
      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "Aktif kullanıcı verisi alınamadı.");
      }
      setPresence(result.presence ?? EMPTY_PRESENCE);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aktif kullanıcı verisi alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPresence();
    const timer = window.setInterval(() => void loadPresence(), 30_000);
    return () => window.clearInterval(timer);
  }, [loadPresence]);

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Canlı Kullanıcılar</p>
          <p className="mt-1 text-xs text-slate-500">Son {presence.windowMinutes} dakikadaki gerçek kullanıcı hareketi · 30 sn'de bir yenilenir</p>
        </div>
        {error ? <p className="text-xs font-bold text-red-300">{error}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <PresenceCard
          label="Aktif Kullanıcı"
          value={formatNumber(presence.authenticatedUsers)}
          detail="Giriş yapmış benzersiz kullanıcı"
          icon="🟢"
          loading={loading}
        />
        <PresenceCard
          label="Guest Kullanıcı"
          value={formatNumber(presence.guestUsers)}
          detail="Benzersiz guest cihaz / oturum kimliği"
          icon="👻"
          loading={loading}
        />
      </div>
    </section>
  );
}

function PresenceCard({
  label,
  value,
  detail,
  icon,
  loading,
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.045] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-black text-white">{loading ? "..." : value}</p>
          <p className="mt-2 text-xs text-slate-500">{detail}</p>
        </div>
        <span className="text-xl" aria-hidden="true">{icon}</span>
      </div>
    </div>
  );
}
