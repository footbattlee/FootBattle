"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const SITE = "https://playfootbattle.com";

type RangeKey = "today" | "7d" | "30d" | "all";
type Channel = {
  source: string;
  medium: string;
  campaign: string;
  started: number;
  completed: number;
  shared: number;
  events: number;
  completionRate: number;
};

type ResponseData = { ok?: boolean; error?: string; channels?: Channel[] };

const links = [
  { label: "Reddit launch", url: `${SITE}/en/reddit?utm_source=reddit&utm_medium=social&utm_campaign=global_launch&utm_content=SUBREDDIT` },
  { label: "Instagram bio", url: `${SITE}/tr?utm_source=instagram&utm_medium=social&utm_campaign=organic_social&utm_content=instagram_bio` },
  { label: "YouTube bio", url: `${SITE}/tr?utm_source=youtube&utm_medium=video&utm_campaign=organic_social&utm_content=youtube_bio` },
  { label: "English Instagram", url: `${SITE}/en?utm_source=instagram&utm_medium=social&utm_campaign=global_launch&utm_content=instagram_en` },
] as const;

export default function AdminTrafficPage() {
  const [range, setRange] = useState<RangeKey>("7d");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/admin/traffic?range=${range}`, { cache: "no-store" });
        const result = (await response.json()) as ResponseData;
        if (!response.ok || !result.ok) throw new Error(result.error ?? "Trafik raporu yüklenemedi.");
        if (!cancelled) setChannels(result.channels ?? []);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Trafik raporu yüklenemedi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [range]);

  async function copy(label: string, url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1500);
  }

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-7 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/admin" className="text-sm font-black text-slate-400">← Admin Panel</Link>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">📣 Trafik & Kampanya</h1>
            <p className="mt-2 text-sm text-slate-400">Reddit, Instagram, YouTube ve paylaşım trafiğinin oyuna dönüşümünü takip et.</p>
          </div>
          <Link href="/admin/analytics" className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-green-300">Oyun Raporları →</Link>
        </div>

        <section className="mt-7 rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
          <h2 className="text-xl font-black">Kampanya linkleri</h2>
          <p className="mt-1 text-xs text-slate-500">Reddit'te SUBREDDIT kısmını örn. rsoccer olarak değiştir.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {links.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/[0.08] bg-[#081523] p-4">
                <p className="text-sm font-black">{item.label}</p>
                <p className="mt-2 break-all text-xs leading-5 text-slate-500">{item.url}</p>
                <button onClick={() => void copy(item.label, item.url)} className="mt-3 rounded-lg bg-green-500 px-3 py-2 text-xs font-black text-[#07111f]">
                  {copied === item.label ? "Kopyalandı ✓" : "Linki Kopyala"}
                </button>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-7 flex flex-wrap gap-2">
          {(["today", "7d", "30d", "all"] as RangeKey[]).map((key) => (
            <button key={key} onClick={() => setRange(key)} className={`rounded-xl border px-4 py-2 text-sm font-black ${range === key ? "border-green-400 bg-green-500 text-[#07111f]" : "border-white/10 text-slate-400"}`}>
              {key === "today" ? "Bugün" : key === "7d" ? "Son 7 Gün" : key === "30d" ? "Son 30 Gün" : "Tümü"}
            </button>
          ))}
        </div>

        <section className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
          <div className="border-b border-white/10 p-5"><h2 className="text-xl font-black">Kanal performansı</h2><p className="mt-1 text-xs text-slate-500">Last-touch attribution bazlıdır; event metadata içinde first-touch da saklanır.</p></div>
          {loading && <p className="p-6 text-slate-400">Yükleniyor...</p>}
          {error && <p className="p-6 font-bold text-red-300">{error}</p>}
          {!loading && !error && channels.length === 0 && <p className="p-6 text-slate-400">Henüz UTM kaynaklı oyun verisi yok.</p>}
          {!loading && channels.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-white/[0.035] text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-4">Kaynak</th><th className="p-4">Kampanya</th><th className="p-4">Başlatma</th><th className="p-4">Tamamlama</th><th className="p-4">Paylaşım</th><th className="p-4">Tamamlama %</th></tr></thead>
                <tbody>{channels.map((row) => <tr key={`${row.source}-${row.medium}-${row.campaign}`} className="border-t border-white/[0.06]"><td className="p-4"><p className="font-black">{row.source}</p><p className="text-xs text-slate-500">{row.medium}</p></td><td className="p-4 font-bold text-slate-300">{row.campaign}</td><td className="p-4 text-xl font-black">{row.started}</td><td className="p-4 text-xl font-black text-green-300">{row.completed}</td><td className="p-4 text-xl font-black text-cyan-300">{row.shared}</td><td className="p-4 text-xl font-black text-yellow-300">%{row.completionRate}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
