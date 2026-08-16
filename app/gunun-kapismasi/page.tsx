"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { faceoffSlug } from "@/lib/faceoff-seo";

type Choice = "left" | "right";
type FaceoffResponse = {
  ok?: boolean;
  available?: boolean;
  error?: string;
  faceoff?: {
    id: string;
    date: string;
    title: string;
    category: string;
    left: string;
    right: string;
  };
  voted?: boolean;
  choice?: Choice | null;
  results?: {
    left: number;
    right: number;
    total: number;
    leftPercent: number;
    rightPercent: number;
  } | null;
  rankReward?: {
    applied?: boolean;
    already_processed?: boolean;
    lp_change?: number;
    lp_after?: number;
  } | null;
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export default function GununKapismasiPage() {
  const [data, setData] = useState<FaceoffResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<Choice | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setLoading(true);
      const response = await fetch("/api/daily-faceoff", { cache: "no-store" });
      const result = (await response.json()) as FaceoffResponse;
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Kapışma yüklenemedi.");
      setData(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kapışma yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function vote(choice: Choice) {
    if (data?.voted || voting) return;
    setVoting(choice);
    setMessage("");
    try {
      const response = await fetch("/api/daily-faceoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice }),
      });
      const result = (await response.json()) as FaceoffResponse & { alreadyVoted?: boolean };
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Oy kaydedilemedi.");
      setData((current) => current ? {
        ...current,
        voted: true,
        choice: result.choice ?? choice,
        results: result.results ?? null,
        rankReward: result.rankReward ?? null,
      } : current);
      if (result.alreadyVoted) {
        setMessage("Oyunu daha önce kullanmışsın.");
      } else if (result.rankReward?.applied) {
        setMessage(`Oy kaydedildi. +${Number(result.rankReward.lp_change ?? 3)} LP kazandın. 🔥`);
      } else {
        setMessage("Oy kaydedildi. Arena sonucu açıldı. 🔥");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Oy kaydedilemedi.");
    } finally {
      setVoting(null);
    }
  }

  async function share() {
    if (!data?.faceoff || !data.results) return;
    const picked = data.choice === "left" ? data.faceoff.left : data.faceoff.right;
    const text = `⚔️ FootBattle Günün Kapışması\n${data.faceoff.left} 🆚 ${data.faceoff.right}\n\nBen ${picked} dedim. Sen kimi seçiyorsun?`;
    const slug = faceoffSlug({ match_date: data.faceoff.date, left_name: data.faceoff.left, right_name: data.faceoff.right });
    const url = `${window.location.origin}/gunun-kapismasi/${slug}?utm_source=share&utm_medium=faceoff&utm_campaign=gunun_kapismasi`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Günün Kapışması", text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setMessage("Kapışma linki kopyalandı ✓");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("Paylaşım açılamadı.");
    }
  }

  const faceoff = data?.faceoff;
  const results = data?.results;

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-6 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-[900px]">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-black text-slate-300">← Ana Sayfa</Link>
          <span className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-red-300">Her gün yeni eşleşme</span>
        </div>

        <section className="mt-7 text-center">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-300">⚔️ FootBattle Arena</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">Günün Kapışması</h1>
          <p className="mx-auto mt-3 max-w-[650px] text-sm leading-6 text-slate-400 sm:text-base">İki futbolcu, tek seçim. Oyunu kullan; sonra FootBattle topluluğunun ne dediğini gör.</p>
        </section>

        {loading && <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center font-bold text-slate-400">Bugünün kapışması hazırlanıyor...</div>}

        {!loading && data?.available === false && (
          <div className="mt-10 rounded-3xl border border-yellow-400/20 bg-yellow-400/[0.05] p-8 text-center">
            <p className="text-3xl">⏳</p>
            <h2 className="mt-3 text-2xl font-black">Bugünün kapışması henüz yayınlanmadı.</h2>
            <p className="mt-2 text-sm text-slate-400">Birazdan tekrar uğra.</p>
          </div>
        )}

        {!loading && faceoff && (
          <section className="mt-8 overflow-hidden rounded-[32px] border border-white/10 bg-[#081523] shadow-2xl">
            <div className="border-b border-white/10 px-5 py-4 text-center">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-300">{faceoff.category}</p>
              <p className="mt-1 text-sm font-bold text-slate-500">Bugün kimi seçiyorsun?</p>
            </div>

            <div className="relative grid md:grid-cols-2">
              <PlayerSide name={faceoff.left} side="left" selected={data.choice === "left"} disabled={Boolean(data.voted || voting)} loading={voting === "left"} percent={results?.leftPercent ?? null} votes={results?.left ?? null} onVote={vote} />
              <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-[#081523] bg-red-500 text-lg font-black shadow-xl">VS</div>
              <PlayerSide name={faceoff.right} side="right" selected={data.choice === "right"} disabled={Boolean(data.voted || voting)} loading={voting === "right"} percent={results?.rightPercent ?? null} votes={results?.right ?? null} onVote={vote} />
            </div>

            {data.voted && results && (
              <div className="border-t border-white/10 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3 text-sm font-black">
                  <span className="text-green-300">Toplam {results.total} oy</span>
                  <span className="text-slate-500">Yarın yeni kapışma</span>
                </div>
                <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="bg-green-400 transition-all" style={{ width: `${results.leftPercent}%` }} />
                  <div className="bg-purple-400 transition-all" style={{ width: `${results.rightPercent}%` }} />
                </div>
                {data.rankReward?.applied && (
                  <div className="mt-4 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.06] px-4 py-3 text-sm font-black text-yellow-200">
                    ⭐ +{Number(data.rankReward.lp_change ?? 3)} LP · Toplam {Number(data.rankReward.lp_after ?? 0)} LP
                  </div>
                )}
                <button type="button" onClick={() => void share()} className="mt-5 min-h-12 w-full rounded-xl bg-green-500 px-5 text-sm font-black text-[#07111f] transition hover:bg-green-400">📱 Kapışmayı Arkadaşına Gönder</button>
              </div>
            )}
          </section>
        )}

        {message && <p className="mt-4 text-center text-sm font-bold text-green-300">{message}</p>}
        <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-center text-xs leading-5 text-slate-500">Oyunu kullandıktan sonra yüzdeler açılır. Aynı hesap veya cihaz bugünün kapışmasında yalnızca bir kez oy kullanabilir.</div>
      </div>
    </main>
  );
}

function PlayerSide({ name, side, selected, disabled, loading, percent, votes, onVote }: {
  name: string;
  side: Choice;
  selected: boolean;
  disabled: boolean;
  loading: boolean;
  percent: number | null;
  votes: number | null;
  onVote: (choice: Choice) => Promise<void>;
}) {
  return (
    <button type="button" disabled={disabled} onClick={() => void onVote(side)} className={`group flex min-h-[300px] flex-col items-center justify-center p-8 text-center transition sm:min-h-[370px] ${side === "left" ? "bg-green-400/[0.035] hover:bg-green-400/[0.08]" : "bg-purple-400/[0.035] hover:bg-purple-400/[0.08]"} ${selected ? "ring-2 ring-inset ring-yellow-300/70" : ""} disabled:cursor-default`}>
      <div className={`flex h-28 w-28 items-center justify-center rounded-full border text-4xl font-black shadow-2xl sm:h-36 sm:w-36 sm:text-5xl ${side === "left" ? "border-green-400/30 bg-green-400/10 text-green-200" : "border-purple-400/30 bg-purple-400/10 text-purple-200"}`}>{initials(name)}</div>
      <h2 className="mt-6 text-2xl font-black sm:text-3xl">{name}</h2>
      {percent === null ? (
        <span className={`mt-5 rounded-xl px-5 py-3 text-sm font-black ${side === "left" ? "bg-green-500 text-[#07111f]" : "bg-purple-500 text-white"}`}>{loading ? "Oy kaydediliyor..." : "Bunu Seç"}</span>
      ) : (
        <div className="mt-5">
          <p className="text-4xl font-black">%{percent}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{votes ?? 0} oy {selected ? "· Senin seçimin ✓" : ""}</p>
        </div>
      )}
    </button>
  );
}
