"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type RangeKey =
  | "today"
  | "7d"
  | "30d"
  | "all";

type GameAnalyticsRow = {
  gameName: string;

  started: number;
  completed: number;
  playAgain: number;
  shared: number;

  completionRate: number;
};

type AnalyticsSummary = {
  totalStarted: number;
  totalCompleted: number;
  totalPlayAgain: number;
  totalShared: number;
};

type AnalyticsResponse = {
  ok?: boolean;

  error?: string;

  range?: RangeKey;

  summary?: AnalyticsSummary;

  games?: GameAnalyticsRow[];
};

const RANGE_OPTIONS: {
  key: RangeKey;
  label: string;
}[] = [
  {
    key: "today",
    label: "Bugün",
  },
  {
    key: "7d",
    label: "Son 7 Gün",
  },
  {
    key: "30d",
    label: "Son 30 Gün",
  },
  {
    key: "all",
    label: "Tümü",
  },
];

const GAME_LABELS:
  Record<string, string> = {
    wordle:
      "Wordle",

    guess_the_player:
      "Guess the Player",

    player_quiz:
      "Player Quiz",

    transfer_quiz:
      "Transfer Quiz",

    tic_tac_toe:
      "Futbol Tic Tac Toe",

    club_nation:
      "1 Takım 1 Millet",

    club_clash:
      "2 Takım 1 Oyuncu",

    career_path:
      "Career Path",
  };

function getGameLabel(
  gameName: string,
) {
  return (
    GAME_LABELS[
      gameName
    ] ??
    gameName
  );
}

function formatNumber(
  value: number,
) {
  return new Intl.NumberFormat(
    "tr-TR",
  ).format(
    value,
  );
}

function formatPercentage(
  value: number,
) {
  return `%${new Intl.NumberFormat(
    "tr-TR",
    {
      minimumFractionDigits:
        1,

      maximumFractionDigits:
        1,
    },
  ).format(
    value,
  )}`;
}

