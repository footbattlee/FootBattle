"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Period = "week" | "all";
type GameCode =
  | "overall"
  | "wordle"
  | "guess_the_player"
  | "player_quiz"
  | "tic_tac_toe"
  | "career_path"
  | "club_clash"
  | "club_nation"
  | "transfer_quiz";

type Entry = {
  rank: number;
  userId: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  gamesPlayed: number;
  gamesWon: number;
  currentStreak?: number;
};

type LeaderboardResponse = {
  ok?: boolean;
  leaderboard?: Entry[];
  error?: string;
};

type MeResponse = {
  ok?: boolean;
  authenticated?: boolean;
  error?: string;
  me?: {
    rank: number | null;
    totalPlayers: number;
    score: number;
    gamesPlayed: number;
    gamesWon: number;
    displayName: string;
    username: string | null;
    xp: number;
    level: number;
    currentStreak: number;
  } | null;
};

const GAMES: Array<{ value: GameCode; label: string; icon: string }> = [
  { value: "overall", label: "Genel", icon: "🏆" },
  { value: "wordle", label: "Wordle", icon: "🟩" },
  { value: "guess_the_player", label: "Guess the Player", icon: "🕵️" },
  { value: "player_quiz", label: "Player Quiz", icon: "🧠" },
  { value: "tic_tac_toe", label: "Tic Tac Toe", icon: "⭕" },
  { value: "career_path", label: "Career Path", icon: "🛣️" },
  { value: "club_nation", label: "1 Takım 1 Millet", icon: "🌍" },
  { value: "club_clash", label: "2 Takım 1 Oyuncu", icon: "⚔️" },
  { value: "transfer_quiz", label: "Transfer Quiz", icon: "🔁" },
];

function number(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function rankIcon(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

export default function LeaderboardPage() {
  const [game, setGame] = useState<GameCode>("overall");
  const [period, setPeriod] = useState<Period>("week");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [me, setMe] = useState<MeResponse["me"]>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialPeriod = params.get("period");
    const initialGame = params.get("game");
    if (initialPeriod === "all" || initialPeriod === "week") setPeriod(initialPeriod);
    if (GAMES.some((item) => item.value === initialGame)) setGame(initialGame as GameCode);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const suffix = `period=${period}${game === "overall" ? "" : `&game=${encodeURIComponent(game)}`}`;
        const [boardResponse, meResponse] = await Promise.all([
          fetch(`/api/leaderboard?${suffix}&limit=100`, { cache: "no-store" }),
          fetch(`/api/leaderboard/me?${suffix}`, { cache: "no-store" }),
        ]);
        const board = (await boardResponse.json()) as LeaderboardResponse;
        const mine = (await meResponse.json()) as MeResponse;
        if (!boardResponse.ok || !board.ok) throw new Error(board.error ?? "Sıralama yüklenemedi.");
        if (!cancelled) {
          setEntries(board.leaderboard ?? []);
          setAuthenticated(Boolean(mine.authenticated));
          setMe(mine.me ?? null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Sıralama yüklenemedi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [game, period]);

  const gameLabel = useMemo(
    () => GAMES.find((item) => item.value === game)?.label ?? "Genel",
    [game],
  );

  return (
    <main className="min-h-[100dvh] bg-[#07111f] text-white">
      <header className="border-b border-white/10 bg-[#081523]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-sm font-black text-slate-300 transition hover:text-white">← Ana Sayfa</Link>
          <div className="text-center">
            <p className="font-black">FootBattle</p>
            <p className="text-xs text-slate-500">Arena Sıralaması</p>
          </div>
          <Link href="/profile" className="text-sm font-black text-green-300 transition hover:text-green-200">Profil →</Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="overflow-hidden rounded-[28px] border border-yellow-400/20 bg-gradient-to-br from-yellow-400/[0.09] via-white/[0.035] to-green-400/[0.05] p-5 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-300">Rekabet Merkezi</p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">Kim gerçekten futbolu biliyor?</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Haftalık yarışta formunu göster, tüm zamanlarda kalıcı yerini al. Anti-cheat tarafından bloke edilen skorlar sıralamaya puan yazmaz.
          </p>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {GAMES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setGame(item.value)}
                className={`shrink-0 rounded-xl border px-3 py-2.5 text-xs font-black transition sm:text-sm ${
                  game === item.value
                    ? "border-green-400/40 bg-green-400/15 text-green-200"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-white"
                }`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 rounded-xl border border-white/10 bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => setPeriod("week")}
              className={`rounded-lg px-4 py-2 text-sm font-black ${period === "week" ? "bg-yellow-400 text-[#07111f]" : "text-slate-400"}`}
            >
              Bu Hafta
            </button>
            <button
              type="button"
              onClick={() => setPeriod("all")}
              className={`rounded-lg px-4 py-2 text-sm font-black ${period === "all" ? "bg-yellow-400 text-[#07111f]" : "text-slate-400"}`}
            >
              Tüm Zamanlar
            </button>
          </div>
        </section>

        {authenticated && me && (
          <section className="mt-5 rounded-2xl border border-green-400/25 bg-green-400/[0.07] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-green-300">Senin Durumun</p>
                <p className="mt-1 text-xl font-black">
                  {me.rank ? `#${me.rank}` : "Henüz sıralamada değilsin"} <span className="text-sm font-semibold text-slate-500">/ {me.totalPlayers} oyuncu</span>
                </p>
                <p className="mt-1 text-sm text-slate-400">Seviye {me.level} · {number(me.xp)} XP · 🔥 {me.currentStreak} gün</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-yellow-300">{number(me.score)}</p>
                <p className="text-xs font-black uppercase tracking-wider text-slate-600">{gameLabel} puanı</p>
              </div>
            </div>
          </section>
        )}

        <section className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
          <div className="border-b border-white/10 px-4 py-4 sm:px-6">
            <h2 className="text-xl font-black">{gameLabel} · {period === "week" ? "Bu Hafta" : "Tüm Zamanlar"}</h2>
            <p className="mt-1 text-sm text-slate-500">İlk 100 oyuncu</p>
          </div>

          {loading ? (
            <div className="flex min-h-72 items-center justify-center text-sm font-bold text-slate-500">Sıralama yükleniyor...</div>
          ) : error ? (
            <div className="p-8 text-center font-bold text-red-300">{error}</div>
          ) : entries.length === 0 ? (
            <div className="p-10 text-center text-slate-500">Bu filtrede henüz skor yok.</div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {entries.map((entry) => {
                const winRate = entry.gamesPlayed ? Math.round((entry.gamesWon / entry.gamesPlayed) * 100) : 0;
                return (
                  <article key={entry.userId} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 transition hover:bg-white/[0.035] sm:grid-cols-[64px_minmax(0,1fr)_170px] sm:px-6 sm:py-4">
                    <div className="text-center text-lg font-black">{rankIcon(entry.rank)}</div>
                    <div className="min-w-0">
                      <p className="truncate font-black">{entry.displayName}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {entry.username ? `@${entry.username} · ` : ""}{entry.gamesPlayed} oyun · %{winRate} galibiyet {typeof entry.currentStreak === "number" ? `· 🔥 ${entry.currentStreak}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-yellow-300">{number(entry.score)}</p>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">puan</p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
