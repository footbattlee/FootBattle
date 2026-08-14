"use client";

import Link from "next/link";
import { CalendarDays, Clock3, MapPin, Share2, Users } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

export default function HalisahaMacCreatePage() {
  const [title, setTitle] = useState("Cuma Halısaha");
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("22:00");
  const [location, setLocation] = useState("");
  const [targetPlayers, setTargetPlayers] = useState(10);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const minDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/halisaha-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          matchDate,
          matchTime,
          location,
          targetPlayers,
          note,
        }),
      });

      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        matchPath?: string;
      };

      if (!response.ok || !result.ok || !result.matchPath) {
        throw new Error(result.error || "Maç oluşturulamadı.");
      }

      window.location.href = result.matchPath;
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Maç oluşturulurken bir hata oluştu.",
      );
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/halisaha-kadro"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-400 transition hover:text-white"
          >
            ← Kadro
          </Link>
          <span className="text-lg font-black italic">
            Foot<span className="text-yellow-400">Battle</span>
          </span>
        </div>

        <section className="mt-6 overflow-hidden rounded-3xl border border-yellow-400/20 bg-[#0d1828] shadow-2xl shadow-black/20">
          <div className="border-b border-white/10 bg-gradient-to-br from-yellow-400/15 via-transparent to-green-400/10 p-5 sm:p-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-yellow-300">
              <Share2 size={14} /> Yeni sosyal özellik
            </span>
            <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
              Halısaha maçını oluştur,
              <span className="block text-yellow-400">katılımı tek linkten topla.</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
              WhatsApp grubunda “kim geliyor?” mesajı kaybolmasın. Maçı aç, linki gönder, herkes tek dokunuşla durumunu işaretlesin.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5 p-5 sm:p-7">
            <Field label="Maç adı">
              <input
                required
                maxLength={80}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3.5 outline-none transition focus:border-yellow-400/60"
                placeholder="Cuma Halısaha"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tarih" icon={<CalendarDays size={16} />}>
                <input
                  required
                  type="date"
                  min={minDate}
                  value={matchDate}
                  onChange={(event) => setMatchDate(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3.5 outline-none transition focus:border-yellow-400/60"
                />
              </Field>

              <Field label="Saat" icon={<Clock3 size={16} />}>
                <input
                  required
                  type="time"
                  value={matchTime}
                  onChange={(event) => setMatchTime(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3.5 outline-none transition focus:border-yellow-400/60"
                />
              </Field>
            </div>

            <Field label="Saha / konum" icon={<MapPin size={16} />}>
              <input
                maxLength={120}
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3.5 outline-none transition focus:border-yellow-400/60"
                placeholder="Bornova Arena Halısaha"
              />
            </Field>

            <Field label="Kaç kişi lazım?" icon={<Users size={16} />}>
              <div className="grid grid-cols-6 gap-2">
                {[5, 6, 7, 8, 10, 12].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setTargetPlayers(count)}
                    className={`min-h-12 rounded-xl border font-black transition ${
                      targetPlayers === count
                        ? "border-yellow-400 bg-yellow-400 text-[#07111f]"
                        : "border-white/10 bg-[#07111f] text-slate-300"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={5}
                max={22}
                value={targetPlayers}
                onChange={(event) => setTargetPlayers(Number(event.target.value))}
                className="mt-3 w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3.5 outline-none transition focus:border-yellow-400/60"
              />
            </Field>

            <Field label="Not">
              <textarea
                maxLength={300}
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="w-full resize-none rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3.5 outline-none transition focus:border-yellow-400/60"
                placeholder="Yelekler bende. 15 dk erken gelelim."
              />
            </Field>

            {error ? (
              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="min-h-14 w-full rounded-2xl bg-yellow-400 px-5 py-4 text-base font-black text-[#07111f] transition hover:bg-yellow-300 disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? "Maç oluşturuluyor..." : "⚽ Maçı Oluştur ve Linki Al"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-black text-slate-300">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}
