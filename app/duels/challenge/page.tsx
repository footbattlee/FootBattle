"use client";

import Link from "next/link";
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

/* =========================================================
   TYPES
========================================================= */

type FriendUser = {
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

type FriendItem = {
  friendshipId: number;
  since: string | null;

  user: FriendUser;
};

type FriendsResponse = {
  ok?: boolean;
  error?: string;

  friends?: FriendItem[];
};

type DuelRequestResponse = {
  ok?: boolean;
  error?: string;
  message?: string;

  duel?: {
    id?: number;
  };
};

type GameOption = {
  code: string;
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
};

/* =========================================================
   GAME OPTIONS
========================================================= */

const GAME_OPTIONS: GameOption[] = [
  {
    code: "club_clash",

    title:
      "2 Takım 1 Oyuncu",

    description:
      "İki takımda da forma giymiş futbolcuyu rakibinden önce bul.",

    icon:
      "⚽",

    enabled:
      true,
  },
];

/* =========================================================
   HELPERS
========================================================= */

function getInitials(
  player: FriendUser,
) {
  const value =
    player.displayName ||
    player.username ||
    "FB";

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

/* =========================================================
   PAGE
========================================================= */

export default function DuelChallengePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#07111f] text-white">
          <div className="mx-auto max-w-[1050px] px-5 py-8 sm:px-6">
            <div className="rounded-3xl border border-white/10 bg-[#101c2c] p-8 text-center">
              <p className="text-sm font-bold text-slate-400">
                Düello ekranı yükleniyor...
              </p>
            </div>
          </div>
        </main>
      }
    >
      <DuelChallengeContent />
    </Suspense>
  );
}

/* =========================================================
   CONTENT
========================================================= */

