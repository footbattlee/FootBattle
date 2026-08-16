"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type SurvivorItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  kind: "player" | "team";
  completions: number;
  preview: Array<{ name: string; imageUrl: string | null }>;
};

export default function LocalizedSurvivorCatalogPage() {
  const params = useParams<{ locale: string }>();
  const locale = params.locale === "en" ? "en" : "tr";
  const en = locale === "en";
  const [items, setItems] = useState<SurvivorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/survivor?locale=${locale}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error ?? (en ? "Survivor list could not be loaded." : "Survivor listesi alınamadı."));
        setItems(result.items ?? []);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : (en ? "Survivor list could not be loaded." : "Survivor listesi alınamadı.")))
      .finally(() => setLoading(false));
  }, [en, locale]);

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="flex items-center justify-between gap-3">
          <Link href={`/${locale}`} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-400">← {en ? "Home" : "Ana Sayfa"}</Link>
          <div className="flex gap-1 rounded-xl border border-white/10 p-1 text-xs font-black">
            <Link href="/tr/survivor" className={`rounded-lg px-3 py-2 ${locale === "tr" ? "bg-green-500 text-[#07111f]" : "text-slate-400"}`}>🇹🇷 TR</Link>
            <Link href="/en/survivor" className={`rounded-lg px-3 py-2 ${locale === "en" ? "bg-green-500 text-[#07111f]" : "text-slate-400"}`}>🇬🇧 EN</Link>
          </div>
        </div>

        <header className="mt-7">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-300">{en ? "16-entry knockout arena" : "16'lı Eleme Arenası"}</p>
          <h1 className="mt-2 text-4xl font-black sm:text-6xl">👑 {en ? "Football Survivor" : "Survivor"}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">{en ? "Choose a bracket. First-round matchups are shuffled once, then your winners advance through a fixed path until one champion remains." : "Bir turnuva seç. İlk eşleşmeler rastgele kurulsun, kazananları sen belirle ve kendi şampiyonunu çıkar."}</p>
        </header>

        {loading && <p className="mt-8 text-slate-500">{en ? "Loading brackets..." : "Turnuvalar yükleniyor..."}</p>}
        {error && <p className="mt-8 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 font-bold text-red-200">{error}</p>}
        {!loading && !error && items.length === 0 && <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">{en ? "No Survivor brackets are live yet." : "Henüz yayınlanmış Survivor yok."}</div>}

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          {items.map((item) => (
            <Link key={item.id} href={`/${locale}/survivor/${item.slug}`} className="group overflow-hidden rounded-3xl border border-white/10 bg-[#0d1828] p-5 transition hover:-translate-y-1 hover:border-yellow-300/30 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-yellow-200">{item.kind === "player" ? (en ? "Players" : "Futbolcular") : (en ? "Teams" : "Takımlar")}</span>
                  <h2 className="mt-4 text-2xl font-black">{item.title}</h2>
                  <p className="mt-2 min-h-10 text-sm leading-5 text-slate-400">{item.description || (en ? "16 contenders. One champion." : "16 aday, tek şampiyon.")}</p>
                </div>
                <span className="text-3xl">🏆</span>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-2">
                {item.preview.map((entry, index) => (
                  <div key={`${entry.name}-${index}`} className="overflow-hidden rounded-2xl border border-white/10 bg-[#07111f]">
                    {entry.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.imageUrl} alt={entry.name} className="h-20 w-full object-cover object-top sm:h-24" />
                    ) : (
                      <div className="flex h-20 items-center justify-center text-2xl font-black text-slate-600 sm:h-24">{entry.name.slice(0, 1)}</div>
                    )}
                    <p className="truncate px-2 py-2 text-center text-[10px] font-black text-slate-300">{entry.name}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 text-xs font-bold">
                <span className="text-slate-500">✅ {item.completions} {en ? "completions" : "tamamlanma"}</span>
                <span className="text-yellow-200 transition group-hover:translate-x-1">{en ? "Start Bracket →" : "Turnuvayı Başlat →"}</span>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
