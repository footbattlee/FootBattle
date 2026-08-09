"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

/* =========================================================
   TYPES
========================================================= */

type DuelStatus =
  | "pending"
  | "accepted"
  | "active"
  | "completed"
  | "rejected"
  | "cancelled";

type DuelPlayer = {
  id: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;

  totalScore: number;
  currentStreak: number;
  gamesPlayed: number;
  gamesWon: number;

  online: boolean;
  lastSeenAt: string | null;
  lastSeenText: string;
};

type DuelItem = {
  id: number;

  gameCode: string;
  gameLabel: string;

  status: DuelStatus;

  viewerRole:
    | "challenger"
    | "opponent";

  challenger: DuelPlayer | null;
  opponent: DuelPlayer | null;
  otherPlayer: DuelPlayer | null;

  myScore: number;
  opponentScore: number;

  result:
    | "won"
    | "lost"
    | "draw"
    | null;

  winnerId: string | null;

  createdAt: string;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

type DuelsResponse = {
  ok?: boolean;
  error?: string;

  summary?: {
    incomingCount: number;
    outgoingCount: number;
    activeCount: number;
    historyCount: number;
    completedCount: number;
    wins: number;
    losses: number;
    draws: number;
  };

  incoming?: DuelItem[];
  outgoing?: DuelItem[];
  active?: DuelItem[];
  history?: DuelItem[];
};

type ActionResponse = {
  ok?: boolean;
  error?: string;
  message?: string;

  game?: {
    url?: string;
  };
};

/* =========================================================
   HELPERS
========================================================= */

function formatDateTime(
  value: string | null,
) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(
    new Date(value),
  );
}

function getInitials(
  player: DuelPlayer | null,
) {
  if (!player) {
    return "FB";
  }

  const value =
    player.displayName ||
    player.username ||
    "FootBattle";

  const parts =
    value
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length === 0
  ) {
    return "FB";
  }

  if (
    parts.length === 1
  ) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0].slice(
      0,
      1,
    ) +
    parts[
      parts.length - 1
    ].slice(
      0,
      1,
    )
  ).toUpperCase();
}

function getStatusLabel(
  status: DuelStatus,
) {
  switch (status) {
    case "pending":
      return "Beklemede";

    case "accepted":
      return "Kabul Edildi";

    case "active":
      return "Devam Ediyor";

    case "completed":
      return "Tamamlandı";

    case "rejected":
      return "Reddedildi";

    case "cancelled":
      return "İptal Edildi";

    default:
      return status;
  }
}

function getGameLabel(
  duel: DuelItem,
) {
  if (
    duel.gameCode ===
    "club_clash"
  ) {
    return "2 Takım 1 Oyuncu";
  }

  return duel.gameLabel;
}

/* =========================================================
   PAGE
========================================================= */

