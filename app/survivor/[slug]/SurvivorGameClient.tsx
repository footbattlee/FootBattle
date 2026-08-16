"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Entry = { id: string; slot: number; name: string; imageUrl: string | null };
type Survivor = { id: string; slug: string; title: string; description: string; kind: "player" | "team"; entries: Entry[] };
type Match = { left: Entry; right: Entry; winner: Entry };
type Round = { name: string; matches: Match[] };
type RankReward = { applied?: boolean; already_processed?: boolean; lp_change?: number; lp_after?: number };

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const random = new Uint32Array(1);
    window.crypto.getRandomValues(random);
    const swapIndex = random[0] % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function roundName(size: number) {
  if (size === 16) return "Son 16";
  if (size === 8) return "Çeyrek Final";
  if (size === 4) return "Yarı Final";
  return "Final";
}

export default function SurvivorGameClient({ slug }: { slug: string }) {
  const [survivor, setSurvivor] = useState<Survivor | null>(null);
  const [roundEntries, setRoundEntries] = useState<Entry[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [winners, setWinners] = useState<Entry[]>([]);
  const [roundMatches, setRoundMatches] = useState<Match[]>([]);
  const [history, setHistory] = useState<Round[]>([]);
  const [champion, setChampion] = useState<Entry | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [rankReward, setRankReward] = useState<RankReward | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    fetch(`/api/survivor/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error ?? "Survivor yüklenemedi.");
        const data = result.survivor as Survivor;
        setSurvivor(data);
        setRoundEntries(shuffle(data.entries));
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Survivor yüklenemedi."))
      .finally(() => setLoading(false));
  }, [slug]);

  const currentMatch = useMemo(() => {
    const offset = matchIndex * 2;
    if (!roundEntries[offset] || !roundEntries[offset + 1]) return null;
    return { left: roundEntries[offset], right: roundEntries[offset + 1] };
  }, [matchIndex, roundEntries]);

  const totalSelections = 15;
  const completedSelections = history.reduce((sum, round) => sum + round.matches.length, 0) + roundMatches.length;
  const progress = Math.round((completedSelections / totalSelections) * 100);

  async function saveResult(nextChampion: Entry, nextHistory: Round[]) {
    if (!survivor) return;
    try {
      const response = await fetch(`/api/survivor/${encodeURIComponent(survivor.slug)}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ championId: nextChampion.id, championName: nextChampion.name, bracket: nextHistory }),
      });
      const result = await response.json();
      if (response.ok && result.ok) {
        if (result.result?.shareUrl) setShareUrl(result.result.shareUrl);
        if (result.rankReward) setRankReward(result.rankReward as RankReward);
      }
    } catch {
      // Result persistence should never block the local winner screen.
    }
  }

  function choose(winner: Entry) {
    if (!currentMatch || champion) return;
    const match: Match = { left: currentMatch.left, right: currentMatch.right, winner };
    const nextMatches = [...roundMatches, match];
    const nextWinners = [...winners, winner];
    const isRoundFinished = matchIndex + 1 >= roundEntries.length / 2;

    if (!isRoundFinished) {
      setRoundMatches(nextMatches);
      setWinners(nextWinners);
      setMatchIndex((value) => value + 1);
      return;
    }

    const finishedRound: Round = { name: roundName(roundEntries.length), matches: nextMatches };
    const nextHistory = [...history, finishedRound];
    setHistory(nextHistory);

    if (nextWinners.length === 1) {
      setChampion(nextWinners[0]);
      setRoundMatches([]);
      setWinners([]);
      setMatchIndex(0);
      void saveResult(nextWinners[0], nextHistory);
      return;
    }

    setRoundEntries(nextWinners);
    setRoundMatches([]);
    setWinners([]);
    setMatchIndex(0);
  }

  async function share() {
    if (!survivor || !champion) return;
    setSharing(true);
    const target = shareUrl
      ? `${window.location.origin}${shareUrl}`
      : `${window.location.origin}/survivor/${survivor.slug}?utm_source=share&utm_medium=survivor`;
    const text = `👑 Benim “${survivor.title}” şampiyonum ${champion.name}!\nSenin şampiyonun kim olacak?`;

    try {
      if (navigator.share) {
        await navigator.share({ title: survivor.title, text, url: target });
      } else {
        await navigator.clipboard.writeText(`${text}\n${target}`);
      }
    } catch (shareError) {
      if (!(shareError instanceof DOMException && shareError.name === "AbortError")) {
        try {
          await navigator.clipboard.writeText(`${text}\n${target}`);
        } catch {
          // noop
        }
      }
    } finally {
      setSharing(false);
    }
  }

  if (loading) return <main className="min-h-screen bg-[#07111f] p-8 text-white">Turnuva hazırlanıyor...</main>;
  if (error || !survivor) {
    return (
      <main className="min-h-screen bg-[#07111f] p-8 text-white">
        <p className="text-red-300">{error || "Survivor bulunamadı."}</p>
        <Link href="/survivor" className="mt-4 inline-block text-green-300">← Survivor listesi</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-9">
        <div className="flex flex-wrap gap-2">
          <Link href="/survivor" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-400">← Survivor</Link>
          <Link href="/" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-400">Ana Sayfa</Link>
        </div>

        <header className="mt-6 text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-300">👑 Survivor</p>
          <h1 className="mt-2 text-3xl font-black sm:text-5xl">{survivor.title}</h1>
          {survivor.description && <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">{survivor.description}</p>}
        </header>

        {!champion && currentMatch && (
          <section className="mt-7">
            <div className="flex items-center justify-between gap-4 text-xs font-black uppercase tracking-wider text-slate-500">
              <span>{roundName(roundEntries.length)}</span>
              <span>{matchIndex + 1}/{roundEntries.length / 2} eşleşme</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-yellow-300 transition-all" style={{ width: `${progress}%` }} />
            </div>

            <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 sm:gap-5">
              <ChoiceCard entry={currentMatch.left} onChoose={() => choose(currentMatch.left)} />
              <div className="flex items-center justify-center"><span className="rounded-full border border-white/10 bg-[#0d1828] px-3 py-2 text-xs font-black text-red-300 sm:text-sm">VS</span></div>
              <ChoiceCard entry={currentMatch.right} onChoose={() => choose(currentMatch.right)} />
            </div>
            <p className="mt-5 text-center text-xs font-bold text-slate-500">Turu geçen kişiyi seç. Seçim yaptıktan sonra turnuva ağacı o dal için sabit kalır.</p>
          </section>
        )}

        {champion && (
          <section className="mx-auto mt-7 max-w-2xl rounded-[32px] border border-yellow-300/25 bg-yellow-300/[0.055] p-6 text-center sm:p-9">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-300">Tahtın Sahibi</p>
            {champion.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={champion.imageUrl} alt={champion.name} className="mx-auto mt-5 h-40 w-40 rounded-3xl border border-yellow-300/30 object-cover object-top shadow-2xl sm:h-52 sm:w-52" />
            ) : (
              <div className="mx-auto mt-5 flex h-40 w-40 items-center justify-center rounded-3xl border border-yellow-300/20 bg-[#07111f] text-6xl font-black text-yellow-200 sm:h-52 sm:w-52">{champion.name.slice(0, 1)}</div>
            )}
            <h2 className="mt-5 text-4xl font-black text-yellow-100 sm:text-5xl">{champion.name}</h2>
            <p className="mt-2 text-sm text-slate-400">15 seçim sonunda senin şampiyonun.</p>

            {rankReward?.applied && (
              <div className="mt-5 rounded-2xl border border-green-400/25 bg-green-400/[0.08] p-4 text-left">
                <p className="text-xs font-black uppercase tracking-wider text-green-300">Rank ödülü</p>
                <p className="mt-1 text-xl font-black">+{Number(rankReward.lp_change ?? 10)} LP · {Number(rankReward.lp_after ?? 0)} LP</p>
                <p className="mt-1 text-xs text-slate-500">Bu Survivor'ı ilk tamamlayışın için verildi.</p>
              </div>
            )}
            {rankReward?.already_processed && (
              <p className="mt-4 text-xs font-bold text-slate-500">Bu Survivor'ın rank ödülünü daha önce aldın.</p>
            )}

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => void share()} disabled={sharing} className="min-h-12 rounded-xl bg-green-500 px-5 font-black text-[#07111f] disabled:opacity-50">{sharing ? "Paylaşım hazırlanıyor..." : "📱 Sonucumu Paylaş"}</button>
              <button type="button" onClick={() => window.location.reload()} className="min-h-12 rounded-xl border border-white/10 bg-white/[0.04] px-5 font-black">🔄 Yeniden Oyna</button>
            </div>
          </section>
        )}

        {history.length > 0 && (
          <section className="mt-8 rounded-3xl border border-white/10 bg-[#0d1828] p-5 sm:p-6">
            <h2 className="text-xl font-black">Turnuva Yolu</h2>
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              {history.map((round) => (
                <div key={round.name}>
                  <p className="text-xs font-black uppercase tracking-wider text-yellow-300">{round.name}</p>
                  <div className="mt-2 space-y-2">
                    {round.matches.map((match, index) => (
                      <div key={`${round.name}-${index}`} className="rounded-xl border border-white/[0.07] bg-[#07111f] px-3 py-2 text-xs">
                        <span className={match.winner.id === match.left.id ? "font-black text-green-300" : "text-slate-500"}>{match.left.name}</span>
                        <span className="mx-2 text-slate-700">vs</span>
                        <span className={match.winner.id === match.right.id ? "font-black text-green-300" : "text-slate-500"}>{match.right.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function ChoiceCard({ entry, onChoose }: { entry: Entry; onChoose: () => void }) {
  return (
    <button type="button" onClick={onChoose} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#0d1828] text-left transition active:scale-[.98] hover:border-green-400/35 sm:rounded-3xl">
      {entry.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={entry.imageUrl} alt={entry.name} className="h-44 w-full object-cover object-top sm:h-80" />
      ) : (
        <div className="flex h-44 items-center justify-center bg-[#091827] text-5xl font-black text-slate-600 sm:h-80 sm:text-7xl">{entry.name.slice(0, 1)}</div>
      )}
      <div className="p-3 text-center sm:p-5">
        <p className="text-sm font-black sm:text-xl">{entry.name}</p>
        <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-green-300 opacity-80">Seç</p>
      </div>
    </button>
  );
}