function DuelChallengeContent() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const gameFromUrl =
    searchParams.get(
      "game",
    );

  const opponentFromUrl =
    searchParams.get(
      "opponent",
    );

  /* =======================================================
     FRIENDS
  ======================================================= */

  const [
    friends,
    setFriends,
  ] =
    useState<FriendItem[]>(
      [],
    );

  const [
    friendsLoading,
    setFriendsLoading,
  ] =
    useState(true);

  /* =======================================================
     SELECTIONS
  ======================================================= */

  const [
    selectedGameCode,
    setSelectedGameCode,
  ] =
    useState<string>(
      gameFromUrl ===
        "club_clash"
        ? "club_clash"
        : "",
    );

  const [
    selectedOpponent,
    setSelectedOpponent,
  ] =
    useState<FriendUser | null>(
      null,
    );

  /* =======================================================
     SEARCH
  ======================================================= */

  const [
    searchText,
    setSearchText,
  ] =
    useState(
      opponentFromUrl ??
        "",
    );

  /* =======================================================
     ACTION
  ======================================================= */

  const [
    sending,
    setSending,
  ] =
    useState(false);

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

  /* =======================================================
     LOAD FRIENDS
  ======================================================= */

  useEffect(() => {
    async function loadFriends() {
      try {
        setFriendsLoading(
          true,
        );

        const response =
          await fetch(
            "/api/friends",
            {
              cache:
                "no-store",
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
              "Arkadaşlar yüklenemedi.",
          );
        }

        const ordered =
          [
            ...(result.friends ??
              []),
          ].sort(
            (
              a,
              b,
            ) => {
              if (
                a.user.online ===
                b.user.online
              ) {
                return a.user.displayName.localeCompare(
                  b.user.displayName,
                  "tr",
                );
              }

              return a.user.online
                ? -1
                : 1;
            },
          );

        setFriends(
          ordered,
        );

        /*
         * Ana sayfadaki arkadaş butonundan
         * geldiysek rakibi otomatik seç.
         *
         * URL'de username veya id olabilir.
         */
        if (
          opponentFromUrl
        ) {
          const found =
            ordered.find(
              (
                item,
              ) =>
                item.user
                  .username ===
                  opponentFromUrl ||
                item.user.id ===
                  opponentFromUrl,
            );

          if (found) {
            setSelectedOpponent(
              found.user,
            );

            setSearchText(
              found.user.username ??
                found.user.displayName,
            );
          }
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Arkadaşlar yüklenemedi.",
        );
      } finally {
        setFriendsLoading(
          false,
        );
      }
    }

    void loadFriends();
  }, [opponentFromUrl]);

  /* =======================================================
     FILTERED FRIENDS
  ======================================================= */

  const filteredFriends =
    useMemo(() => {
      const query =
        searchText
          .trim()
          .toLocaleLowerCase(
            "tr-TR",
          );

      if (!query) {
        return friends;
      }

      return friends.filter(
        (
          item,
        ) => {
          const username =
            item.user
              .username
              ?.toLocaleLowerCase(
                "tr-TR",
              ) ?? "";

          const displayName =
            item.user
              .displayName
              .toLocaleLowerCase(
                "tr-TR",
              );

          return (
            username.includes(
              query,
            ) ||
            displayName.includes(
              query,
            )
          );
        },
      );
    }, [
      friends,
      searchText,
    ]);

  /* =======================================================
     SELECT OPPONENT
  ======================================================= */

  function selectOpponent(
    player: FriendUser,
  ) {
    setSelectedOpponent(
      player,
    );

    setSearchText(
      player.username ??
        player.displayName,
    );

    setError("");
    setMessage("");
  }

  /* =======================================================
     SEND CHALLENGE
  ======================================================= */

  async function sendChallenge() {
    if (
      sending
    ) {
      return;
    }

    if (
      !selectedOpponent
    ) {
      setError(
        "Önce rakibini seçmelisin.",
      );

      return;
    }

    if (
      !selectedGameCode
    ) {
      setError(
        "Önce düello oyununu seçmelisin.",
      );

      return;
    }

    try {
      setSending(
        true,
      );

      setError("");
      setMessage("");

      const response =
        await fetch(
          "/api/duels/request",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                opponentId:
                  selectedOpponent.id,

                gameCode:
                  selectedGameCode,
              }),
          },
        );

      const result =
        (await response.json()) as DuelRequestResponse;

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
            "Düello daveti gönderilemedi.",
        );
      }

      setMessage(
        result.message ??
          `${selectedOpponent.displayName} oyuncusuna düello daveti gönderildi. ⚔️`,
      );

      /*
       * Biraz mesaj göster,
       * sonra düellolar sayfasına dön.
       */
      window.setTimeout(
        () => {
          router.push(
            "/duels",
          );
        },
        900,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Düello daveti gönderilemedi.",
      );
    } finally {
      setSending(
        false,
      );
    }
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#07111f] text-white">

      <div className="mx-auto max-w-[1050px] px-5 py-8 sm:px-6">

        {/* HEADER */}

        <header className="border-b border-white/10 pb-6">

          <Link
            href="/"
            className="inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/5"
          >
            ← Ana Sayfa
          </Link>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-purple-400">
            FootBattle Arena
          </p>

          <h1 className="mt-2 text-4xl font-black">
            Düello Gönder
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Rakibini ve oynayacağınız oyunu seç.
            Daveti gönder, kabul ettiğinde kapışma başlasın.
          </p>

        </header>

        {/* MESSAGES */}

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm font-bold text-green-300">
            {message}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">

          {/* =================================================
              OYUN
          ================================================= */}

          <section className="rounded-3xl border border-white/10 bg-[#101c2c] p-6">

            <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">
              1. Oyun
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Oyununu seç
            </h2>

            <div className="mt-5 space-y-3">

              {GAME_OPTIONS.map(
                (
                  game,
                ) => {
                  const selected =
                    selectedGameCode ===
                    game.code;

                  return (
                    <button
                      key={
                        game.code
                      }
                      type="button"
                      disabled={
                        !game.enabled
                      }
                      onClick={() =>
                        setSelectedGameCode(
                          game.code,
                        )
                      }
                      className={`w-full rounded-2xl border p-5 text-left transition ${
                        selected
                          ? "border-purple-400/50 bg-purple-500/15"
                          : "border-white/10 bg-black/10 hover:border-white/20"
                      }`}
                    >

                      <div className="flex items-start gap-4">

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-2xl">
                          {game.icon}
                        </div>

                        <div className="min-w-0 flex-1">

                          <div className="flex items-center justify-between gap-3">

                            <p className="font-black">
                              {game.title}
                            </p>

                            {selected && (
                              <span className="rounded-full bg-purple-500 px-2.5 py-1 text-[10px] font-black">
                                SEÇİLDİ
                              </span>
                            )}

                          </div>

                          <p className="mt-2 text-sm leading-5 text-slate-500">
                            {game.description}
                          </p>

                        </div>

                      </div>

                    </button>
                  );
                },
              )}

            </div>

          </section>

          {/* =================================================
              RAKİP
          ================================================= */}

          <section className="rounded-3xl border border-white/10 bg-[#101c2c] p-6">

            <p className="text-xs font-black uppercase tracking-[0.2em] text-green-400">
              2. Rakip
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Rakibini seç
            </h2>

            <div className="mt-5">

              <input
                type="text"
                value={
                  searchText
                }
                onChange={(
                  event,
                ) => {
                  setSearchText(
                    event.target.value,
                  );

                  if (
                    selectedOpponent
                  ) {
                    setSelectedOpponent(
                      null,
                    );
                  }
                }}
                placeholder="Kullanıcı adı veya arkadaş adı..."
                className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-600 focus:border-green-400/40"
              />

            </div>

            {/* SELECTED */}

            {selectedOpponent && (
              <div className="mt-4 rounded-2xl border border-green-500/25 bg-green-500/10 p-4">

                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-green-400">
                  Seçilen Rakip
                </p>

                <div className="mt-3 flex items-center gap-3">

                  <FriendAvatar
                    player={
                      selectedOpponent
                    }
                  />

                  <div className="min-w-0 flex-1">

                    <p className="truncate font-black">
                      {
                        selectedOpponent.displayName
                      }
                    </p>

                    {selectedOpponent.username && (
                      <p className="text-xs font-bold text-green-400">
                        @
                        {
                          selectedOpponent.username
                        }
                      </p>
                    )}

                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOpponent(
                        null,
                      );

                      setSearchText(
                        "",
                      );
                    }}
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-slate-400 transition hover:text-white"
                  >
                    Değiştir
                  </button>

                </div>

              </div>
            )}

            {/* FRIEND LIST */}

            {!selectedOpponent && (
              <div className="mt-4">

                <div className="flex items-center justify-between">

                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Arkadaşların
                  </p>

                  <span className="text-xs text-slate-600">
                    {
                      filteredFriends.length
                    }
                  </span>

                </div>

                <div className="mt-3 max-h-[390px] space-y-2 overflow-y-auto pr-1">

                  {friendsLoading ? (
                    <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-500">
                      Arkadaşlar yükleniyor...
                    </div>
                  ) : filteredFriends.length ===
                    0 ? (
                    <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-500">
                      Eşleşen arkadaş bulunamadı.
                    </div>
                  ) : (
                    filteredFriends.map(
                      (
                        item,
                      ) => (
                        <button
                          key={
                            item.friendshipId
                          }
                          type="button"
                          onClick={() =>
                            selectOpponent(
                              item.user,
                            )
                          }
                          className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-black/10 p-3 text-left transition hover:border-green-400/25 hover:bg-white/[0.04]"
                        >

                          <FriendAvatar
                            player={
                              item.user
                            }
                          />

                          <div className="min-w-0 flex-1">

                            <p className="truncate text-sm font-black">
                              {
                                item.user
                                  .displayName
                              }
                            </p>

                            <div className="mt-0.5 flex items-center gap-2">

                              {item.user
                                .username && (
                                <span className="truncate text-[11px] font-bold text-green-400">
                                  @
                                  {
                                    item.user
                                      .username
                                  }
                                </span>
                              )}

                              <span
                                className={`text-[10px] font-bold ${
                                  item.user
                                    .online
                                    ? "text-green-400"
                                    : "text-slate-600"
                                }`}
                              >
                                {item.user
                                  .online
                                  ? "Çevrimiçi"
                                  : item.user
                                      .lastSeenText}
                              </span>

                            </div>

                          </div>

                          <span className="text-xs font-black text-purple-300">
                            Seç →
                          </span>

                        </button>
                      ),
                    )
                  )}

                </div>

              </div>
            )}

          </section>

        </div>

        {/* =================================================
            SUMMARY / SEND
        ================================================= */}

        <section className="mt-6 rounded-3xl border border-purple-500/20 bg-purple-500/[0.05] p-6">

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">
                Düello
              </p>

              <p className="mt-2 text-lg font-black">

                {selectedGameCode
                  ? GAME_OPTIONS.find(
                      (
                        game,
                      ) =>
                        game.code ===
                        selectedGameCode,
                    )?.title
                  : "Oyun seçilmedi"}

                {" → "}

                {selectedOpponent
                  ? selectedOpponent.displayName
                  : "Rakip seçilmedi"}

              </p>

            </div>

            <button
              type="button"
              disabled={
                sending ||
                !selectedOpponent ||
                !selectedGameCode
              }
              onClick={() =>
                void sendChallenge()
              }
              className="rounded-xl bg-purple-500 px-6 py-3.5 text-sm font-black text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending
                ? "Gönderiliyor..."
                : "⚔️ Düello Gönder"}
            </button>

          </div>

        </section>

      </div>

    </main>
  );
}

/* =========================================================
   FRIEND AVATAR
========================================================= */

function FriendAvatar({
  player,
}: {
  player: FriendUser;
}) {
  return (
    <div className="relative shrink-0">

      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-green-500 text-xs font-black text-[#07111f]">

        {player.avatarUrl ? (
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

      <span
        className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#101c2c] ${
          player.online
            ? "bg-green-400"
            : "bg-slate-600"
        }`}
      />

    </div>
  );
}