export default function DuelsPage() {
  const [
    incoming,
    setIncoming,
  ] =
    useState<DuelItem[]>(
      [],
    );

  const [
    outgoing,
    setOutgoing,
  ] =
    useState<DuelItem[]>(
      [],
    );

  const [
    active,
    setActive,
  ] =
    useState<DuelItem[]>(
      [],
    );

  const [
    history,
    setHistory,
  ] =
    useState<DuelItem[]>(
      [],
    );

  const [
    summary,
    setSummary,
  ] =
    useState({
      incomingCount: 0,
      outgoingCount: 0,
      activeCount: 0,
      historyCount: 0,
      completedCount: 0,
      wins: 0,
      losses: 0,
      draws: 0,
    });

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
    message,
    setMessage,
  ] =
    useState("");

  const [
    actionDuelId,
    setActionDuelId,
  ] =
    useState<number | null>(
      null,
    );

  /* =======================================================
     LOAD
  ======================================================= */

  const loadDuels =
    useCallback(
      async (
        showLoading =
          true,
      ) => {
        try {
          if (
            showLoading
          ) {
            setLoading(
              true,
            );
          }

          setError("");

          const response =
            await fetch(
              "/api/duels",
              {
                cache:
                  "no-store",
              },
            );

          const result =
            (await response.json()) as DuelsResponse;

          if (
            !response.ok ||
            !result.ok
          ) {
            throw new Error(
              result.error ??
                "Düellolar yüklenemedi.",
            );
          }

          setIncoming(
            result.incoming ??
              [],
          );

          setOutgoing(
            result.outgoing ??
              [],
          );

          setActive(
            result.active ??
              [],
          );

          setHistory(
            result.history ??
              [],
          );

          setSummary({
            incomingCount:
              result.summary
                ?.incomingCount ??
              0,

            outgoingCount:
              result.summary
                ?.outgoingCount ??
              0,

            activeCount:
              result.summary
                ?.activeCount ??
              0,

            historyCount:
              result.summary
                ?.historyCount ??
              0,

            completedCount:
              result.summary
                ?.completedCount ??
              0,

            wins:
              result.summary
                ?.wins ??
              0,

            losses:
              result.summary
                ?.losses ??
              0,

            draws:
              result.summary
                ?.draws ??
              0,
          });
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Düellolar yüklenemedi.",
          );
        } finally {
          if (
            showLoading
          ) {
            setLoading(
              false,
            );
          }
        }
      },
      [],
    );

  useEffect(() => {
    void loadDuels();
  }, [loadDuels]);

  useEffect(() => {
    const intervalId =
      window.setInterval(
        () => {
          void loadDuels(
            false,
          );
        },
        5000,
      );

    return () => {
      window.clearInterval(
        intervalId,
      );
    };
  }, [loadDuels]);

  /* =======================================================
     ACCEPT / REJECT
  ======================================================= */

  async function respondToDuel(
    duelId: number,
    action:
      | "accept"
      | "reject",
  ) {
    try {
      setActionDuelId(
        duelId,
      );

      setMessage("");
      setError("");

      const response =
        await fetch(
          "/api/duels/respond",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                duelId,
                action,
              }),
          },
        );

      const result =
        (await response.json()) as ActionResponse;

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
            "Düello işlemi başarısız.",
        );
      }

      setMessage(
        result.message ??
          (
            action ===
            "accept"
              ? "Düello kabul edildi."
              : "Düello reddedildi."
          ),
      );

      await loadDuels(
        false,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Düello işlemi başarısız.",
      );
    } finally {
      setActionDuelId(
        null,
      );
    }
  }

  /* =======================================================
     START
  ======================================================= */

  async function startDuel(
    duelId: number,
  ) {
    try {
      setActionDuelId(
        duelId,
      );

      setMessage("");
      setError("");

      const response =
        await fetch(
          "/api/duels/start",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                duelId,
              }),
          },
        );

      const result =
        (await response.json()) as ActionResponse;

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
            "Düello başlatılamadı.",
        );
      }

      setMessage(
        result.message ??
          "Düello başlatıldı.",
      );

      await loadDuels(
        false,
      );

      if (
        result.game?.url
      ) {
        window.location.href =
          result.game.url;
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Düello başlatılamadı.",
      );
    } finally {
      setActionDuelId(
        null,
      );
    }
  }

  /* =======================================================
     COMPUTED
  ======================================================= */

  const openCount =
    useMemo(
      () =>
        summary.incomingCount +
        summary.outgoingCount +
        summary.activeCount,
      [summary],
    );

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07111f] text-white">

        <div className="mx-auto max-w-[1120px] px-5 py-10">

          <div className="rounded-3xl border border-white/10 bg-[#101c2c] p-10 text-center">

            <p className="font-bold text-slate-400">
              Düellolar yükleniyor...
            </p>

          </div>

        </div>

      </main>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#07111f] text-white">

      <div className="mx-auto max-w-[1120px] px-5 py-8 sm:px-6">

        {/* HEADER */}

        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <Link
              href="/"
              className="inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/5"
            >
              ← Ana Sayfa
            </Link>

            <p className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-purple-400">
              FootBattle Arena
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Düellolar
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Arkadaşlarına 2 Takım 1 Oyuncu düellosunda meydan oku,
              davetlerini yönet ve aktif maçlarına gir.
            </p>

          </div>

          <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 px-5 py-4 text-center">

            <p className="text-xs font-black uppercase tracking-widest text-purple-300">
              Açık Düello
            </p>

            <p className="mt-1 text-3xl font-black">
              {openCount}
            </p>

          </div>

        </header>

        {/* GAME INFO */}

        <section className="mt-8 rounded-3xl border border-green-500/20 bg-green-500/[0.06] p-6">

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.2em] text-green-400">
                Aktif Düello Oyunu
              </p>

              <h2 className="mt-2 text-2xl font-black">
                2 Takım 1 Oyuncu
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                İki takımda da forma giymiş futbolcuyu rakibinden önce bul.
                5 round sonunda en yüksek skora ulaşan düelloyu kazanır.
              </p>

            </div>

            <span className="w-fit rounded-full border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm font-black text-green-300">
              ⚽ Oynanabilir
            </span>

          </div>

        </section>

        {/* MESSAGES */}

        {message && (
          <div className="mt-6 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm font-bold text-green-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
            {error}
          </div>
        )}

        {/* SUMMARY */}

        <section className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">

          <SummaryCard
            label="Gelen Davet"
            value={
              summary.incomingCount
            }
          />

          <SummaryCard
            label="Gönderilen"
            value={
              summary.outgoingCount
            }
          />

          <SummaryCard
            label="Aktif"
            value={
              summary.activeCount
            }
          />

          <SummaryCard
            label="Galibiyet"
            value={
              summary.wins
            }
          />

        </section>

        {/* INCOMING */}

        <section className="mt-10">

          <SectionTitle
            eyebrow="Meydan Okumalar"
            title="Gelen Davetler"
            count={
              incoming.length
            }
          />

          <div className="mt-4 space-y-3">

            {incoming.length ===
            0 ? (
              <EmptyState
                text="Bekleyen düello davetin yok."
              />
            ) : (
              incoming.map(
                (duel) => (
                  <DuelCard
                    key={
                      duel.id
                    }
                    duel={
                      duel
                    }
                  >

                    <button
                      type="button"
                      disabled={
                        actionDuelId ===
                        duel.id
                      }
                      onClick={() =>
                        void respondToDuel(
                          duel.id,
                          "accept",
                        )
                      }
                      className="rounded-xl bg-green-500 px-4 py-2.5 text-sm font-black text-[#07111f] transition hover:bg-green-400 disabled:opacity-50"
                    >
                      Kabul Et
                    </button>

                    <button
                      type="button"
                      disabled={
                        actionDuelId ===
                        duel.id
                      }
                      onClick={() =>
                        void respondToDuel(
                          duel.id,
                          "reject",
                        )
                      }
                      className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm font-black text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                    >
                      Reddet
                    </button>

                  </DuelCard>
                ),
              )
            )}

          </div>

        </section>

        {/* OUTGOING */}

        <section className="mt-10">

          <SectionTitle
            eyebrow="Bekleyen"
            title="Gönderilen Davetler"
            count={
              outgoing.length
            }
          />

          <div className="mt-4 space-y-3">

            {outgoing.length ===
            0 ? (
              <EmptyState
                text="Bekleyen gönderilmiş davetin yok."
              />
            ) : (
              outgoing.map(
                (duel) => (
                  <DuelCard
                    key={
                      duel.id
                    }
                    duel={
                      duel
                    }
                  >

                    <span className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-2.5 text-sm font-black text-yellow-300">
                      Rakip bekleniyor
                    </span>

                  </DuelCard>
                ),
              )
            )}

          </div>

        </section>

        {/* ACTIVE */}

        <section className="mt-10">

          <SectionTitle
            eyebrow="Arena"
            title="Aktif Düellolar"
            count={
              active.length
            }
          />

          <div className="mt-4 space-y-3">

            {active.length ===
            0 ? (
              <EmptyState
                text="Aktif düellon yok."
              />
            ) : (
              active.map(
                (duel) => (
                  <DuelCard
                    key={
                      duel.id
                    }
                    duel={
                      duel
                    }
                    highlight
                  >

                    {duel.status ===
                    "accepted" ? (
                      <button
                        type="button"
                        disabled={
                          actionDuelId ===
                          duel.id
                        }
                        onClick={() =>
                          void startDuel(
                            duel.id,
                          )
                        }
                        className="rounded-xl bg-purple-500 px-5 py-2.5 text-sm font-black text-white transition hover:bg-purple-400 disabled:opacity-50"
                      >
                        {actionDuelId ===
                        duel.id
                          ? "Hazırlanıyor..."
                          : "Oyunu Başlat"}
                      </button>
                    ) : (
                      <Link
                        href={`/duels/${duel.id}`}
                        className="rounded-xl bg-purple-500 px-5 py-2.5 text-sm font-black text-white transition hover:bg-purple-400"
                      >
                        Oyuna Gir
                      </Link>
                    )}

                  </DuelCard>
                ),
              )
            )}

          </div>

        </section>

        {/* HISTORY */}

        <section className="mt-10 pb-12">

          <SectionTitle
            eyebrow="Geçmiş"
            title="Düello Geçmişi"
            count={
              history.length
            }
          />

          <div className="mt-4 space-y-3">

            {history.length ===
            0 ? (
              <EmptyState
                text="Henüz tamamlanmış veya kapanmış düellon yok."
              />
            ) : (
              history.map(
                (duel) => (
                  <DuelCard
                    key={
                      duel.id
                    }
                    duel={
                      duel
                    }
                  >

                    <span className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-black text-slate-400">
                      {getStatusLabel(
                        duel.status,
                      )}
                    </span>

                  </DuelCard>
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
   DUEL CARD
========================================================= */

function DuelCard({
  duel,
  children,
  highlight = false,
}: {
  duel: DuelItem;
  children?: React.ReactNode;
  highlight?: boolean;
}) {
  const player =
    duel.otherPlayer;

  return (
    <article
      className={`rounded-2xl border p-5 ${
        highlight
          ? "border-purple-500/30 bg-purple-500/[0.06]"
          : "border-white/10 bg-white/[0.035]"
      }`}
    >

      <div className="flex flex-col gap-5 md:flex-row md:items-center">

        <div className="flex min-w-0 flex-1 items-center gap-4">

          <div className="relative shrink-0">

            <PlayerAvatar
              player={
                player
              }
            />

            <span
              className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#07111f] ${
                player?.online
                  ? "bg-green-400"
                  : "bg-slate-600"
              }`}
            />

          </div>

          <div className="min-w-0">

            <p className="text-xs font-black uppercase tracking-wider text-purple-400">
              {getGameLabel(
                duel,
              )}
            </p>

            {player?.username ? (
              <Link
                href={`/u/${player.username}`}
                className="mt-1 block truncate text-xl font-black transition hover:text-green-300"
              >
                {player.displayName}
              </Link>
            ) : (
              <p className="mt-1 truncate text-xl font-black">
                {player?.displayName ??
                  "Oyuncu"}
              </p>
            )}

            {player?.username && (
              <p className="mt-0.5 text-sm font-bold text-green-400">
                @{player.username}
              </p>
            )}

            <p
              className={`mt-2 text-xs font-bold ${
                player?.online
                  ? "text-green-300"
                  : "text-slate-500"
              }`}
            >
              {player?.lastSeenText ??
                "Çevrimdışı"}
            </p>

          </div>

        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">

          <MiniInfo
            label="Durum"
            value={getStatusLabel(
              duel.status,
            )}
          />

          <MiniInfo
            label="Skor"
            value={`${duel.myScore} - ${duel.opponentScore}`}
          />

          <MiniInfo
            label="Başlangıç"
            value={
              duel.startedAt
                ? formatDateTime(
                    duel.startedAt,
                  )
                : "-"
            }
          />

        </div>

        {children && (
          <div className="flex flex-wrap gap-2 md:justify-end">
            {children}
          </div>
        )}

      </div>

    </article>
  );
}

/* =========================================================
   AVATAR
========================================================= */

function PlayerAvatar({
  player,
}: {
  player: DuelPlayer | null;
}) {
  return (
    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-green-500 font-black text-[#07111f]">

      {player?.avatarUrl ? (
        <img
          src={
            player.avatarUrl
          }
          alt={
            player.displayName
          }
          className="h-full w-full object-cover"
        />
      ) : (
        getInitials(
          player,
        )
      )}

    </div>
  );
}

/* =========================================================
   SECTION TITLE
========================================================= */

function SectionTitle({
  eyebrow,
  title,
  count,
}: {
  eyebrow: string;
  title: string;
  count: number;
}) {
  return (
    <div>

      <p className="text-sm font-black uppercase tracking-widest text-purple-400">
        {eyebrow}
      </p>

      <div className="mt-2 flex items-center gap-3">

        <h2 className="text-2xl font-black">
          {title}
        </h2>

        {count > 0 && (
          <span className="rounded-full bg-purple-500 px-2.5 py-1 text-xs font-black text-white">
            {count}
          </span>
        )}

      </div>

    </div>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#101c2c] p-5">

      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black">
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   MINI INFO
========================================================= */

function MiniInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-black/20 px-3 py-2">

      <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p className="mt-1 whitespace-nowrap text-sm font-black text-slate-300">
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500">

      {text}

    </div>
  );
}