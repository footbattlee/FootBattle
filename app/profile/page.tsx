"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

/* =========================================================
   TYPES
========================================================= */

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

type FriendshipStatus =
  | "none"
  | "pending_sent"
  | "pending_received"
  | "accepted"
  | "rejected";

type FriendUser = {
  id: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  totalScore: number;
  currentStreak: number;
  gamesPlayed: number;
  gamesWon: number;

  online?: boolean;
  lastSeenAt?: string | null;
  lastSeenText?: string;
};

type FriendSearchUser = FriendUser & {
  friendship: {
    id: number | null;
    status: FriendshipStatus;
  };
};

type IncomingRequest = {
  friendshipId: number;
  createdAt: string;
  user: FriendUser;
};

type FriendListItem = {
  friendshipId: number;
  since: string;
  user: FriendUser;
};

type FriendsResponse = {
  ok?: boolean;
  error?: string;

  summary?: {
    friendCount: number;
    onlineFriendCount: number;
    incomingRequestCount: number;
  };

  incomingRequests?: IncomingRequest[];
  friends?: FriendListItem[];
};

type FriendSearchResponse = {
  ok?: boolean;
  error?: string;
  users?: FriendSearchUser[];
};

type FriendRequestResponse = {
  ok?: boolean;
  error?: string;

  friendship?: {
    id: number;
    requester_id?: string;
    addressee_id?: string;
    status?: string;
  };
};

type FriendRespondResponse = {
  ok?: boolean;
  error?: string;
};

