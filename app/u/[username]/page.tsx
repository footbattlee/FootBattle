"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

/* =========================================================
   TYPES
========================================================= */

type FriendshipStatus =
  | "none"
  | "pending_sent"
  | "pending_received"
  | "accepted"
  | "rejected";

type PublicUser = {
  id: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;

  totalScore: number;
  currentStreak: number;
  bestStreak: number;

  gamesPlayed: number;
  gamesWon: number;
  winRate: number;

  createdAt: string;
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

type UserResponse = {
  ok?: boolean;
  error?: string;

  isOwnProfile?: boolean;

  profile?: PublicUser;

  friendship?: {
    id: number | null;
    status: FriendshipStatus;
  };

  results?: GameResult[];
};

type ActionResponse = {
  ok?: boolean;
  error?: string;

  friendship?: {
    id: number;
    requester_id?: string;
    addressee_id?: string;
    status?: string;
  };
};

/* =========================================================
   CONSTANTS
========================================================= */

const GAME_LABELS: Record<string, string> = {
  wordle: "Wordle",
  guess_the_player: "Guess the Player",
  player_quiz: "Player Quiz",
  career_path: "Career Path",
};

/* =========================================================
   HELPERS
========================================================= */

function formatNumber(value: number) {
  return new Intl.NumberFormat(
    "tr-TR",
  ).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(new Date(value));
}

function getInitials(
  displayName: string,
  username: string | null,
) {
  const value =
    displayName?.trim() ||
    username?.trim() ||
    "FootBattle";

  const parts = value
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

/* =========================================================
   PAGE
========================================================= */

export default function PublicUserPage() {
  const params =
    useParams<{
      username: string;
    }>();

  const username =
    decodeURIComponent(
      params.username ?? "",
    )
      .trim()
      .replace(/^@/, "")
      .toLowerCase();

  const [profile, setProfile] =
    useState<PublicUser | null>(null);

  const [results, setResults] =
    useState<GameResult[]>([]);

  const [
    friendship,
    setFriendship,
  ] = useState<{
    id: number | null;
    status: FriendshipStatus;
  }>({
    id: null,
    status: "none",
  });

  const [
    isOwnProfile,
    setIsOwnProfile,
  ] = useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  /* =======================================================
     LOAD PROFILE
  ======================================================= */

  const loadProfile =
    useCallback(
      async (
        showLoading = true,
      ) => {
        if (!username) {
          return;
        }

        try {
          if (showLoading) {
            setLoading(true);
          }

          setError("");

          const response =
            await fetch(
              `/api/users/${encodeURIComponent(
                username,
              )}`,
              {
                method: "GET",
                cache: "no-store",
              },
            );

          const data =
            (await response.json()) as UserResponse;

          if (
            !response.ok ||
            !data.ok ||
            !data.profile
          ) {
            throw new Error(
              data.error ??
                "Kullanıcı bulunamadı.",
            );
          }

          setProfile(
            data.profile,
          );

          setResults(
            data.results ?? [],
          );

          setFriendship(
            data.friendship ?? {
              id: null,
              status: "none",
            },
          );

          setIsOwnProfile(
            Boolean(
              data.isOwnProfile,
            ),
          );
        } catch (err) {
          console.error(
            "Public profil yükleme hatası:",
            err,
          );

          setProfile(null);

          setError(
            err instanceof Error
              ? err.message
              : "Profil yüklenemedi.",
          );
        } finally {
          if (showLoading) {
            setLoading(false);
          }
        }
      },
      [username],
    );

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  /* =======================================================
     SEND FRIEND REQUEST
  ======================================================= */

  async function sendFriendRequest() {
    if (!profile) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const response =
        await fetch(
          "/api/friends/request",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              userId: profile.id,
            }),
          },
        );

      const data =
        (await response.json()) as ActionResponse;

      if (
        !response.ok ||
        !data.ok
      ) {
        throw new Error(
          data.error ??
            "Arkadaşlık isteği gönderilemedi.",
        );
      }

      setFriendship({
        id:
          data.friendship?.id ??
          null,

        status:
          "pending_sent",
      });

      setMessage(
        "Arkadaşlık isteği gönderildi. ✅",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Arkadaşlık isteği gönderilemedi.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  /* =======================================================
     REMOVE / CANCEL
  ======================================================= */

  async function removeFriendship() {
    if (
      friendship.id === null
    ) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const previousStatus =
        friendship.status;

      const response =
        await fetch(
          "/api/friends/remove",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              friendshipId:
                friendship.id,
            }),
          },
        );

      const data =
        (await response.json()) as ActionResponse;

      if (
        !response.ok ||
        !data.ok
      ) {
        throw new Error(
          data.error ??
            "Arkadaşlık işlemi gerçekleştirilemedi.",
        );
      }

      setFriendship({
        id: null,
        status: "none",
      });

      setMessage(
        previousStatus ===
          "accepted"
          ? "Arkadaşlıktan çıkarıldı."
          : "Arkadaşlık isteği iptal edildi.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "İşlem gerçekleştirilemedi.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  /* =======================================================
     ACCEPT / REJECT
  ======================================================= */

  async function respondToRequest(
    action:
      | "accept"
      | "reject",
  ) {
    if (
      friendship.id === null
    ) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const response =
        await fetch(
          "/api/friends/respond",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              friendshipId:
                friendship.id,
              action,
            }),
          },
        );

      const data =
        (await response.json()) as ActionResponse;

      if (
        !response.ok ||
        !data.ok
      ) {
        throw new Error(
          data.error ??
            "Arkadaşlık isteği güncellenemedi.",
        );
      }

      if (
        action === "accept"
      ) {
        setFriendship(
          (current) => ({
            ...current,
            status:
              "accepted",
          }),
        );

        setMessage(
          "Arkadaşlık isteği kabul edildi. 🤝",
        );
      } else {
        setFriendship({
          id:
            friendship.id,
          status:
            "rejected",
        });

        setMessage(
          "Arkadaşlık isteği reddedildi.",
        );
      }

      await loadProfile(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "İşlem gerçekleştirilemedi.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07111f] text-white">

        <div className="mx-auto max-w-[1120px] px-5 py-8 sm:px-6">

          <div className="rounded-[24px] border border-white/10 bg-[#101c2c] p-10 text-center">

            <p className="font-bold text-slate-400">
              Profil yükleniyor...
            </p>

          </div>

        </div>

      </main>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (
    error &&
    !profile
  ) {
    return (
      <main className="min-h-screen bg-[#07111f] text-white">

        <div className="mx-auto max-w-[1120px] px-5 py-8 sm:px-6">

          <Link
            href="/"
            className="inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/5"
          >
            ← Ana Sayfa
          </Link>

          <div className="mt-8 rounded-[24px] border border-red-500/20 bg-[#101c2c] p-10 text-center">

            <div className="text-5xl">
              ⚠️
            </div>

            <h1 className="mt-5 text-3xl font-black">
              Profil bulunamadı
            </h1>

            <p className="mt-3 text-slate-400">
              {error}
            </p>

          </div>

        </div>

      </main>
    );
  }

  if (!profile) {
    return null;
  }

  /* =======================================================
     GAME SUMMARIES
  ======================================================= */

  const gameSummaries =
    Object.entries(
      GAME_LABELS,
    ).map(
      ([gameCode, label]) => {
        const gameResults =
          results.filter(
            (result) =>
              result.game_code ===
              gameCode,
          );

        const wins =
          gameResults.filter(
            (result) =>
              result.won,
          ).length;

        const totalScore =
          gameResults.reduce(
            (
              total,
              result,
            ) =>
              total +
              result.score,
            0,
          );

        return {
          gameCode,
          label,
          games:
            gameResults.length,
          wins,
          losses:
            gameResults.length -
            wins,
          totalScore,
        };
      },
    );

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#07111f] text-white">

      <div className="mx-auto max-w-[1120px] px-5 py-8 sm:px-6">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="flex items-center justify-between border-b border-white/10 pb-6">

          <Link
            href="/"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/5"
          >
            ← Ana Sayfa
          </Link>

          <div className="text-center">

            <p className="text-lg font-black">
              FootBattle
            </p>

            <p className="text-xs text-slate-500">
              Oyuncu Profili
            </p>

          </div>

          <Link
            href="/profile"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/5"
          >
            Profilim
          </Link>

        </header>

        {/* =================================================
            PROFILE HERO
        ================================================= */}

        <section className="mt-8 overflow-hidden rounded-[24px] border border-white/10 bg-[#101c2c]">

          <div className="relative p-7 sm:p-8">

            <div className="absolute inset-x-0 top-0 h-[3px] bg-green-400" />

            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">

                {/* AVATAR */}

                {profile.avatarUrl ? (
                  <img
                    src={
                      profile.avatarUrl
                    }
                    alt={
                      profile.displayName
                    }
                    className="h-24 w-24 rounded-[24px] border border-green-400/30 object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[24px] border border-green-400/30 bg-green-500 text-2xl font-black text-[#07111f]">

                    {getInitials(
                      profile.displayName,
                      profile.username,
                    )}

                  </div>
                )}

                <div className="text-center sm:text-left">

                  <p className="text-xs font-black uppercase tracking-[0.2em] text-green-400">
                    FootBattle Oyuncusu
                  </p>

                  <h1 className="mt-2 text-3xl font-black">
                    {
                      profile.displayName
                    }
                  </h1>

                  {profile.username && (
                    <p className="mt-1 font-bold text-slate-400">
                      @{profile.username}
                    </p>
                  )}

                  <p className="mt-3 text-xs text-slate-500">
                    Üyelik:{" "}
                    {formatDate(
                      profile.createdAt,
                    )}
                  </p>

                  {/* FRIENDSHIP STATUS */}

                  {!isOwnProfile && (
                    <div className="mt-4">

                      {friendship.status ===
                        "accepted" && (
                        <span className="inline-flex rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-black text-green-300">
                          ✓ Arkadaşsınız
                        </span>
                      )}

                      {friendship.status ===
                        "pending_sent" && (
                        <span className="inline-flex rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-black text-yellow-300">
                          İstek gönderildi
                        </span>
                      )}

                      {friendship.status ===
                        "pending_received" && (
                        <span className="inline-flex rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs font-black text-blue-300">
                          Sana istek gönderdi
                        </span>
                      )}

                    </div>
                  )}

                </div>

              </div>

              {/* ACTION */}

              <div className="flex shrink-0 flex-wrap justify-center gap-2">

                {isOwnProfile ? (
                  <Link
                    href="/profile"
                    className="rounded-xl bg-green-500 px-5 py-3 text-sm font-black text-[#07111f] transition hover:bg-green-400"
                  >
                    Profilimi Yönet
                  </Link>
                ) : (
                  <FriendAction
                    status={
                      friendship.status
                    }
                    loading={
                      actionLoading
                    }
                    onSend={() =>
                      void sendFriendRequest()
                    }
                    onRemove={() =>
                      void removeFriendship()
                    }
                    onAccept={() =>
                      void respondToRequest(
                        "accept",
                      )
                    }
                    onReject={() =>
                      void respondToRequest(
                        "reject",
                      )
                    }
                  />
                )}

              </div>

            </div>

          </div>

          {/* MAIN STATS */}

          <div className="grid gap-px border-t border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-5">

            <StatCard
              label="Toplam Puan"
              value={formatNumber(
                profile.totalScore,
              )}
              accent="text-yellow-300"
            />

            <StatCard
              label="Güncel Seri"
              value={`${profile.currentStreak} 🔥`}
            />

            <StatCard
              label="En İyi Seri"
              value={`${profile.bestStreak} gün`}
            />

            <StatCard
              label="Oynanan Oyun"
              value={formatNumber(
                profile.gamesPlayed,
              )}
            />

            <StatCard
              label="Kazanma Oranı"
              value={`%${profile.winRate}`}
              accent="text-green-300"
            />

          </div>

        </section>

        {/* =================================================
            ACTION MESSAGE
        ================================================= */}

        {(message ||
          (error &&
            profile)) && (
          <div
            className={`mt-5 rounded-xl border px-4 py-3 text-sm font-bold ${
              error
                ? "border-red-500/20 bg-red-500/10 text-red-300"
                : "border-green-500/20 bg-green-500/10 text-green-300"
            }`}
          >
            {error || message}
          </div>
        )}

        {/* =================================================
            GAME PERFORMANCE
        ================================================= */}

        <section className="mt-8">

          <p className="text-sm font-black uppercase tracking-widest text-yellow-400">
            İstatistikler
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Oyun Bazlı Performans
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">

            {gameSummaries.map(
              (game) => (
                <article
                  key={
                    game.gameCode
                  }
                  className="rounded-[20px] border border-white/10 bg-[#101c2c] p-5"
                >

                  <div className="flex items-start justify-between gap-4">

                    <div>

                      <h3 className="text-lg font-black">
                        {game.label}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        {game.games} oyun
                      </p>

                    </div>

                    <div className="rounded-xl bg-yellow-400/10 px-3 py-2 text-sm font-black text-yellow-300">
                      {formatNumber(
                        game.totalScore,
                      )}{" "}
                      P
                    </div>

                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">

                    <SmallStat
                      label="Oyun"
                      value={
                        game.games
                      }
                    />

                    <SmallStat
                      label="Galibiyet"
                      value={
                        game.wins
                      }
                    />

                    <SmallStat
                      label="Mağlubiyet"
                      value={
                        game.losses
                      }
                    />

                  </div>

                </article>
              ),
            )}

          </div>

        </section>

        {/* =================================================
            GAME HISTORY
        ================================================= */}

        <section className="mt-8 pb-12">

          <p className="text-sm font-black uppercase tracking-widest text-green-400">
            Geçmiş
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Son Oyunlar
          </h2>

          <div className="mt-5 overflow-hidden rounded-[20px] border border-white/10">

            {results.length === 0 ? (
              <div className="bg-[#101c2c] p-8 text-center text-sm text-slate-500">
                Henüz oynanmış oyun yok.
              </div>
            ) : (
              results
                .slice(0, 10)
                .map((result) => (
                  <div
                    key={result.id}
                    className="flex flex-col gap-3 border-b border-white/10 bg-[#101c2c] p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                  >

                    <div>

                      <p className="font-black">
                        {GAME_LABELS[
                          result.game_code
                        ] ??
                          result.game_code}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(
                          result.play_date,
                        )}
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

                      <span className="min-w-16 text-right font-black text-yellow-300">
                        {formatNumber(
                          result.score,
                        )}{" "}
                        P
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

/* =========================================================
   FRIEND ACTION
========================================================= */

function FriendAction({
  status,
  loading,
  onSend,
  onRemove,
  onAccept,
  onReject,
}: {
  status: FriendshipStatus;
  loading: boolean;
  onSend: () => void;
  onRemove: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  if (
    status === "accepted"
  ) {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={onRemove}
        className="rounded-xl border border-red-400/30 bg-red-500/10 px-5 py-3 text-sm font-black text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "İşleniyor..."
          : "Arkadaşlıktan Çıkar"}
      </button>
    );
  }

  if (
    status ===
    "pending_sent"
  ) {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={onRemove}
        className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-5 py-3 text-sm font-black text-yellow-300 transition hover:bg-yellow-400/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "İşleniyor..."
          : "İsteği İptal Et"}
      </button>
    );
  }

  if (
    status ===
    "pending_received"
  ) {
    return (
      <>
        <button
          type="button"
          disabled={loading}
          onClick={onAccept}
          className="rounded-xl bg-green-500 px-5 py-3 text-sm font-black text-[#07111f] transition hover:bg-green-400 disabled:opacity-50"
        >
          {loading
            ? "İşleniyor..."
            : "Kabul Et"}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={onReject}
          className="rounded-xl border border-red-400/30 bg-red-500/10 px-5 py-3 text-sm font-black text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
        >
          Reddet
        </button>
      </>
    );
  }

  /*
   * rejected durumunda da yeniden
   * arkadaşlık isteği gönderilebilir.
   */

  return (
    <button
      type="button"
      disabled={loading}
      onClick={onSend}
      className="rounded-xl bg-green-500 px-5 py-3 text-sm font-black text-[#07111f] transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading
        ? "Gönderiliyor..."
        : "+ Arkadaş Ekle"}
    </button>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  label,
  value,
  accent = "text-white",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="bg-[#0c1929] p-5">

      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-xl font-black ${accent}`}
      >
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   SMALL STAT
========================================================= */

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