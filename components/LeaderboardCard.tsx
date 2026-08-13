"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

type LeaderboardType =
  | "overall"
  | "wordle"
  | "guess_the_player"
  | "player_quiz"
  | "tic_tac_toe";

type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  gamesPlayed: number;
  gamesWon: number;
  currentStreak?: number;
  bestStreak?: number;
};

type LeaderboardResponse = {
  ok: boolean;
  type: LeaderboardType;
  leaderboard: LeaderboardEntry[];
  error?: string;
};

const FILTERS: {
  value: LeaderboardType;
  label: string;
}[] = [
  {
    value: "overall",
    label: "Genel",
  },
  {
    value: "wordle",
    label: "Wordle",
  },
  {
    value: "guess_the_player",
    label: "Guess the Player",
  },
  {
    value: "player_quiz",
    label: "Player Quiz",
  },
  {
    value: "tic_tac_toe",
    label: "Tic Tac Toe",
  },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(
    value,
  );
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "FB";
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0].slice(0, 1) +
    parts[parts.length - 1].slice(0, 1)
  ).toUpperCase();
}

function getRankLabel(rank: number) {
  if (rank === 1) {
    return "🥇";
  }

  if (rank === 2) {
    return "🥈";
  }

  if (rank === 3) {
    return "🥉";
  }

  return `#${rank}`;
}

export default function LeaderboardCard() {
  const [selectedType, setSelectedType] =
    useState<LeaderboardType>("overall");

  const [entries, setEntries] = useState<
    LeaderboardEntry[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadLeaderboard() {
      setLoading(true);
      setError("");

      try {
        const query =
          selectedType === "overall"
            ? "/api/leaderboard?period=week&limit=10"
            : `/api/leaderboard?period=week&game=${encodeURIComponent(
                selectedType,
              )}&limit=10`;

        const response = await fetch(
          query,
          {
            cache: "no-store",
          },
        );

        const result =
          (await response.json()) as LeaderboardResponse;

        if (
          !response.ok ||
          !result.ok
        ) {
          throw new Error(
            result.error ||
              "Leaderboard yüklenemedi.",
          );
        }

        if (!cancelled) {
          setEntries(
            result.leaderboard ?? [],
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Leaderboard yüklenemedi.",
          );

          setEntries([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [selectedType]);

  const selectedLabel = useMemo(
    () =>
      FILTERS.find(
        (filter) =>
          filter.value === selectedType,
      )?.label ?? "Genel",
    [selectedType],
  );

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]">
      <div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400">
            FootBattle
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            Leaderboard
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Bu haftanın en yüksek skorlu oyuncuları.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs font-bold uppercase tracking-wider text-slate-600 sm:inline">
            Sıralama
          </span>

          <div className="relative">
            <select
              value={selectedType}
              onChange={(event) =>
                setSelectedType(
                  event.target
                    .value as LeaderboardType,
                )
              }
              className="appearance-none rounded-xl border border-white/10 bg-[#0c1929] py-2.5 pl-4 pr-10 text-sm font-black text-white outline-none transition hover:border-white/20 focus:border-yellow-400/50"
            >
              {FILTERS.map((filter) => (
                <option
                  key={filter.value}
                  value={filter.value}
                >
                  {filter.label}
                </option>
              ))}
            </select>

            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
              ▼
            </span>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {loading ? (
          <div className="flex min-h-72 items-center justify-center rounded-2xl border border-white/5 bg-black/10">
            <p className="text-sm font-bold text-slate-500">
              {selectedLabel} sıralaması
              yükleniyor...
            </p>
          </div>
        ) : error ? (
          <div className="flex min-h-72 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
            <div>
              <p className="font-black text-red-300">
                Leaderboard yüklenemedi
              </p>

              <p className="mt-2 text-sm text-red-300/70">
                {error}
              </p>
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-white/10 p-6 text-center">
            <div>
              <p className="font-black text-slate-300">
                Henüz sıralama yok.
              </p>

              <p className="mt-2 text-sm text-slate-600">
                Bu hafta skor oluştuğunda burada görünecek.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => {
              const winRate =
                entry.gamesPlayed > 0
                  ? Math.round(
                      (entry.gamesWon /
                        entry.gamesPlayed) *
                        100,
                    )
                  : 0;

              return (
                <article
                  key={entry.userId}
                  className="group flex items-center gap-3 rounded-2xl border border-transparent bg-black/15 p-3 transition hover:border-white/10 hover:bg-white/[0.04]"
                >
                  <div className="flex w-10 shrink-0 items-center justify-center text-lg font-black">
                    {getRankLabel(
                      entry.rank,
                    )}
                  </div>

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-green-500 font-black text-[#07111f]">
                    {entry.avatarUrl ? (
                      <img
                        src={
                          entry.avatarUrl
                        }
                        alt={
                          entry.displayName
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(
                        entry.displayName,
                      )
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-white">
                      {entry.displayName}
                    </p>

                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      {entry.username && (
                        <span>
                          @{entry.username}
                        </span>
                      )}

                      <span>
                        {entry.gamesPlayed} oyun
                      </span>

                      <span>
                        %{winRate} galibiyet
                      </span>

                      {selectedType ===
                        "overall" &&
                        typeof entry.currentStreak ===
                          "number" && (
                          <span>
                            🔥{" "}
                            {
                              entry.currentStreak
                            }
                          </span>
                        )}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-lg font-black text-yellow-300">
                      {formatNumber(
                        entry.score,
                      )}
                    </p>

                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                      puan
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-white/10 px-5 py-4">
        <p className="text-xs text-slate-600">
          {selectedLabel} • Bu Hafta • İlk 10
        </p>

        <Link
          href={`/leaderboard${
            selectedType === "overall"
              ? "?period=week"
              : `?period=week&game=${selectedType}`
          }`}
          className="text-sm font-black text-yellow-300 transition hover:text-yellow-200"
        >
          Tüm sıralamayı gör →
        </Link>
      </div>
    </section>
  );
}