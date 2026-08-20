"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/config";

type Duel = { id: number; gameCode: string; gameLabel: string; status: string; otherPlayer?: { displayName?: string } | null; myScore?: number; opponentScore?: number };
type Data = { ok?: boolean; error?: string; summary?: { incomingCount?: number; activeCount?: number; historyCount?: number; wins?: number }; incoming?: Duel[]; active?: Duel[]; history?: Duel[] };

export default function MobileDuelsPage({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/duels", { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, body: (await response.json()) as Data }))
      .then(({ ok, body }) => setData(ok ? body : { ok: false, error: body.error }))
      .catch(() => setData({ ok: false }))
      .finally(() => setLoading(false));
  }, []);

  const active = data?.active ?? [];
  const incoming = data?.incoming ?? [];
  const history = data?.history ?? [];

  return (
    <main className="min-h-screen bg-[#07111f] px-4 pb-24 pt-6 text-white">
      <div className="mx-auto max-w-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-green-300">⚔️ FootBattle Arena</p>
        <h1 className="mt-2 text-3xl font-black">{tr ? "Düello" : "Duel"}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">{tr ? "Bir oyun seç, arkadaşına meydan oku ve linki gönder." : "Choose a game, challenge a friend and send the link."}</p>

        <section className="mt-5 grid gap-3">
          <DuelMode icon="⭕" title="Tic Tac Toe" text={tr ? "Aynı 3×3 grid, aynı 120 saniye." : "Same 3×3 grid, same 120 seconds."} href="/tic-tac-toe/duel" button={tr ? "Düello Başlat" : "Start Duel"} />
          <DuelMode icon="⚽" title={tr ? "2 Takım 1 Oyuncu" : "2 Clubs 1 Player"} text={tr ? "Ortak futbolcuyu rakibinden önce bul." : "Find the shared player before your rival."} href="/duels/challenge?game=club_clash" button={tr ? "Düello Gönder" : "Send Challenge"} />
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between"><h2 className="text-lg font-black">{tr ? "Düellolarım" : "My duels"}</h2>{data?.ok ? <span className="text-[10px] font-bold text-slate-500">{Number(data.summary?.wins ?? 0)} {tr ? "galibiyet" : "wins"}</span> : null}</div>

          {loading ? <p className="mt-3 rounded-2xl border border-white/10 p-4 text-sm text-slate-500">{tr ? "Yükleniyor..." : "Loading..."}</p> : !data?.ok ? (
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center"><p className="text-sm font-bold text-slate-400">{tr ? "Davetlerini ve aktif düellolarını görmek için giriş yap." : "Sign in to see invites and active duels."}</p><Link href="/login" className="mt-4 inline-flex rounded-xl bg-green-500 px-5 py-3 text-sm font-black text-[#07111f]">{tr ? "Giriş Yap" : "Sign In"}</Link></div>
          ) : (
            <div className="mt-3 space-y-5">
              <DuelSection title={tr ? "Aktif" : "Active"} items={active} empty={tr ? "Aktif düellon yok." : "No active duels."} tr={tr} />
              <DuelSection title={tr ? "Gelen Davetler" : "Incoming"} items={incoming} empty={tr ? "Bekleyen davetin yok." : "No pending invites."} tr={tr} />
              <DuelSection title={tr ? "Geçmiş" : "History"} items={history.slice(0, 5)} empty={tr ? "Henüz düello geçmişin yok." : "No duel history yet."} tr={tr} muted />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function DuelMode({ icon, title, text, href, button }: { icon: string; title: string; text: string; href: string; button: string }) {
  return <article className="rounded-2xl border border-green-400/15 bg-white/[0.035] p-4"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 text-2xl">{icon}</div><div className="min-w-0 flex-1"><h2 className="font-black">{title}</h2><p className="mt-1 text-[11px] leading-4 text-slate-500">{text}</p></div></div><Link href={href} className="mt-3 flex min-h-11 items-center justify-center rounded-xl bg-green-500 px-4 text-sm font-black text-[#07111f]">{button} →</Link></article>;
}

function DuelSection({ title, items, empty, tr, muted = false }: { title: string; items: Duel[]; empty: string; tr: boolean; muted?: boolean }) {
  return <div><div className="flex items-center gap-2"><h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{title}</h3>{items.length ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-black">{items.length}</span> : null}</div><div className="mt-2 space-y-2">{items.length ? items.map((duel) => <Link key={duel.id} href={`/duels/${duel.id}`} className={`flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] px-3.5 py-3 ${muted ? "bg-white/[0.02]" : "bg-white/[0.04]"}`}><div className="min-w-0"><p className="truncate text-sm font-black">{duel.otherPlayer?.displayName ?? (tr ? "Rakip" : "Opponent")}</p><p className="mt-1 truncate text-[10px] text-slate-500">{duel.gameLabel || duel.gameCode}</p></div><div className="shrink-0 text-right"><p className="text-xs font-black text-green-300">{Number(duel.myScore ?? 0)} - {Number(duel.opponentScore ?? 0)}</p><p className="mt-1 text-[9px] text-slate-600">{duel.status}</p></div></Link>) : <p className="rounded-xl border border-dashed border-white/[0.07] px-3 py-3 text-[11px] text-slate-600">{empty}</p>}</div></div>;
}