export default function AdminAnalyticsPage() {
  const [
    range,
    setRange,
  ] =
    useState<RangeKey>(
      "7d",
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    summary,
    setSummary,
  ] =
    useState<AnalyticsSummary>({
      totalStarted: 0,
      totalCompleted: 0,
      totalPlayAgain: 0,
      totalShared: 0,
    });

  const [
    games,
    setGames,
  ] =
    useState<
      GameAnalyticsRow[]
    >([]);

  /* =====================================================
     LOAD
  ===================================================== */

  useEffect(() => {
    void loadAnalytics();
  }, [range]);

  async function loadAnalytics() {
    try {
      setLoading(
        true,
      );

      setError(
        "",
      );

      const response =
        await fetch(
          `/api/admin/analytics?range=${encodeURIComponent(
            range,
          )}`,
          {
            cache:
              "no-store",
          },
        );

      const result =
        (await response.json()) as AnalyticsResponse;

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
            "Analytics verileri yüklenemedi.",
        );
      }

      setSummary(
        result.summary ?? {
          totalStarted: 0,
          totalCompleted: 0,
          totalPlayAgain: 0,
          totalShared: 0,
        },
      );

      setGames(
        result.games ??
          [],
      );
    } catch (
      loadError
    ) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Analytics verileri yüklenemedi.",
      );
    } finally {
      setLoading(
        false,
      );
    }
  }

  /* =====================================================
     COMPUTED
  ===================================================== */

  const overallCompletionRate =
    useMemo(
      () => {
        if (
          summary.totalStarted <=
          0
        ) {
          return 0;
        }

        return (
          summary.totalCompleted /
          summary.totalStarted
        ) * 100;
      },
      [
        summary.totalCompleted,
        summary.totalStarted,
      ],
    );

  const mostPlayedGame =
    useMemo(
      () => {
        if (
          games.length ===
          0
        ) {
          return null;
        }

        return [
          ...games,
        ].sort(
          (
            first,
            second,
          ) =>
            second.started -
            first.started,
        )[0];
      },
      [
        games,
      ],
    );

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-green-400">
              FootBattle Admin
            </p>

            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Oyun Raporları
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Oyun başlatma, tamamlama,
              tekrar oynama ve paylaşım
              sayılarını takip et.
            </p>
          </div>

          {/* RANGE */}

          <div className="flex flex-wrap gap-2">
            {RANGE_OPTIONS.map(
              (
                option,
              ) => {
                const active =
                  range ===
                  option.key;

                return (
                  <button
                    key={
                      option.key
                    }
                    type="button"
                    onClick={() =>
                      setRange(
                        option.key,
                      )
                    }
                    className={`rounded-xl px-4 py-2.5 text-xs font-black transition sm:text-sm ${
                      active
                        ? "bg-green-500 text-[#07111f]"
                        : "border border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {
                      option.label
                    }
                  </button>
                );
              },
            )}
          </div>

        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-300">
            {error}
          </div>
        )}

        {/* =================================================
            SUMMARY CARDS
        ================================================= */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <SummaryCard
            label="Toplam Başlatma"
            value={
              formatNumber(
                summary.totalStarted,
              )
            }
            icon="🎮"
            loading={
              loading
            }
          />

          <SummaryCard
            label="Toplam Tamamlama"
            value={
              formatNumber(
                summary.totalCompleted,
              )
            }
            icon="✅"
            loading={
              loading
            }
          />

          <SummaryCard
            label="Tekrar Oyna"
            value={
              formatNumber(
                summary.totalPlayAgain,
              )
            }
            icon="🔁"
            loading={
              loading
            }
          />

          <SummaryCard
            label="Paylaşım"
            value={
              formatNumber(
                summary.totalShared,
              )
            }
            icon="📤"
            loading={
              loading
            }
          />

        </section>

        {/* =================================================
            QUICK INSIGHTS
        ================================================= */}

        <section className="mt-4 grid gap-4 lg:grid-cols-2">

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">

            <p className="text-xs font-black uppercase tracking-wider text-slate-500">
              Genel Tamamlama Oranı
            </p>

            <p className="mt-2 text-3xl font-black text-green-400">
              {
                formatPercentage(
                  overallCompletionRate,
                )
              }
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Tamamlanan oyunların
              başlatılan oyunlara oranı.
            </p>

          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">

            <p className="text-xs font-black uppercase tracking-wider text-slate-500">
              En Çok Oynanan Oyun
            </p>

            <p className="mt-2 text-2xl font-black text-yellow-300">
              {mostPlayedGame
                ? getGameLabel(
                    mostPlayedGame.gameName,
                  )
                : "-"}
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              {mostPlayedGame
                ? `${formatNumber(
                    mostPlayedGame.started,
                  )} kez başlatıldı.`
                : "Henüz veri yok."}
            </p>

          </div>

        </section>

        {/* =================================================
            TABLE
        ================================================= */}

        <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">

          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">

            <div>
              <p className="font-black">
                Oyun Bazlı Performans
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Seçili tarih aralığındaki
                analytics eventleri.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadAnalytics()
              }
              disabled={
                loading
              }
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-black text-slate-300 transition hover:border-white/20 hover:text-white disabled:opacity-40"
            >
              {loading
                ? "Yükleniyor..."
                : "Yenile"}
            </button>

          </div>

          {/* DESKTOP */}

          <div className="hidden overflow-x-auto md:block">

            <table className="w-full text-left">

              <thead className="border-b border-white/10 bg-black/10">

                <tr className="text-[11px] font-black uppercase tracking-wider text-slate-500">

                  <th className="px-5 py-4">
                    Oyun
                  </th>

                  <th className="px-5 py-4 text-right">
                    Başlatma
                  </th>

                  <th className="px-5 py-4 text-right">
                    Tamamlama
                  </th>

                  <th className="px-5 py-4 text-right">
                    Oran
                  </th>

                  <th className="px-5 py-4 text-right">
                    Tekrar
                  </th>

                  <th className="px-5 py-4 text-right">
                    Paylaşım
                  </th>

                </tr>

              </thead>

              <tbody>

                {loading &&
                games.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={
                        6
                      }
                      className="px-5 py-12 text-center text-sm text-slate-500"
                    >
                      Rapor yükleniyor...
                    </td>
                  </tr>
                ) : games.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={
                        6
                      }
                      className="px-5 py-12 text-center text-sm text-slate-500"
                    >
                      Bu tarih aralığında oyun verisi yok.
                    </td>
                  </tr>
                ) : (
                  games.map(
                    (
                      game,
                    ) => (
                      <tr
                        key={
                          game.gameName
                        }
                        className="border-b border-white/5 last:border-0"
                      >

                        <td className="px-5 py-4">

                          <p className="font-black">
                            {
                              getGameLabel(
                                game.gameName,
                              )
                            }
                          </p>

                          <p className="mt-1 text-[10px] text-slate-600">
                            {
                              game.gameName
                            }
                          </p>

                        </td>

                        <td className="px-5 py-4 text-right font-black">
                          {
                            formatNumber(
                              game.started,
                            )
                          }
                        </td>

                        <td className="px-5 py-4 text-right font-black">
                          {
                            formatNumber(
                              game.completed,
                            )
                          }
                        </td>

                        <td className="px-5 py-4 text-right">
                          <CompletionBadge
                            value={
                              game.completionRate
                            }
                          />
                        </td>

                        <td className="px-5 py-4 text-right font-black">
                          {
                            formatNumber(
                              game.playAgain,
                            )
                          }
                        </td>

                        <td className="px-5 py-4 text-right font-black">
                          {
                            formatNumber(
                              game.shared,
                            )
                          }
                        </td>

                      </tr>
                    ),
                  )
                )}

              </tbody>

            </table>

          </div>

          {/* MOBILE */}

          <div className="divide-y divide-white/5 md:hidden">

            {loading &&
            games.length ===
              0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                Rapor yükleniyor...
              </div>
            ) : games.length ===
              0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                Bu tarih aralığında oyun verisi yok.
              </div>
            ) : (
              games.map(
                (
                  game,
                ) => (
                  <div
                    key={
                      game.gameName
                    }
                    className="p-5"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <p className="font-black">
                          {
                            getGameLabel(
                              game.gameName,
                            )
                          }
                        </p>

                        <p className="mt-1 text-[10px] text-slate-600">
                          {
                            game.gameName
                          }
                        </p>

                      </div>

                      <CompletionBadge
                        value={
                          game.completionRate
                        }
                      />

                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">

                      <MobileStat
                        label="Başlatma"
                        value={
                          game.started
                        }
                      />

                      <MobileStat
                        label="Tamamlama"
                        value={
                          game.completed
                        }
                      />

                      <MobileStat
                        label="Tekrar"
                        value={
                          game.playAgain
                        }
                      />

                      <MobileStat
                        label="Paylaşım"
                        value={
                          game.shared
                        }
                      />

                    </div>

                  </div>
                ),
              )
            )}

          </div>

        </section>

      </div>
    </main>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  label,
  value,
  icon,
  loading,
}: {
  label: string;

  value: string;

  icon: string;

  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">

      <div className="flex items-center justify-between">

        <p className="text-xs font-black uppercase tracking-wider text-slate-500">
          {label}
        </p>

        <span className="text-xl">
          {icon}
        </span>

      </div>

      <p className="mt-3 text-3xl font-black text-white">
        {loading
          ? "..."
          : value}
      </p>

    </div>
  );
}

/* =========================================================
   COMPLETION BADGE
========================================================= */

function CompletionBadge({
  value,
}: {
  value: number;
}) {
  let className =
    "border-red-500/20 bg-red-500/10 text-red-300";

  if (
    value >= 70
  ) {
    className =
      "border-green-500/20 bg-green-500/10 text-green-300";
  } else if (
    value >= 40
  ) {
    className =
      "border-yellow-400/20 bg-yellow-400/10 text-yellow-300";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${className}`}
    >
      {
        formatPercentage(
          value,
        )
      }
    </span>
  );
}

/* =========================================================
   MOBILE STAT
========================================================= */

function MobileStat({
  label,
  value,
}: {
  label: string;

  value: number;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/15 p-3">

      <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p className="mt-1 text-lg font-black">
        {
          formatNumber(
            value,
          )
        }
      </p>

    </div>
  );
}