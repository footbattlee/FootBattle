"use client";

import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  MapPin,
  Meh,
  Scale,
  Share2,
  ThumbsDown,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { MatchRow, MatchRsvpRow, MatchStatus } from "@/lib/halisaha/match";

type MatchResponse = {
  ok?: boolean;
  error?: string;
  match?: MatchRow;
  rsvps?: MatchRsvpRow[];
};

const PARTICIPANT_KEY = "footbattle-halisaha-participant-token";

function getParticipantToken() {
  const current = window.localStorage.getItem(PARTICIPANT_KEY);
  if (current) return current;
  const next = crypto.randomUUID().replace(/-/g, "");
  window.localStorage.setItem(PARTICIPANT_KEY, next);
  return next;
}

export default function MatchRsvpClient({ id }: { id: string }) {
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [rsvps, setRsvps] = useState<MatchRsvpRow[]>([]);
  const [playerName, setPlayerName] = useState("");
  const [participantToken, setParticipantToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadMatch() {
    try {
      const response = await fetch(`/api/halisaha-matches/${id}`, { cache: "no-store" });
      const result = (await response.json()) as MatchResponse;
      if (!response.ok || !result.ok || !result.match) {
        throw new Error(result.error || "Maç bulunamadı.");
      }
      setMatch(result.match);
      setRsvps(result.rsvps ?? []);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Maç yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = getParticipantToken();
    setParticipantToken(token);
    void loadMatch();
  }, [id]);

  useEffect(() => {
    if (!participantToken) return;
    const mine = rsvps.find((item) => item.participant_token === participantToken);
    if (mine && !playerName) setPlayerName(mine.player_name);
  }, [participantToken, rsvps, playerName]);

  const groups = useMemo(
    () => ({
      yes: rsvps.filter((item) => item.status === "yes"),
      maybe: rsvps.filter((item) => item.status === "maybe"),
      no: rsvps.filter((item) => item.status === "no"),
    }),
    [rsvps],
  );

  async function respond(status: MatchStatus) {
    const name = playerName.trim();
    if (!name) {
      setMessage("Önce adını yaz reis 🙂");
      return;
    }
    if (!participantToken) {
      setMessage("Katılımcı kimliği hazırlanamadı. Sayfayı yenileyip tekrar dene.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/halisaha-matches/${id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantToken, playerName: name, status }),
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Katılım kaydedilemedi.");
      }
      setMessage(
        status === "yes"
          ? "Tamamdır, kadrodasın! ⚽"
          : status === "maybe"
            ? "Seni kararsızlara yazdık."
            : "Tamamdır, bu maç yoksun.",
      );
      await loadMatch();
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "Katılım kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function shareMatch() {
    const url = window.location.href;
    const text = match
      ? `⚽ ${match.title} — ${formatDate(match.match_date)} ${match.match_time.slice(0, 5)}. Geliyor musun?`
      : "Halısaha maçına geliyor musun?";

    if (navigator.share) {
      try {
        await navigator.share({ title: match?.title || "Halısaha Maçı", text, url });
        return;
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      }
    }

    await navigator.clipboard.writeText(url);
    setMessage("Maç linki panoya kopyalandı!");
  }

  function openSquadBuilder() {
    if (!match || groups.yes.length < 5) return;
    const players = groups.yes.slice(0, 11).map((item) => item.player_name);
    const payload = {
      squadName: match.title,
      playerCount: Math.min(11, Math.max(5, players.length)),
      players,
      bodyColor: "#c8101e",
      sleeveColor: "#ffffff",
      tactic: "balanced",
      positions: [],
      drawings: [],
    };
    const encoded = window.btoa(encodeURIComponent(JSON.stringify(payload)));
    window.location.href = `/halisaha-kadro?kadro=${encoded}`;
  }

  if (loading) {
    return <main className="min-h-screen bg-[#07111f] p-8 text-center text-slate-400">Maç yükleniyor...</main>;
  }

  if (!match) {
    return (
      <main className="min-h-screen bg-[#07111f] px-4 py-8 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-400/20 bg-red-500/10 p-8 text-center">
          <h1 className="text-2xl font-black">Maç bulunamadı</h1>
          <p className="mt-2 text-sm text-red-200/80">{error}</p>
          <Link href="/halisaha-mac" className="mt-5 inline-flex rounded-xl bg-white px-5 py-3 font-black text-[#07111f]">Yeni maç oluştur</Link>
        </div>
      </main>
    );
  }

  const missing = Math.max(0, match.target_players - groups.yes.length);
  const progress = Math.min(100, Math.round((groups.yes.length / match.target_players) * 100));

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between gap-3">
          <Link href="/halisaha-kadro" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-400">← FootBattle</Link>
          <button type="button" onClick={() => void shareMatch()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-[#07111f]">
            <Share2 size={17} /> Paylaş
          </button>
        </header>

        <section className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-[#0d1828] shadow-2xl shadow-black/20">
          <div className="bg-gradient-to-br from-green-400/15 via-transparent to-yellow-400/10 p-5 sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-green-400">Halısaha maçı</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">{match.title}</h1>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Info icon={<CalendarDays size={17} />} text={formatDate(match.match_date)} />
              <Info icon={<Clock3 size={17} />} text={match.match_time.slice(0, 5)} />
              <Info icon={<MapPin size={17} />} text={match.location || "Konum belirtilmedi"} />
            </div>
            {match.note ? <p className="mt-4 rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm leading-6 text-slate-300">{match.note}</p> : null}
          </div>
          <div className="border-t border-white/10 p-5 sm:p-7">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-400">Kadro durumu</p>
                <p className="mt-1 text-3xl font-black">{groups.yes.length}<span className="text-slate-600">/{match.target_players}</span></p>
              </div>
              <p className={`text-right text-sm font-black ${missing === 0 ? "text-green-400" : "text-yellow-300"}`}>{missing === 0 ? "Kadro tamam 🔥" : `${missing} kişi daha lazım`}</p>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-green-400" style={{ width: `${progress}%` }} /></div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-yellow-400/20 bg-[#0d1828] p-5 sm:p-7">
          <h2 className="text-xl font-black">Geliyor musun?</h2>
          <p className="mt-1 text-sm text-slate-400">İsmin sadece görünen adın. Aynı isimde iki kişi olabilir; cihaz kimliğin kendi cevabını günceller.</p>
          <input value={playerName} maxLength={40} onChange={(event) => setPlayerName(event.target.value)} placeholder="Adın" className="mt-5 min-h-13 w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3.5 text-base outline-none focus:border-yellow-400/60" />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <RsvpButton disabled={saving} className="bg-green-400 text-[#07111f]" onClick={() => void respond("yes")} icon={<CheckCircle2 size={19} />} label="Geliyorum" />
            <RsvpButton disabled={saving} className="bg-yellow-400 text-[#07111f]" onClick={() => void respond("maybe")} icon={<Meh size={19} />} label="Belki" />
            <RsvpButton disabled={saving} className="bg-red-400 text-[#07111f]" onClick={() => void respond("no")} icon={<ThumbsDown size={19} />} label="Yokum" />
          </div>
          {message ? <p className="mt-3 text-sm font-bold text-yellow-200">{message}</p> : null}
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-3">
          <RosterCard title="Geliyor" emoji="✅" items={groups.yes} />
          <RosterCard title="Belki" emoji="🤔" items={groups.maybe} />
          <RosterCard title="Yok" emoji="❌" items={groups.no} />
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-2">
          <button type="button" disabled={groups.yes.length < 5} onClick={openSquadBuilder} className="min-h-14 rounded-2xl bg-green-400 px-5 py-4 font-black text-[#07111f] disabled:opacity-40">
            <Users className="mr-2 inline" size={18} /> {groups.yes.length < 5 ? `${5 - groups.yes.length} kişi daha lazım` : "Katılanları Kadroya Aktar"}
          </button>
          <Link href={`/halisaha-mac/${id}/takimlar`} className={`flex min-h-14 items-center justify-center rounded-2xl border border-yellow-400/30 px-5 py-4 font-black text-yellow-300 ${groups.yes.length < 4 ? "pointer-events-none opacity-40" : ""}`}>
            <Scale className="mr-2" size={18} /> Takımları Dengele
          </Link>
        </section>

        <button type="button" onClick={() => void shareMatch()} className="mb-10 mt-5 flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#0d1828] px-5 py-4 font-black">
          <Copy size={18} /> Maç Linkini Paylaş
        </button>
      </div>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "numeric", month: "long" }).format(new Date(`${value}T12:00:00`));
}

function Info({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm font-bold text-slate-200"><span className="text-yellow-300">{icon}</span><span className="min-w-0 truncate">{text}</span></div>;
}

function RsvpButton({ disabled, onClick, icon, label, className }: { disabled: boolean; onClick: () => void; icon: React.ReactNode; label: string; className: string }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 px-2 py-3 text-xs font-black sm:flex-row sm:text-sm ${className} disabled:opacity-50`}>{icon}{label}</button>;
}

function RosterCard({ title, emoji, items }: { title: string; emoji: string; items: MatchRsvpRow[] }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0d1828] p-4">
      <div className="flex items-center justify-between gap-3"><h3 className="font-black">{emoji} {title}</h3><span className="rounded-full bg-white/5 px-2 py-1 text-xs font-black text-slate-400">{items.length}</span></div>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-slate-600">Henüz kimse yok</p> : items.map((item, index) => (
          <div key={item.id} className="flex items-center gap-2 rounded-xl bg-black/10 px-3 py-2.5 text-sm font-bold"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-xs text-slate-500">{index + 1}</span><span className="truncate">{item.player_name}</span></div>
        ))}
      </div>
    </div>
  );
}