type FriendRemoveResponse = {
  ok?: boolean;
  error?: string;
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
  return new Intl.NumberFormat("tr-TR").format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function getInitials(
  displayName: string,
  username: string | null,
) {
  const text =
    displayName ||
    username ||
    "FootBattle";

  const parts = text
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

/* =========================================================
   PAGE
========================================================= */

export default function ProfilePage() {
  /* -------------------------------------------------------
     PROFILE
  ------------------------------------------------------- */

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [results, setResults] =
    useState<GameResult[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /* -------------------------------------------------------
     FRIEND SEARCH
  ------------------------------------------------------- */

  const [friendQuery, setFriendQuery] =
    useState("");

  const [
    friendSearchResults,
    setFriendSearchResults,
  ] = useState<FriendSearchUser[]>([]);

  const [
    friendSearchLoading,
    setFriendSearchLoading,
  ] = useState(false);

  const [
    friendSearchError,
    setFriendSearchError,
  ] = useState("");

  const [
    sendingRequestTo,
    setSendingRequestTo,
  ] = useState<string | null>(null);

  /* -------------------------------------------------------
     FRIEND LIST
  ------------------------------------------------------- */

  const [
    incomingRequests,
    setIncomingRequests,
  ] = useState<IncomingRequest[]>([]);

  const [friends, setFriends] =
    useState<FriendListItem[]>([]);

  const [
    socialLoading,
    setSocialLoading,
  ] = useState(true);

  const [
    respondingRequestId,
    setRespondingRequestId,
  ] = useState<number | null>(null);

  const [
    removingFriendshipId,
    setRemovingFriendshipId,
  ] = useState<number | null>(null);

  const [
    socialMessage,
    setSocialMessage,
  ] = useState("");

  const [
    socialMessageType,
    setSocialMessageType,
  ] = useState<
    "success" | "error"
  >("success");

  const [
    friendCount,
    setFriendCount,
  ] = useState(0);

  const [
    onlineFriendCount,
    setOnlineFriendCount,
  ] = useState(0);

  /* =======================================================
     LOAD PROFILE
  ======================================================= */

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError("");

      try {
        const supabase =
          createClient();

        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          window.location.href =
            "/login";

          return;
        }

        const {
          data: profileData,
          error: profileError,
        } = await supabase
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
          throw new Error(
            "Profil kaydı bulunamadı.",
          );
        }

        const {
          data: gameResults,
          error: resultsError,
        } = await supabase
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

        setProfile(
          profileData as Profile,
        );

        setResults(
          (gameResults ??
            []) as GameResult[],
        );
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

    void loadProfile();
  }, []);

  /* =======================================================
     LOAD FRIENDS
  ======================================================= */

  const loadFriends =
    useCallback(async () => {
      try {
        setSocialLoading(true);

        const response =
          await fetch(
            "/api/friends",
            {
              cache: "no-store",
            },
          );

        const result =
          (await response.json()) as FriendsResponse;

        if (
          !response.ok ||
          !result.ok
        ) {
          throw new Error(
            result.error ??
              "Arkadaş bilgileri okunamadı.",
          );
        }

        setIncomingRequests(
          result.incomingRequests ??
            [],
        );

        setFriends(
          result.friends ?? [],
        );

        setFriendCount(
          result.summary?.friendCount ??
            result.friends?.length ??
            0,
        );

        setOnlineFriendCount(
          result.summary
            ?.onlineFriendCount ??
            (result.friends ?? []).filter(
              (friend) =>
                friend.user.online,
            ).length,
        );
      } catch (err) {
        console.error(
          "Arkadaş listesi hatası:",
          err,
        );

        setSocialMessageType(
          "error",
        );

        setSocialMessage(
          err instanceof Error
            ? err.message
            : "Arkadaş bilgileri okunamadı.",
        );
      } finally {
        setSocialLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadFriends();
  }, [loadFriends]);

  /*
   * Presence bilgisi zamanla değiştiği için
   * arkadaş listesini belirli aralıklarla yenile.
   */
  useEffect(() => {
    const intervalId =
      window.setInterval(() => {
        void loadFriends();
      }, 60_000);

    return () => {
      window.clearInterval(
        intervalId,
      );
    };
  }, [loadFriends]);

  /* =======================================================
     SEARCH USERS
  ======================================================= */

  useEffect(() => {
    const cleanQuery =
      friendQuery
        .trim()
        .replace(/^@/, "")
        .toLowerCase();

    if (cleanQuery.length < 2) {
      setFriendSearchResults([]);
      setFriendSearchError("");
      setFriendSearchLoading(false);

      return;
    }

    const controller =
      new AbortController();

    const timer =
      window.setTimeout(
        async () => {
          try {
            setFriendSearchLoading(
              true,
            );

            setFriendSearchError("");

            const response =
              await fetch(
                `/api/friends/search?q=${encodeURIComponent(
                  cleanQuery,
                )}`,
                {
                  cache: "no-store",
                  signal:
                    controller.signal,
                },
              );

            const result =
              (await response.json()) as FriendSearchResponse;

            if (
              !response.ok ||
              !result.ok
            ) {
              throw new Error(
                result.error ??
                  "Kullanıcı aranamadı.",
              );
            }

            setFriendSearchResults(
              result.users ?? [],
            );
          } catch (err) {
            if (
              err instanceof DOMException &&
              err.name ===
                "AbortError"
            ) {
              return;
            }

            console.error(
              "Arkadaş arama hatası:",
              err,
            );

            setFriendSearchResults(
              [],
            );

            setFriendSearchError(
              err instanceof Error
                ? err.message
                : "Kullanıcı aranamadı.",
            );
          } finally {
            setFriendSearchLoading(
              false,
            );
          }
        },
        350,
      );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [friendQuery]);

  /* =======================================================
     GAME SUMMARIES
  ======================================================= */

  const summaries =
    useMemo<GameSummary[]>(() => {
      return Object.entries(
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

          return {
            gameCode,
            label,
            games:
              gameResults.length,
            wins,
            losses:
              gameResults.length -
              wins,
            score:
              gameResults.reduce(
                (
                  total,
                  result,
                ) =>
                  total +
                  result.score,
                0,
              ),
          };
        },
      );
    }, [results]);

  const winRate =
    useMemo(() => {
      if (
        !profile ||
        profile.games_played === 0
      ) {
        return 0;
      }

      return Math.round(
        (profile.games_won /
          profile.games_played) *
          100,
      );
    }, [profile]);

  /* =======================================================
     LOGOUT
  ======================================================= */

  async function handleLogout() {
    const supabase =
      createClient();

    await supabase.auth.signOut();

    window.location.href = "/";
  }

  /* =======================================================
     SEND FRIEND REQUEST
  ======================================================= */

  async function sendFriendRequest(
    targetUserId: string,
  ) {
    try {
      setSendingRequestTo(
        targetUserId,
      );

      setSocialMessage("");

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
              userId:
                targetUserId,
            }),
          },
        );

      const result =
        (await response.json()) as FriendRequestResponse;

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
            "Arkadaşlık isteği gönderilemedi.",
        );
      }

      setFriendSearchResults(
        (current) =>
          current.map((item) =>
            item.id ===
            targetUserId
              ? {
                  ...item,

                  friendship: {
                    id:
                      result
                        .friendship
                        ?.id ??
                      null,

                    status:
                      "pending_sent",
                  },
                }
              : item,
          ),
      );

      setSocialMessageType(
        "success",
      );

      setSocialMessage(
        "Arkadaşlık isteği gönderildi. ✅",
      );

      await loadFriends();
    } catch (err) {
      setSocialMessageType(
        "error",
      );

      setSocialMessage(
        err instanceof Error
          ? err.message
          : "Arkadaşlık isteği gönderilemedi.",
      );
    } finally {
      setSendingRequestTo(
        null,
      );
    }
  }

  /* =======================================================
     ACCEPT / REJECT REQUEST
  ======================================================= */

  async function respondToRequest(
    friendshipId: number,
    action:
      | "accept"
      | "reject",
  ) {
    try {
      setRespondingRequestId(
        friendshipId,
      );

      setSocialMessage("");

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
              friendshipId,
              action,
            }),
          },
        );

      const result =
        (await response.json()) as FriendRespondResponse;

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
            "İstek işlenemedi.",
        );
      }

      setSocialMessageType(
        "success",
      );

      setSocialMessage(
        action === "accept"
          ? "Arkadaşlık isteği kabul edildi. 🤝"
          : "Arkadaşlık isteği reddedildi.",
      );

      await loadFriends();
    } catch (err) {
      setSocialMessageType(
        "error",
      );

      setSocialMessage(
        err instanceof Error
          ? err.message
          : "İstek işlenemedi.",
      );
    } finally {
      setRespondingRequestId(
        null,
      );
    }
  }

  /* =======================================================
     CANCEL REQUEST / REMOVE FRIEND
  ======================================================= */

  async function removeFriendship(
    friendshipId: number,
  ) {
    try {
      setRemovingFriendshipId(
        friendshipId,
      );

      setSocialMessage("");

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
              friendshipId,
            }),
          },
        );

      const result =
        (await response.json()) as FriendRemoveResponse;

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
            "Arkadaşlık kaldırılamadı.",
        );
      }

      setFriendSearchResults(
        (current) =>
          current.map((item) =>
            item.friendship.id ===
            friendshipId
              ? {
                  ...item,

                  friendship: {
                    id: null,
                    status: "none",
                  },
                }
              : item,
          ),
      );

      setSocialMessageType(
        "success",
      );

      setSocialMessage(
        "İşlem tamamlandı. ✅",
      );

      await loadFriends();
    } catch (err) {
      setSocialMessageType(
        "error",
      );

      setSocialMessage(
        err instanceof Error
          ? err.message
          : "Arkadaşlık kaldırılamadı.",
      );
    } finally {
      setRemovingFriendshipId(
        null,
      );
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07111f] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <p className="font-bold text-slate-400">
            Profil yükleniyor...
          </p>
        </div>
      </main>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error || !profile) {
    return (
      <main className="min-h-screen bg-[#07111f] text-white">
        <div className="flex min-h-screen items-center justify-center px-6">

          <div className="w-full max-w-lg rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-center">

            <h1 className="text-2xl font-black">
              Profil yüklenemedi
            </h1>

            <p className="mt-3 text-red-200">
              {error ||
                "Profil bulunamadı."}
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

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#07111f] text-white">

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <Link
              href="/"
              className="inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition hover:border-white/20 hover:text-white"
            >
              ← Ana Sayfa
            </Link>

            <h1 className="mt-5 text-4xl font-black">
              Profil
            </h1>

          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-red-400/30 bg-red-500/10 px-5 py-3 text-sm font-black text-red-300 transition hover:bg-red-500/20"
          >
            Çıkış Yap
          </button>

        </div>

        {/* =================================================
            PROFILE CARD
        ================================================= */}

        <section className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">

          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">

            <UserAvatar
              displayName={
                profile.display_name ??
                profile.username ??
                "FootBattle"
              }
              username={
                profile.username
              }
              avatarUrl={
                profile.avatar_url
              }
              size="large"
            />

            <div className="min-w-0">

              <h2 className="truncate text-3xl font-black">
                {profile.display_name ||
                  profile.username ||
                  "FootBattle Oyuncusu"}
              </h2>

              {profile.username && (
                <p className="mt-1 font-bold text-green-400">
                  @{profile.username}
                </p>
              )}

              <p className="mt-3 text-sm text-slate-500">
                FootBattle üyesi •{" "}
                {formatDate(
                  profile.created_at,
                )}
              </p>

            </div>

          </div>

          <div className="grid gap-px border-t border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-5">

            <StatCard
              label="Toplam Puan"
              value={formatNumber(
                profile.total_score,
              )}
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
              value={formatNumber(
                profile.games_played,
              )}
            />

            <StatCard
              label="Kazanma Oranı"
              value={`%${winRate}`}
            />

          </div>

        </section>

        {/* =================================================
            SOCIAL MESSAGE
        ================================================= */}

        {socialMessage && (
          <div
            className={`mt-6 rounded-xl border px-4 py-3 text-sm font-bold ${
              socialMessageType ===
              "error"
                ? "border-red-500/20 bg-red-500/10 text-red-300"
                : "border-green-500/20 bg-green-500/10 text-green-300"
            }`}
          >
            {socialMessage}
          </div>
        )}

        {/* =================================================
            INCOMING REQUESTS
        ================================================= */}

        <section className="mt-8">

          <p className="text-sm font-black uppercase tracking-widest text-blue-400">
            Arkadaşlık İstekleri
          </p>

          <h2 className="mt-2 flex items-center gap-3 text-2xl font-black">

            Gelen İstekler

            {incomingRequests.length >
              0 && (
              <span className="rounded-full bg-blue-500 px-2.5 py-1 text-xs text-white">
                {
                  incomingRequests.length
                }
              </span>
            )}

          </h2>

          <div className="mt-4 space-y-3">

            {socialLoading ? (
              <EmptyBox text="İstekler yükleniyor..." />
            ) : incomingRequests.length ===
              0 ? (
              <EmptyBox text="Bekleyen arkadaşlık isteğin yok." />
            ) : (
              incomingRequests.map(
                (request) => {

                  const processing =
                    respondingRequestId ===
                    request.friendshipId;

                  return (
                    <article
                      key={
                        request.friendshipId
                      }
                      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:flex-row sm:items-center"
                    >

                      <UserAvatar
                        {...request.user}
                      />

                      <div className="min-w-0 flex-1">

                        <p className="truncate font-black">
                          {
                            request.user
                              .displayName
                          }
                        </p>

                        {request.user
                          .username && (
                          <p className="text-sm font-bold text-green-400">
                            @
                            {
                              request.user
                                .username
                            }
                          </p>
                        )}

                        <p className="mt-1 text-xs text-slate-500">
                          {formatNumber(
                            request.user
                              .totalScore,
                          )}{" "}
                          puan
                        </p>

                      </div>

                      <div className="flex gap-2">

                        {request.user
                          .username && (
                          <Link
                            href={`/u/${request.user.username}`}
                            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-black text-slate-300 transition hover:bg-white/5"
                          >
                            Profili Gör
                          </Link>
                        )}

                        <button
                          type="button"
                          disabled={
                            processing
                          }
                          onClick={() =>
                            void respondToRequest(
                              request.friendshipId,
                              "accept",
                            )
                          }
                          className="rounded-xl bg-green-500 px-4 py-2.5 text-sm font-black text-[#07111f] transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {processing
                            ? "İşleniyor..."
                            : "Kabul Et"}
                        </button>

                        <button
                          type="button"
                          disabled={
                            processing
                          }
                          onClick={() =>
                            void respondToRequest(
                              request.friendshipId,
                              "reject",
                            )
                          }
                          className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm font-black text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Reddet
                        </button>

                      </div>

                    </article>
                  );
                },
              )
            )}

          </div>

        </section>

        {/* =================================================
            FRIEND LIST
        ================================================= */}

        <section className="mt-8">

          <p className="text-sm font-black uppercase tracking-widest text-green-400">
            Sosyal
          </p>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-2xl font-black">
                Arkadaşlarım
              </h2>

              {!socialLoading && (
                <p className="mt-1 text-sm text-slate-500">
                  {friendCount} arkadaş
                  {" • "}
                  <span className="text-green-400">
                    {onlineFriendCount} çevrimiçi
                  </span>
                </p>
              )}

            </div>

            {onlineFriendCount > 0 && (
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-xs font-black text-green-300">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                {onlineFriendCount} kişi online
              </div>
            )}

          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">

            {socialLoading ? (
              <EmptyBox text="Arkadaşlar yükleniyor..." />
            ) : friends.length === 0 ? (
              <EmptyBox text="Henüz arkadaşın yok." />
            ) : (
              friends.map(
                (friend) => {

                  const removing =
                    removingFriendshipId ===
                    friend.friendshipId;

                  const username =
                    friend.user.username;

                  return (
                    <article
                      key={
                        friend.friendshipId
                      }
                      className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
                    >

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">

                        <div className="relative shrink-0">

                          <UserAvatar
                            {...friend.user}
                          />

                          <span
                            title={
                              friend.user.online
                                ? "Çevrimiçi"
                                : "Çevrimdışı"
                            }
                            className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#0b1726] ${
                              friend.user.online
                                ? "bg-green-400"
                                : "bg-slate-600"
                            }`}
                          />

                        </div>

                        <div className="min-w-0 flex-1">

                          {username ? (
                            <Link
                              href={`/u/${username}`}
                              className="block truncate font-black transition hover:text-green-300"
                            >
                              {
                                friend.user
                                  .displayName
                              }
                            </Link>
                          ) : (
                            <p className="truncate font-black">
                              {
                                friend.user
                                  .displayName
                              }
                            </p>
                          )}

                          {username && (
                            <Link
                              href={`/u/${username}`}
                              className="text-sm font-bold text-green-400 transition hover:text-green-300"
                            >
                              @{username}
                            </Link>
                          )}

                          <div className="mt-2">

                            <p
                              className={`flex items-center gap-2 text-xs font-bold ${
                                friend.user.online
                                  ? "text-green-300"
                                  : "text-slate-500"
                              }`}
                            >

                              <span
                                className={`h-2 w-2 rounded-full ${
                                  friend.user.online
                                    ? "bg-green-400"
                                    : "bg-slate-600"
                                }`}
                              />

                              {friend.user.lastSeenText ??
                                (friend.user.online
                                  ? "Çevrimiçi"
                                  : "Çevrimdışı")}

                            </p>

                          </div>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">

                            <span>
                              {formatNumber(
                                friend.user
                                  .totalScore,
                              )}{" "}
                              puan
                            </span>

                            <span>
                              {
                                friend.user
                                  .gamesPlayed
                              }{" "}
                              oyun
                            </span>

                            <span>
                              🔥{" "}
                              {
                                friend.user
                                  .currentStreak
                              }
                            </span>

                          </div>

                        </div>

                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">

                        {username && (
                          <Link
                            href={`/u/${username}`}
                            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-black text-slate-300 transition hover:border-green-400/30 hover:bg-green-500/5 hover:text-green-300"
                          >
                            Profili Gör
                          </Link>
                        )}

                        <button
                          type="button"
                          disabled={
                            removing
                          }
                          onClick={() =>
                            void removeFriendship(
                              friend.friendshipId,
                            )
                          }
                          className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm font-black text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {removing
                            ? "Çıkarılıyor..."
                            : "Arkadaşlıktan Çıkar"}
                        </button>

                      </div>

                    </article>
                  );
                },
              )
            )}

          </div>

        </section>

        {/* =================================================
            FRIEND SEARCH
        ================================================= */}

        <section className="mt-8">

          <p className="text-sm font-black uppercase tracking-widest text-yellow-400">
            Oyuncu Bul
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Arkadaş Ekle
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Arkadaşını benzersiz
            @kullanıcıadı ile ara.
          </p>

          <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.035] p-5">

            <div className="flex items-center rounded-xl border border-white/10 bg-[#0c1929] transition focus-within:border-green-400/50">

              <span className="pl-4 font-black text-slate-500">
                @
              </span>

              <input
                type="text"
                value={friendQuery}
                onChange={(event) =>
                  setFriendQuery(
                    event.target.value,
                  )
                }
                placeholder="kullanıcıadı"
                className="min-w-0 flex-1 bg-transparent px-2 py-3.5 text-white outline-none placeholder:text-slate-600"
              />

              <span className="pr-4 text-sm text-slate-600">
                🔍
              </span>

            </div>

            <p className="mt-2 text-xs text-slate-600">
              En az 2 karakter yaz.
            </p>

            {friendSearchLoading && (
              <div className="mt-4 rounded-xl border border-white/5 bg-black/10 p-5 text-center text-sm font-bold text-slate-500">
                Kullanıcılar aranıyor...
              </div>
            )}

            {!friendSearchLoading &&
              friendSearchError && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                  {friendSearchError}
                </div>
              )}

            {!friendSearchLoading &&
              !friendSearchError &&
              friendQuery
                .trim()
                .replace(/^@/, "")
                .length >= 2 &&
              friendSearchResults.length ===
                0 && (
                <div className="mt-4 rounded-xl border border-dashed border-white/10 p-6 text-center">

                  <p className="font-bold text-slate-400">
                    Kullanıcı bulunamadı.
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    @kullanıcıadını
                    kontrol et.
                  </p>

                </div>
              )}

            {!friendSearchLoading &&
              friendSearchResults.length >
                0 && (
                <div className="mt-4 space-y-2">

                  {friendSearchResults.map(
                    (user) => {

                      const processing =
                        sendingRequestTo ===
                          user.id ||
                        (
                          user.friendship
                            .id !==
                            null &&
                          removingFriendshipId ===
                            user.friendship
                              .id
                        );

                      return (
                        <article
                          key={user.id}
                          className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/15 p-4 sm:flex-row sm:items-center"
                        >

                          <UserAvatar
                            {...user}
                          />

                          <div className="min-w-0 flex-1">

                            {user.username ? (
                              <Link
                                href={`/u/${user.username}`}
                                className="truncate font-black transition hover:text-green-300"
                              >
                                {
                                  user.displayName
                                }
                              </Link>
                            ) : (
                              <p className="truncate font-black">
                                {
                                  user.displayName
                                }
                              </p>
                            )}

                            {user.username && (
                              <Link
                                href={`/u/${user.username}`}
                                className="text-sm font-bold text-green-400 transition hover:text-green-300"
                              >
                                @{user.username}
                              </Link>
                            )}

                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">

                              <span>
                                {formatNumber(
                                  user.totalScore,
                                )}{" "}
                                puan
                              </span>

                              <span>
                                {
                                  user.gamesPlayed
                                }{" "}
                                oyun
                              </span>

                              <span>
                                🔥{" "}
                                {
                                  user.currentStreak
                                }
                              </span>

                            </div>

                          </div>

                          <div className="flex flex-wrap gap-2">

                            {user.username && (
                              <Link
                                href={`/u/${user.username}`}
                                className="shrink-0 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-black text-slate-300 transition hover:bg-white/5"
                              >
                                Profil
                              </Link>
                            )}

                            <FriendSearchAction
                              user={user}
                              loading={
                                processing
                              }
                              onSend={() =>
                                void sendFriendRequest(
                                  user.id,
                                )
                              }
                              onRemove={() => {
                                if (
                                  user
                                    .friendship
                                    .id !==
                                  null
                                ) {
                                  void removeFriendship(
                                    user
                                      .friendship
                                      .id,
                                  );
                                }
                              }}
                            />

                          </div>

                        </article>
                      );
                    },
                  )}

                </div>
              )}

          </div>

        </section>

        {/* =================================================
            GAME STATS
        ================================================= */}

        <section className="mt-10">

          <p className="text-sm font-black uppercase tracking-widest text-yellow-400">
            İstatistikler
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Oyun Bazlı Performans
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">

            {summaries.map(
              (summary) => (
                <article
                  key={
                    summary.gameCode
                  }
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
                >

                  <div className="flex items-start justify-between gap-4">

                    <div>

                      <h3 className="text-xl font-black">
                        {
                          summary.label
                        }
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {
                          summary.games
                        }{" "}
                        oyun oynandı
                      </p>

                    </div>

                    <div className="rounded-xl bg-yellow-400/10 px-3 py-2 font-black text-yellow-300">
                      {formatNumber(
                        summary.score,
                      )}{" "}
                      puan
                    </div>

                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">

                    <SmallStat
                      label="Oyun"
                      value={
                        summary.games
                      }
                    />

                    <SmallStat
                      label="Galibiyet"
                      value={
                        summary.wins
                      }
                    />

                    <SmallStat
                      label="Mağlubiyet"
                      value={
                        summary.losses
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

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">

            {results.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                Henüz oynanmış oyun yok.
              </div>
            ) : (
              results
                .slice(0, 10)
                .map((result) => (
                  <div
                    key={result.id}
                    className="flex flex-col gap-3 border-b border-white/10 bg-white/[0.025] p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                  >

                    <div>

                      <p className="font-black">
                        {GAME_LABELS[
                          result.game_code
                        ] ??
                          result.game_code}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
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

                      <span className="min-w-20 text-right font-black text-yellow-300">
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
   FRIEND SEARCH ACTION
========================================================= */

function FriendSearchAction({
  user,
  loading,
  onSend,
  onRemove,
}: {
  user: FriendSearchUser;
  loading: boolean;
  onSend: () => void;
  onRemove: () => void;
}) {
  const status =
    user.friendship?.status ??
    "none";

  if (status === "accepted") {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={onRemove}
        className="shrink-0 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm font-black text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Çıkarılıyor..."
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
        className="shrink-0 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-2.5 text-sm font-black text-yellow-300 transition hover:bg-yellow-400/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "İptal ediliyor..."
          : "İsteği İptal Et"}
      </button>
    );
  }

  if (
    status ===
    "pending_received"
  ) {
    return (
      <span className="shrink-0 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-2.5 text-sm font-black text-blue-300">
        Sana İstek Gönderdi
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={onSend}
      className="shrink-0 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-black text-[#07111f] transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading
        ? "Gönderiliyor..."
        : "Arkadaş Ekle"}
    </button>
  );
}

/* =========================================================
   USER AVATAR
========================================================= */

function UserAvatar({
  displayName,
  username,
  avatarUrl,
  size = "normal",
}: {
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  size?: "normal" | "large";
}) {
  const finalName =
    displayName ??
    username ??
    "FootBattle";

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-green-500 font-black text-[#07111f] ${
        size === "large"
          ? "h-24 w-24 rounded-3xl text-3xl"
          : "h-12 w-12 rounded-xl"
      }`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={finalName}
          className="h-full w-full object-cover"
        />
      ) : (
        getInitials(
          finalName,
          username ?? null,
        )
      )}
    </div>
  );
}

/* =========================================================
   EMPTY BOX
========================================================= */

function EmptyBox({
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

/* =========================================================
   STAT CARD
========================================================= */

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

      <p className="mt-2 text-2xl font-black">
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