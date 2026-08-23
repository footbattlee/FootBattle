"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import type { GameCompletedDetail } from "@/lib/analytics/game-analytics";

const GAME_META: Record<string, { label: string; icon: string; playHref: string; challenge: boolean }> = {
  wordle: { label: "Wordle", icon: "🟩", playHref: "/wordle", challenge: false },
  guess_the_player: { label: "Guess the Player", icon: "🕵️", playHref: "/guess-the-player", challenge: true },
  player_quiz: { label: "Player Quiz", icon: "🧠", playHref: "/player-quiz", challenge: true },
  transfer_quiz: { label: "Transfer Quiz", icon: "🔥", playHref: "/transfer-quiz", challenge: false },
  tic_tac_toe: { label: "Futbol Tic Tac Toe", icon: "⭕", playHref: "/tic-tac-toe", challenge: true },
  club_nation: { label: "1 Takım 1 Millet", icon: "🌍", playHref: "/club-nation", challenge: true },
  club_clash: { label: "2 Takım 1 Oyuncu", icon: "⚔️", playHref: "/club-clash", challenge: true },
  career_path: { label: "Career Path", icon: "🛣️", playHref: "/career-path", challenge: true },
};

const NEXT_GAME: Record<string, string> = {
  wordle: "/guess-the-player",
  guess_the_player: "/player-quiz",
  player_quiz: "/tic-tac-toe",
  tic_tac_toe: "/club-clash",
  club_clash: "/club-nation",
  club_nation: "/career-path",
  career_path: "/transfer-quiz",
  transfer_quiz: "/wordle",
};

type SummaryResponse = {
  ok?: boolean;
  ready?: boolean;
  error?: string;
  authenticated?: boolean;
  playerName?: string | null;
  result?: {
    game: string;
    sourceSessionId: string;
    score: number;
    won: boolean;
    durationMs: number;
    averageScore: number;
    percentile: number;
    topPercent: number;
    sampleSize: number;
  };
  progression?: {
    xp: number;
    level: number;
    xpIntoLevel: number;
    xpNeededForLevel: number;
    currentStreak: number;
    bestStreak: number;
    xpEarned: number;
  } | null;
  recentAchievements?: Array<{
    code: string;
    title: string;
    icon: string;
  }>;
};

type ChallengeResponse = {
  ok?: boolean;
  error?: string;
  challenge?: {
    shareUrl?: string;
  };
};

