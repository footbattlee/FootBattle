"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type CreateResponse = {
  ok?: boolean;
  error?: string;
  challenge?: {
    sharePath?: string;
  };
};

export default function TicTacToeDuelLobbyPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createDuel() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/challenges/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameCode: "tic_tac_toe",
          challengerName: name.trim() || "FootBattle Oyuncusu",
        }),
      });
      const result = (await response.json()) as CreateResponse;
      if (!response.ok || !result.ok || !result.challenge?.sharePath) {
        throw new Error(result.error ?? "Düello oluşturulamadı.");
      }

      router.push(result.challenge.sharePath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Düello oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-400 transition hover:text-white">
            ← FootBattle
          </Link>
          <Link href="/tic-tac-toe" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-400 transition hover:text-white">
            Solo Oyna
          </Link>
        </div>

        <section className="mt-8 overflow-hidden rounded-3xl border border-yellow-400/20 bg-[#0d1828] shadow-2xl shadow-black/30">
          <div className="border-b border-white/10 bg-gradient-to-br from-yellow-400/[0.12] via-transparent to-green-400/[0.06] p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-300">Yeni Düello Modu</p>
            <h1 className="mt-3 text-4xl font-black sm:text-5xl">Tic Tac Toe’da arkadaşına meydan oku.</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
              İkiniz de aynı futbol gridini görürsünüz. 120 saniyede daha çok doğru hücreyi dolduran kazanır. Eşitlikte daha az yanlış ve daha hızlı bitirme öne geçirir.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <label className="text-sm font-black text-slate-300">Görünen adın</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={30}
              placeholder="Örn. Emre"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3 text-base font-bold outline-none transition focus:border-yellow-400/50"
            />

            {error && (
              <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">{error}</p>
            )}

            <button
              type="button"
              onClick={createDuel}
              disabled={loading}
              className="mt-6 w-full rounded-2xl bg-yellow-400 px-5 py-4 text-base font-black text-[#07111f] transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Düello hazırlanıyor..." : "⚔️ Düello Oluştur ve Linki Al"}
            </button>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Info icon="1️⃣" title="Linki gönder" text="Arkadaşın tek dokunuşla katılsın." />
              <Info icon="2️⃣" title="Aynı grid" text="İkiniz de aynı 3×3 soruları çözün." />
              <Info icon="3️⃣" title="Skor kapışması" text="Doğru, yanlış ve süre sonucu belirlesin." />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Info({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <span className="text-xl">{icon}</span>
      <p className="mt-2 font-black">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
    </div>
  );
}
