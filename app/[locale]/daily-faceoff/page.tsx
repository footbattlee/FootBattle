"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { faceoffSlug } from "@/lib/faceoff-seo";

type Choice = "left" | "right";
type FaceoffResponse = {
  ok?: boolean; available?: boolean; error?: string;
  faceoff?: { id: string; date: string; title: string; category: string; left: string; right: string };
  voted?: boolean; choice?: Choice | null;
  results?: { left: number; right: number; total: number; leftPercent: number; rightPercent: number } | null;
  rankReward?: { applied?: boolean; lp_change?: number; lp_after?: number } | null;
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export default function LocalizedDailyFaceoffPage() {
  const params = useParams<{ locale: string }>();
  const locale = params.locale === "en" ? "en" : "tr";
  const en = locale === "en";
  const [data, setData] = useState<FaceoffResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<Choice | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/daily-faceoff", { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as FaceoffResponse;
        if (!response.ok || !result.ok) throw new Error(result.error ?? (en ? "Faceoff could not be loaded." : "Kapışma yüklenemedi."));
        setData(result);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : (en ? "Faceoff could not be loaded." : "Kapışma yüklenemedi.")))
      .finally(() => setLoading(false));
  }, [en]);

  async function vote(choice: Choice) {
    if (data?.voted || voting) return;
    setVoting(choice);
    setMessage("");
    try {
      const response = await fetch("/api/daily-faceoff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ choice }) });
      const result = (await response.json()) as FaceoffResponse & { alreadyVoted?: boolean };
      if (!response.ok || !result.ok) throw new Error(result.error ?? (en ? "Vote could not be saved." : "Oy kaydedilemedi."));
      setData((current) => current ? { ...current, voted: true, choice: result.choice ?? choice, results: result.results ?? null, rankReward: result.rankReward ?? null } : current);
      if (result.alreadyVoted) setMessage(en ? "You already voted in today's faceoff." : "Oyunu daha önce kullanmışsın.");
      else if (result.rankReward?.applied) setMessage(en ? `Vote saved. +${Number(result.rankReward.lp_change ?? 3)} LP earned. 🔥` : `Oy kaydedildi. +${Number(result.rankReward.lp_change ?? 3)} LP kazandın. 🔥`);
      else setMessage(en ? "Vote saved. Community results unlocked. 🔥" : "Oy kaydedildi. Arena sonucu açıldı. 🔥");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (en ? "Vote could not be saved." : "Oy kaydedilemedi."));
    } finally { setVoting(null); }
  }

  async function share() {
    if (!data?.faceoff || !data.results) return;
    const picked = data.choice === "left" ? data.faceoff.left : data.faceoff.right;
    const text = en
      ? `⚔️ FootBattle Daily Faceoff\n${data.faceoff.left} 🆚 ${data.faceoff.right}\n\nI picked ${picked}. Who are you taking?`
      : `⚔️ FootBattle Günün Kapışması\n${data.faceoff.left} 🆚 ${data.faceoff.right}\n\nBen ${picked} dedim. Sen kimi seçiyorsun?`;
    const slug = faceoffSlug({ match_date: data.faceoff.date, left_name: data.faceoff.left, right_name: data.faceoff.right });
    const url = `${window.location.origin}/${locale}/daily-faceoff/${slug}?utm_source=share&utm_medium=faceoff`;
    try {
      if (navigator.share) await navigator.share({ title: en ? "Daily Faceoff" : "Günün Kapışması", text, url });
      else { await navigator.clipboard.writeText(`${text}\n${url}`); setMessage(en ? "Faceoff link copied ✓" : "Kapışma linki kopyalandı ✓"); }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage(en ? "Share sheet could not be opened." : "Paylaşım açılamadı.");
    }
  }

  const faceoff = data?.faceoff;
  const results = data?.results;

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-6 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-[900px]">
        <div className="flex items-center justify-between gap-3">
          <Link href={`/${locale}`} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-black text-slate-300">← {en ? "Home" : "Ana Sayfa"}</Link>
          <div className="flex gap-1 rounded-xl border border-white/10 p-1 text-xs font-black">
            <Link href="/tr/daily-faceoff" className={`rounded-lg px-3 py-2 ${locale === "tr" ? "bg-green-500 text-[#07111f]" : "text-slate-400"}`}>🇹🇷 TR</Link>
            <Link href="/en/daily-faceoff" className={`rounded-lg px-3 py-2 ${locale === "en" ? "bg-green-500 text-[#07111f]" : "text-slate-400"}`}>🇬🇧 EN</Link>
          </div>
        </div>

        <section className="mt-7 text-center">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-300">⚔️ FootBattle Arena</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">{en ? "Daily Faceoff" : "Günün Kapışması"}</h1>
          <p className="mx-auto mt-3 max-w-[650px] text-sm leading-6 text-slate-400 sm:text-base">{en ? "Two footballers, one choice. Vote first, then see what the FootBattle community thinks." : "İki futbolcu, tek seçim. Oyunu kullan; sonra FootBattle topluluğunun ne dediğini gör."}</p>
        </section>

        {loading && <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center font-bold text-slate-400">{en ? "Preparing today's faceoff..." : "Bugünün kapışması hazırlanıyor..."}</div>}
        {!loading && data?.available === false && <div className="mt-10 rounded-3xl border border-yellow-400/20 bg-yellow-400/[0.05] p-8 text-center"><p className="text-3xl">⏳</p><h2 className="mt-3 text-2xl font-black">{en ? "Today's faceoff is not live yet." : "Bugünün kapışması henüz yayınlanmadı."}</h2></div>}

        {!loading && faceoff && (
          <section className="mt-8 overflow-hidden rounded-[32px] border border-white/10 bg-[#081523] shadow-2xl">
            <div className="border-b border-white/10 px-5 py-4 text-center"><p className="text-xs font-black uppercase tracking-[0.2em] text-purple-300">{faceoff.category}</p><p className="mt-1 text-sm font-bold text-slate-500">{en ? "Who are you picking today?" : "Bugün kimi seçiyorsun?"}</p></div>
            <div className="relative grid md:grid-cols-2">
              <PlayerSide name={faceoff.left} side="left" selected={data.choice === "left"} disabled={Boolean(data.voted || voting)} loading={voting === "left"} percent={results?.leftPercent ?? null} votes={results?.left ?? null} onVote={vote} en={en} />
              <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-[#081523] bg-red-500 text-lg font-black shadow-xl">VS</div>
              <PlayerSide name={faceoff.right} side="right" selected={data.choice === "right"} disabled={Boolean(data.voted || voting)} loading={voting === "right"} percent={results?.rightPercent ?? null} votes={results?.right ?? null} onVote={vote} en={en} />
            </div>
            {data.voted && results && <div className="border-t border-white/10 p-5 sm:p-6"><div className="flex items-center justify-between gap-3 text-sm font-black"><span className="text-green-300">{en ? `${results.total} total votes` : `Toplam ${results.total} oy`}</span><span className="text-slate-500">{en ? "New faceoff tomorrow" : "Yarın yeni kapışma"}</span></div><div className="mt-4 flex h-3 overflow-hidden rounded-full bg-white/10"><div className="bg-green-400 transition-all" style={{ width: `${results.leftPercent}%` }} /><div className="bg-purple-400 transition-all" style={{ width: `${results.rightPercent}%` }} /></div>{data.rankReward?.applied && <div className="mt-4 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.06] px-4 py-3 text-sm font-black text-yellow-200">⭐ +{Number(data.rankReward.lp_change ?? 3)} LP · {Number(data.rankReward.lp_after ?? 0)} LP</div>}<button type="button" onClick={() => void share()} className="mt-5 min-h-12 w-full rounded-xl bg-green-500 px-5 text-sm font-black text-[#07111f]">📱 {en ? "Share This Faceoff" : "Kapışmayı Arkadaşına Gönder"}</button></div>}
          </section>
        )}
        {message && <p className="mt-4 text-center text-sm font-bold text-green-300">{message}</p>}
      </div>
    </main>
  );
}

