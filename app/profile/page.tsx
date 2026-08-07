"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  total_score: number;
  current_streak: number;
  best_streak: number;
  games_played: number;
  games_won: number;
  created_at: string;
};

type GameResult = {
  id: number;
  game_code: string;
  play_date: string;
  score: number;
  attempt_count: number | null;
  won: boolean;
  duration_seconds: number | null;
  created_at: string;
};

type GameSummary = {
  gameCode: string;
  label: string;
  games: number;
  wins: number;
  losses: number;
  score: number;
};

const GAME_LABELS: Record<string, string> = {
  wordle: "Wordle",
  guess_the_player: "Guess the Player",
  player_quiz: "Player Quiz",
  career_path: "Career Path",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [results, setResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError("");

      try {
        const supabase = createClient();

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          window.location.href = "/login";
          return;
        }

        const { data: profileData, error: profileError } =
          await supabase
            .from("profiles")
            .select(`
              id,
              username,
              display_name,
              avatar_url,
              total_score,
              current_streak,
              best_streak,
              games_played,
              games_won,
              created_at
            `)
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!profileData) {
          throw new Error("Profil kaydı bulunamadı.");
        }

        const { data: gameResults, error: resultsError } =
          await supabase
            .from("game_results")
            .select(`
              id,
              game_code,
              play_date,
              score,
              attempt_count,
              won,
              duration_seconds,
              created_at
            `)
            .eq("user_id", user.id)
            .order("created_at", {
              ascending: false,
            });

        if (resultsError) {
          throw resultsError;
        }

        setProfile(profileData as Profile);
        setResults((gameResults ?? []) as GameResult[]);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Profil yüklenemedi.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  const summaries = useMemo<GameSummary[]>(() => {
    return Object.entries(GAME_LABELS).map(
      ([gameCode, label]) => {
        const gameResults = results.filter(
          (result) => result.game_code === gameCode,
        );

        const wins = gameResults.filter(
          (result) => result.won,
        ).length;

        return {
          gameCode,
          label,
          games: gameResults.length,
          wins,
          losses: gameResults.length - wins,
          score: gameResults.reduce(
            (total, result) => total + result.score,
            0,
          ),
        };
      },
    );
  }, [results]);

  const winRate = useMemo(() => {
    if (!profile || profile.games_played === 0) {
      return 0;
    }

    return Math.round(
      (profile.games_won / profile.games_played) * 100,
    );
  }, [profile]);

  async function handleLogout() {
    const supabase = createClient();

    await supabase.auth.signOut();

    window.location.href = "/";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07111f] text-white">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6">
          <p className="text-lg font-bold text-slate-400">
            Profil yükleniyor...
          </p>
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="min-h-screen bg-[#07111f] text-white">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6">
          <div className="w-full max-w-lg rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-center">
            <h1 className="text-2xl font-black">
              Profil yüklenemedi
            </h1>

            <p className="mt-3 text-red-200">
              {error || "Profil bulunamadı."}
            </p>

            <Link
              href="/"
              className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 font-black text-[#07111f]"
            >
              Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/"
              className="inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition hover:border-white/20 hover:text-white"
            >
              ← Ana Sayfa
            </Link>

            <h1 className="mt-5 text-4xl font-black tracking-tight">
              Profil
            </h1>

            <p className="mt-2 text-slate-400">
              Skorlarını, serini ve oyun geçmişini takip et.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-red-400/30 bg-red-500/10 px-5 py-3 text-sm font-black text-red-300 transition hover:bg-red-500/20"
          >
            Çıkış Yap
          </button>
        </div>

        <section className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-green-500 text-3xl font-black text-[#07111f]">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name ?? "Profil"}
                  className="h-full w-full object-cover"
                />
              ) : (
                (
                  profile.display_name ||
                  profile.username ||
                  "F"
                )
                  .slice(0, 1)
                  .toUpperCase()
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-3xl font-black">
                {profile.display_name ||
                  profile.username ||
                  "FootBattle Oyuncusu"}
              </h2>

              {profile.username && (
                <p className="mt-1 text-slate-400">
                  @{profile.username}
                </p>
              )}

              <p className="mt-3 text-sm text-slate-500">
                FootBattle üyesi •{" "}
                {formatDate(profile.created_at)}
              </p>
            </div>
          </div>

          <div className="grid gap-px border-t border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="Toplam Puan"
              value={formatNumber(profile.total_score)}
            />

            <StatCard
              label="Güncel Seri"
              value={`${profile.current_streak} 🔥`}
            />

            <StatCard
              label="En İyi Seri"
              value={`${profile.best_streak} gün`}
            />

            <StatCard
              label="Oynanan Oyun"
              value={formatNumber(profile.games_played)}
            />

            <StatCard
              label="Kazanma Oranı"
              value={`%${winRate}`}
            />
          </div>
        </section>

        <section className="mt-8">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-yellow-400">
              İstatistikler
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Oyun Bazlı Performans
            </h2>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {summaries.map((summary) => (
              <article
                key={summary.gameCode}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black">
                      {summary.label}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {summary.games} oyun oynandı
                    </p>
                  </div>

                  <div className="rounded-xl bg-yellow-400/10 px-3 py-2 font-black text-yellow-300">
                    {formatNumber(summary.score)} puan
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <SmallStat
                    label="Oyun"
                    value={summary.games}
                  />

                  <SmallStat
                    label="Galibiyet"
                    value={summary.wins}
                  />

                  <SmallStat
                    label="Mağlubiyet"
                    value={summary.losses}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 pb-12">
          <p className="text-sm font-black uppercase tracking-widest text-green-400">
            Geçmiş
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Son Oyunlar
          </h2>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
            {results.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                Henüz oynanmış oyun yok.
              </div>
            ) : (
              results.slice(0, 10).map((result) => (
                <div
                  key={result.id}
                  className="flex flex-col gap-3 border-b border-white/10 bg-white/[0.025] p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-black">
                      {GAME_LABELS[result.game_code] ??
                        result.game_code}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {formatDate(result.play_date)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-lg px-3 py-1.5 text-xs font-black ${
                        result.won
                          ? "bg-green-500/10 text-green-300"
                          : "bg-red-500/10 text-red-300"
                      }`}
                    >
                      {result.won
                        ? "KAZANDI"
                        : "KAYBETTİ"}
                    </span>

                    <span className="min-w-20 text-right font-black text-yellow-300">
                      {formatNumber(result.score)} P
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[#0c1929] p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-white">
        {value}
      </p>
    </div>
  );
}

function SmallStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-black/20 p-3 text-center">
      <p className="text-xs font-bold text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-black">
        {value}
      </p>
    </div>
  );
}