function number(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

async function sleep(ms: number) {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function GameResultArena() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState("");
  const [detail, setDetail] = useState<GameCompletedDetail | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const lastKey = useRef("");

  useEffect(() => {
    function onCompleted(event: Event) {
      const custom = event as CustomEvent<GameCompletedDetail>;
      const next = custom.detail;
      if (!next?.gameName) return;
      const key = `${next.gameName}:${next.sessionId ?? "none"}`;
      if (lastKey.current === key) return;
      lastKey.current = key;
      setDetail(next);
      setSummary(null);
      setMessage("");
      setOpen(true);
      setLoading(true);

      void (async () => {
        if (!next.sessionId) {
          setLoading(false);
          return;
        }

        for (let attempt = 0; attempt < 5; attempt += 1) {
          if (attempt > 0) await sleep(450 + attempt * 150);
          try {
            const params = new URLSearchParams({
              game: next.gameName,
              session: next.sessionId,
            });
            const response = await fetch(`/api/game-results/summary?${params.toString()}`, {
              cache: "no-store",
            });
            const result = (await response.json()) as SummaryResponse;
            if (response.ok && result.ok && result.ready) {
              setSummary(result);
              setLoading(false);
              return;
            }
          } catch {
            // Ledger trigger may still be finishing. Retry quietly.
          }
        }
        setLoading(false);
      })();
    }

    window.addEventListener("footbattle:game-completed", onCompleted);
    return () => window.removeEventListener("footbattle:game-completed", onCompleted);
  }, []);

  useEffect(() => {
    setOpen(false);
    setMessage("");
  }, [pathname]);

  const game = detail ? GAME_META[detail.gameName] : null;
  const fallbackScore = useMemo(() => {
    const value = detail?.metadata?.score;
    return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : null;
  }, [detail]);
  const score = summary?.result?.score ?? fallbackScore;
  const won = summary?.result?.won ?? Boolean(detail?.metadata?.won);

  async function shareText(url?: string) {
    if (!game || score === null) return;
    const targetUrl = url ?? `${window.location.origin}${game.playHref}?utm_source=share&utm_medium=result&utm_campaign=arena_result`;
    const text = `${won ? "🏆" : "⚽"} FootBattle · ${game.label}\nSkorum: ${number(score)}${summary?.result && summary.result.sampleSize >= 5 ? `\nİlk %${summary.result.topPercent} içindeyim.` : ""}\n\nBeni geçebilir misin?`;

    try {
      if (navigator.share) {
        await navigator.share({ title: "FootBattle Meydan Okuma", text, url: targetUrl });
        setMessage("Paylaşım açıldı ✓");
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${targetUrl}`);
      setMessage("Mesaj ve link kopyalandı ✓");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(`${text}\n${targetUrl}`);
        setMessage("Mesaj ve link kopyalandı ✓");
      } catch {
        setMessage("Paylaşım açılamadı.");
      }
    }
  }

  async function createChallengeAndShare() {
    if (!detail || !game?.challenge || sharing) return;
    setSharing(true);
    setMessage("");
    try {
      const response = await fetch("/api/challenges/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameCode: detail.gameName,
          challengerName: summary?.playerName ?? "FootBattle Oyuncusu",
        }),
      });
      const result = (await response.json()) as ChallengeResponse;
      if (!response.ok || !result.ok || !result.challenge?.shareUrl) {
        throw new Error(result.error ?? "Meydan okuma oluşturulamadı.");
      }
      await shareText(result.challenge.shareUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Meydan okuma oluşturulamadı.");
    } finally {
      setSharing(false);
    }
  }

  if (!open || !detail || !game) return null;

  const progress = summary?.progression;
  const percent = progress
    ? Math.min(100, Math.round((progress.xpIntoLevel / Math.max(1, progress.xpNeededForLevel)) * 100))
    : 0;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-2 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label="Oyun sonucu">
      <section className="relative max-h-[92dvh] w-full max-w-[620px] overflow-y-auto rounded-[28px] border border-green-400/20 bg-[#081523] p-5 text-white shadow-2xl sm:p-7">
        <button type="button" onClick={() => setOpen(false)} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-lg text-slate-400 transition hover:text-white" aria-label="Sonuç panelini kapat">×</button>

        <div className="pr-10">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-green-300">Arena Sonucu</p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">{won ? "Kazandın. Şimdi sıra arkadaşında. 🏆" : "Bu sefer olmadı. Rövanş hazır. ⚽"}</h2>
          <p className="mt-2 text-sm text-slate-400">{game.icon} {game.label}</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.07] p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-yellow-300">Skorun</p>
            <p className="mt-1 text-3xl font-black text-yellow-200">{score === null ? "—" : number(score)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">30 Gün Ort.</p>
            <p className="mt-1 text-2xl font-black">{summary?.result && summary.result.sampleSize >= 5 ? number(summary.result.averageScore) : "—"}</p>
          </div>
          <div className="col-span-2 rounded-2xl border border-purple-400/20 bg-purple-400/[0.06] p-4 sm:col-span-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-purple-300">Sıralama Gücü</p>
            <p className="mt-1 text-2xl font-black">{summary?.result && summary.result.sampleSize >= 5 ? `İlk %${summary.result.topPercent}` : "Yeni sonuç"}</p>
          </div>
        </div>

        {loading && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-bold text-slate-400">Anti-cheat onaylı sonuç hazırlanıyor...</div>
        )}

        {progress && (
          <div className="mt-4 rounded-2xl border border-green-400/20 bg-green-400/[0.055] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-green-300">⭐ +{number(progress.xpEarned)} XP</p>
                <p className="mt-1 font-black">Seviye {progress.level} · 🔥 {progress.currentStreak} gün seri</p>
              </div>
              <p className="text-xs font-bold text-slate-500">{number(progress.xp)} XP</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-green-400 transition-all" style={{ width: `${percent}%` }} />
            </div>
          </div>
        )}

        {summary?.recentAchievements && summary.recentAchievements.length > 0 && (
          <div className="mt-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.05] p-4">
            <p className="text-xs font-black uppercase tracking-wider text-yellow-300">Yeni Rozet Açıldı</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {summary.recentAchievements.map((achievement) => (
                <span key={achievement.code} className="rounded-xl border border-yellow-400/20 bg-black/15 px-3 py-2 text-sm font-black">{achievement.icon} {achievement.title}</span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {game.challenge && (
            <button type="button" onClick={() => void createChallengeAndShare()} disabled={sharing} className="min-h-12 rounded-xl bg-purple-500 px-4 text-sm font-black text-white transition hover:bg-purple-400 disabled:opacity-50">
              {sharing ? "Meydan okuma hazırlanıyor..." : "⚔️ Arkadaşına Meydan Oku"}
            </button>
          )}
          <button type="button" onClick={() => void shareText()} className="min-h-12 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-4 text-sm font-black text-cyan-200 transition hover:bg-cyan-400/15">📱 Sonucumu Paylaş</button>
          <button type="button" onClick={() => window.location.reload()} className="min-h-12 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-slate-200 transition hover:bg-white/[0.08]">🔄 Tekrar Oyna</button>
          <button type="button" onClick={() => { window.location.href = NEXT_GAME[detail.gameName] ?? "/"; }} className="min-h-12 rounded-xl bg-green-500 px-4 text-sm font-black text-[#07111f] transition hover:bg-green-400">🎮 Sonraki Oyuna Geç</button>
          <button type="button" onClick={() => { window.location.href = "/"; }} className="min-h-12 rounded-xl border border-purple-400/30 bg-purple-400/[0.08] px-4 text-sm font-black text-purple-200 transition hover:bg-purple-400/[0.14] sm:col-span-2">⌂ Ana Sayfa</button>
        </div>

        {message && <p className="mt-3 text-center text-xs font-bold text-green-300">{message}</p>}
        {!summary?.authenticated && !loading && (
          <p className="mt-4 text-center text-xs leading-5 text-slate-500">Giriş yaparsan XP, seviye, seri ve rozet ilerlemen de burada görünür.</p>
        )}
      </section>
    </div>
  );
}