function PlayerSide({ name, side, selected, disabled, loading, percent, votes, onVote, en }: { name: string; side: Choice; selected: boolean; disabled: boolean; loading: boolean; percent: number | null; votes: number | null; onVote: (choice: Choice) => Promise<void>; en: boolean }) {
  return <button type="button" disabled={disabled} onClick={() => void onVote(side)} className={`group flex min-h-[300px] flex-col items-center justify-center p-8 text-center transition sm:min-h-[370px] ${side === "left" ? "bg-green-400/[0.035]" : "bg-purple-400/[0.035]"} ${selected ? "ring-2 ring-inset ring-yellow-300/70" : ""}`}><div className={`flex h-28 w-28 items-center justify-center rounded-full border text-4xl font-black sm:h-36 sm:w-36 sm:text-5xl ${side === "left" ? "border-green-400/30 bg-green-400/10 text-green-200" : "border-purple-400/30 bg-purple-400/10 text-purple-200"}`}>{initials(name)}</div><h2 className="mt-6 text-2xl font-black sm:text-3xl">{name}</h2>{percent === null ? <span className={`mt-5 rounded-xl px-5 py-3 text-sm font-black ${side === "left" ? "bg-green-500 text-[#07111f]" : "bg-purple-500 text-white"}`}>{loading ? (en ? "Saving vote..." : "Oy kaydediliyor...") : (en ? "Pick This" : "Bunu Seç")}</span> : <div className="mt-5"><p className="text-4xl font-black">%{percent}</p><p className="mt-1 text-xs font-bold text-slate-500">{votes ?? 0} {en ? "votes" : "oy"} {selected ? "· ✓" : ""}</p></div>}</button>;
}
