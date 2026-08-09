"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import LeaderboardCard from "../components/LeaderboardCard";
import { createClient } from "../lib/supabase/client";

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
};

type HomeUser = {
  id: string;
  email?: string;
};

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

  summary?: {
    friendCount: number;
    onlineFriendCount: number;
    incomingRequestCount?: number;
  };

  friends?: FriendItem[];
};

/* =========================================================
   DUEL TYPES
========================================================= */

type DuelPlayer = {
  id: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;

  online: boolean;
  lastSeenText: string;
};

type IncomingDuel = {
  id: number;

  gameCode: string;
  gameLabel: string;

  status: string;

  otherPlayer:
    | DuelPlayer
    | null;

  createdAt: string;
};

type DuelsResponse = {
  ok?: boolean;
  error?: string;

  summary?: {
    incomingCount?: number;
  };

  incoming?: IncomingDuel[];
};

type DuelRespondResponse = {
  ok?: boolean;
  error?: string;
  message?: string;

  duel?: {
    id?: number;
    status?: string;
  };
};

/* =========================================================
   ROTATING HERO GAME
========================================================= */

type HeroGame = {
  title: string;
  shortTitle: string;
  description: string;
  href: string;
  accent: string;
};

const HERO_GAMES: HeroGame[] = [
  {
    title: "Wordle",
    shortTitle: "Wordle Oyna",
    description:
      "Futbolcunun soyadını 5 tahminde bul.",
    href: "/wordle",
    accent: "🟩",
  },

  {
    title: "Guess the Player",
    shortTitle:
      "Guess the Player Oyna",
    description:
      "İpuçlarını karşılaştır ve gizli futbolcuyu bul.",
    href: "/guess-the-player",
    accent: "🕵️",
  },

  {
    title: "Player Quiz",
    shortTitle:
      "Player Quiz Oyna",
    description:
      "Doğum yılı, uyruk ve kariyer kulüplerini tamamla.",
    href: "/player-quiz",
    accent: "🧠",
  },

  {
    title: "Career Path",
    shortTitle:
      "Career Path Oyna",
    description:
      "Futbolcunun kariyerindeki kulüpleri bul.",
    href: "/career-path",
    accent: "🛣️",
  },
];

/* =========================================================
   DATA
========================================================= */

const games = [
  {
    title:
      "Wordle",

    description:
      "Futbolcunun soyadını 5 tahminde bul.",

    href:
      "/wordle",

    tag:
      "SINIRSIZ",
  },

  {
    title:
      "Guess the Player",

    description:
      "İpuçlarını takip et, gizli futbolcuyu tahmin et.",

    href:
      "/guess-the-player",

    tag:
      "SINIRSIZ",
  },

  {
    title:
      "Player Quiz",

    description:
      "Doğum yılı, uyruk ve kariyer kulüplerini tamamla.",

    href:
      "/player-quiz",

    tag:
      "SINIRSIZ",
  },

  {
    title:
      "Career Path",

    description:
      "Oyuncunun kariyerinde forma giydiği kulüpleri bul.",

    href:
      "/career-path",

    tag:
      "SINIRSIZ",
  },
];

const builders = [
  {
    title:
      "Takım Kadro Oluşturucu",

    description:
      "Takımını seç, ilk 11'i düzenle, transfer ekle ve paylaş.",

    href:
      "/takim-kadro",

    button:
      "Kadronu Kur",

    icon:
      "⚽",
  },

  {
    title:
      "Halısaha Kadro Oluşturucu",

    description:
      "Arkadaşlarını sahaya diz, kadronu oluştur ve paylaş.",

    href:
      "/halisaha-kadro",

    button:
      "Halısaha Kadrosu Kur",

    icon:
      "👟",
  },
];

/* =========================================================
   HELPERS
========================================================= */

function getFriendInitials(
  friend: FriendUser,
) {
  const value =
    friend.displayName ||
    friend.username ||
    "FB";

  const parts =
    value
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length ===
    0
  ) {
    return "FB";
  }

  if (
    parts.length ===
    1
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

function getDuelInitials(
  player: DuelPlayer,
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
    parts[0].slice(0, 1) +
    parts[
      parts.length - 1
    ].slice(0, 1)
  ).toUpperCase();
}

/* =========================================================
   PAGE
========================================================= */

export default function HomePage() {
  const [
    user,
    setUser,
  ] =
    useState<HomeUser | null>(
      null,
    );

  const [
    profile,
    setProfile,
  ] =
    useState<Profile | null>(
      null,
    );

  const [
    loadingUser,
    setLoadingUser,
  ] =
    useState(true);

  /* =======================================================
     HERO ROTATION
  ======================================================= */

  const [
    activeHeroGameIndex,
    setActiveHeroGameIndex,
  ] =
    useState(0);

  const activeHeroGame =
    HERO_GAMES[
      activeHeroGameIndex
    ];

  useEffect(() => {
    const intervalId =
      window.setInterval(
        () => {
          setActiveHeroGameIndex(
            (current) =>
              (
                current +
                1
              ) %
              HERO_GAMES.length,
          );
        },
        15_000,
      );

    return () => {
      window.clearInterval(
        intervalId,
      );
    };
  }, []);

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
    friendCount,
    setFriendCount,
  ] =
    useState(0);

  const [
    onlineFriendCount,
    setOnlineFriendCount,
  ] =
    useState(0);

  const [
    friendsLoading,
    setFriendsLoading,
  ] =
    useState(false);

  /* =======================================================
     DUELS
  ======================================================= */

  const [
    incomingDuels,
    setIncomingDuels,
  ] =
    useState<IncomingDuel[]>(
      [],
    );

  const [
    duelsLoading,
    setDuelsLoading,
  ] =
    useState(false);

  const [
    duelActionId,
    setDuelActionId,
  ] =
    useState<number | null>(
      null,
    );

  const [
    duelMessage,
    setDuelMessage,
  ] =
    useState("");

  const [
    duelError,
    setDuelError,
  ] =
    useState("");

  /* =======================================================
     LOAD USER
  ======================================================= */

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase =
          createClient();

        const {
          data: {
            user:
              authUser,
          },
        } =
          await supabase.auth.getUser();

        if (!authUser) {
          setUser(
            null,
          );

          setProfile(
            null,
          );

          return;
        }

        setUser({
          id:
            authUser.id,

          email:
            authUser.email,
        });

        const {
          data:
            profileData,
        } =
          await supabase
            .from(
              "profiles",
            )
            .select(`
              id,
              username,
              display_name,
              avatar_url,
              total_score,
              current_streak,
              best_streak,
              games_played,
              games_won
            `)
            .eq(
              "id",
              authUser.id,
            )
            .maybeSingle();

        if (
          profileData
        ) {
          setProfile(
            profileData as Profile,
          );
        }
      } finally {
        setLoadingUser(
          false,
        );
      }
    }

    void loadUser();
  }, []);

  /* =======================================================
     LOAD FRIENDS
  ======================================================= */

  useEffect(() => {
    if (!user) {
      setFriends(
        [],
      );

      setFriendCount(
        0,
      );

      setOnlineFriendCount(
        0,
      );

      return;
    }

    let cancelled =
      false;

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
          cancelled
        ) {
          return;
        }

        if (
          !response.ok ||
          !result.ok
        ) {
          return;
        }

        const orderedFriends =
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
                return (
                  a.user.displayName.localeCompare(
                    b.user.displayName,
                    "tr",
                  )
                );
              }

              return a.user
                .online
                ? -1
                : 1;
            },
          );

        setFriends(
          orderedFriends,
        );

        setFriendCount(
          result.summary
            ?.friendCount ??
            orderedFriends.length,
        );

        setOnlineFriendCount(
          result.summary
            ?.onlineFriendCount ??
            orderedFriends.filter(
              (
                item,
              ) =>
                item.user
                  .online,
            ).length,
        );
      } catch {
        /*
         * Ana sayfa arkadaş API'si
         * yüzünden bozulmasın.
         */
      } finally {
        if (
          !cancelled
        ) {
          setFriendsLoading(
            false,
          );
        }
      }
    }

    void loadFriends();

    const intervalId =
      window.setInterval(
        () => {
          void loadFriends();
        },
        15_000,
      );

    return () => {
      cancelled =
        true;

      window.clearInterval(
        intervalId,
      );
    };
  }, [user]);

  /* =======================================================
     LOAD DUELS
  ======================================================= */

  useEffect(() => {
    if (!user) {
      setIncomingDuels(
        [],
      );

      return;
    }

    let cancelled =
      false;

    async function loadDuels() {
      try {
        setDuelsLoading(
          true,
        );

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
          cancelled
        ) {
          return;
        }

        if (
          !response.ok ||
          !result.ok
        ) {
          return;
        }

        setIncomingDuels(
          result.incoming ??
            [],
        );
      } catch {
        /*
         * Düello API'si ana sayfayı
         * bozmasın.
         */
      } finally {
        if (!cancelled) {
          setDuelsLoading(
            false,
          );
        }
      }
    }

    void loadDuels();

    /*
     * Yeni düello davetleri hızlı
     * fark edilsin.
     */
    const intervalId =
      window.setInterval(
        () => {
          void loadDuels();
        },
        10_000,
      );

    return () => {
      cancelled =
        true;

      window.clearInterval(
        intervalId,
      );
    };
  }, [user]);

  /* =======================================================
     RESPOND DUEL
  ======================================================= */

  async function respondToDuel(
    duelId: number,
    action:
      | "accept"
      | "reject",
  ) {
    if (
      duelActionId !==
      null
    ) {
      return;
    }

    try {
      setDuelActionId(
        duelId,
      );

      setDuelError(
        "",
      );

      setDuelMessage(
        "",
      );

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
        (await response.json()) as DuelRespondResponse;

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
            "Düello daveti cevaplanamadı.",
        );
      }

      /*
       * Kartı anında kaldır.
       */
      setIncomingDuels(
        (current) =>
          current.filter(
            (duel) =>
              duel.id !==
              duelId,
          ),
      );

      if (
        action ===
        "accept"
      ) {
        setDuelMessage(
          "Düello kabul edildi. Arena açılıyor... ⚔️",
        );

        window.setTimeout(
          () => {
            window.location.href =
              `/duels/${duelId}`;
          },
          500,
        );

        return;
      }

      setDuelMessage(
        "Düello daveti reddedildi.",
      );
    } catch (error) {
      setDuelError(
        error instanceof Error
          ? error.message
          : "Düello daveti cevaplanamadı.",
      );
    } finally {
      setDuelActionId(
        null,
      );
    }
  }

  /* =======================================================
     LOGOUT
  ======================================================= */

  async function handleLogout() {
    const supabase =
      createClient();

    await supabase.auth.signOut();

    window.location.href =
      "/";
  }

  /* =======================================================
     SCROLL
  ======================================================= */

  function scrollToSection(
    id: string,
  ) {
    const element =
      document.getElementById(
        id,
      );

    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior:
        "smooth",

      block:
        "start",
    });
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#07111f] text-white">

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07111f]/95 shadow-lg shadow-black/10 backdrop-blur-xl">

        <div className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between px-5 lg:px-6">

          <Link
            href="/"
            className="flex items-center gap-3"
          >

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500 text-base font-black text-[#07111f] shadow-lg shadow-green-500/20">
              FB
            </div>

            <div>

              <p className="text-lg font-black leading-none">
                FootBattle
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Futbol oyunları arenası
              </p>

            </div>

          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-400 xl:flex">

            <button
              type="button"
              onClick={() =>
                scrollToSection(
                  "anasayfa",
                )
              }
              className="text-green-400 transition hover:text-green-300"
            >
              Ana Sayfa
            </button>

            <button
              type="button"
              onClick={() =>
                scrollToSection(
                  "oyunlar",
                )
              }
              className="transition hover:text-white"
            >
              Oyunlar
            </button>

            <button
              type="button"
              onClick={() =>
                scrollToSection(
                  "duellolar",
                )
              }
              className="transition hover:text-white"
            >
              Düellolar
            </button>

            <Link
              href="/takim-kadro"
              className="transition hover:text-white"
            >
              Kadro Kur
            </Link>

            <Link
              href="/halisaha-kadro"
              className="transition hover:text-white"
            >
              Halısaha Kadro
            </Link>

            <button
              type="button"
              onClick={() =>
                scrollToSection(
                  "liderlik",
                )
              }
              className="transition hover:text-white"
            >
              Liderlik
            </button>

          </nav>

          <div className="flex items-center gap-2">

            {!loadingUser &&
              user &&
              profile && (
                <>

                  <Link
                    href="/profile"
                    className="rounded-xl border border-green-500/25 bg-green-500/10 px-4 py-2.5 text-sm font-black text-green-400 transition hover:bg-green-500/15"
                  >
                    {profile.display_name ||
                      profile.username ||
                      "Profil"}
                  </Link>

                  <button
                    type="button"
                    onClick={
                      handleLogout
                    }
                    className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-black text-slate-300 transition hover:border-white/20 hover:text-white"
                  >
                    Çıkış
                  </button>

                </>
              )}

            {!loadingUser &&
              !user && (
                <Link
                  href="/login"
                  className="rounded-xl bg-green-500 px-4 py-2.5 text-sm font-black text-[#07111f] transition hover:bg-green-400"
                >
                  Giriş Yap
                </Link>
              )}

          </div>

        </div>

      </header>

      {/* ===================================================
          HERO
      =================================================== */}

      <section
        id="anasayfa"
        className="scroll-mt-24"
      >

        <div className="mx-auto grid max-w-[1180px] gap-8 px-5 pb-12 pt-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.75fr)] lg:px-6">

          {/* LEFT */}

          <div className="flex flex-col justify-start pt-8">

            {/* ROTATING GAME BADGE */}

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-black text-green-400">

              <span>
                {
                  activeHeroGame.accent
                }
              </span>

              <span>
                Sınırsız oyun
              </span>

              <span className="text-green-300/60">
                •
              </span>

              <span>
                {
                  activeHeroGame.title
                }
              </span>

            </div>

            <h1 className="mt-5 max-w-[620px] text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-[54px]">

              Futbol bilgini

              <span className="mt-2 block text-green-400">
                kanıtlamaya hazır
              </span>

              <span className="block text-green-400">
                mısın?
              </span>

            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">
              Hazırsan başlayalım...
              ama kaybedersen kol bozuk
              demek yok.
            </p>

            {/* ROTATING GAME INFO */}

            <div className="mt-5 max-w-xl rounded-2xl border border-green-500/10 bg-green-500/[0.035] px-4 py-3">

              <div className="flex items-center gap-3">

                <span className="text-xl">
                  {
                    activeHeroGame.accent
                  }
                </span>

                <div>

                  <p className="text-sm font-black text-white">
                    {
                      activeHeroGame.title
                    }
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {
                      activeHeroGame.description
                    }
                  </p>

                </div>

              </div>

              {/* ROTATION DOTS */}

              <div className="mt-3 flex gap-1.5">

                {HERO_GAMES.map(
                  (
                    game,
                    index,
                  ) => (
                    <button
                      key={
                        game.href
                      }
                      type="button"
                      aria-label={
                        game.title
                      }
                      onClick={() =>
                        setActiveHeroGameIndex(
                          index,
                        )
                      }
                      className={`h-1.5 rounded-full transition-all ${
                        index ===
                        activeHeroGameIndex
                          ? "w-8 bg-green-400"
                          : "w-3 bg-white/10 hover:bg-white/20"
                      }`}
                    />
                  ),
                )}

              </div>

            </div>

            <div className="mt-5 flex flex-wrap gap-3">

              <Link
                href={
                  activeHeroGame.href
                }
                className="rounded-xl bg-green-500 px-6 py-3.5 text-sm font-black text-[#07111f] transition hover:-translate-y-0.5 hover:bg-green-400"
              >
                {activeHeroGame.accent}{" "}
                {
                  activeHeroGame.shortTitle
                }
              </Link>

              <Link
                href={
                  user
                    ? "/duels/challenge?game=club_clash"
                    : "/login"
                }
                className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-6 py-3.5 text-sm font-black text-purple-300 transition hover:-translate-y-0.5 hover:bg-purple-500/20"
              >
                ⚔️ Düello Yap
              </Link>

              <button
                type="button"
                onClick={() =>
                  scrollToSection(
                    "oyunlar",
                  )
                }
                className="rounded-xl border border-white/15 px-6 py-3.5 text-sm font-black text-slate-200 transition hover:border-white/30 hover:bg-white/[0.04]"
              >
                Oyunları Gör
              </button>

            </div>

            {profile && (
              <div className="mt-7 grid max-w-md grid-cols-3 gap-3">

                <HeroStat
                  value={
                    profile.games_played
                  }
                  label="Oynanan oyun"
                />

                <HeroStat
                  value={
                    profile.total_score
                  }
                  label="Toplam puan"
                />

                <HeroStat
                  value={`🔥 ${profile.current_streak}`}
                  label="Günlük seri"
                />

              </div>
            )}

          </div>

          {/* RIGHT */}

          <div className="space-y-5 self-start">

            {/* FRIENDS */}

            {user && (
              <HomeFriendsCard
                friends={
                  friends
                }
                friendCount={
                  friendCount
                }
                onlineFriendCount={
                  onlineFriendCount
                }
                loading={
                  friendsLoading
                }
              />
            )}

            {/* =================================================
                INCOMING DUEL
            ================================================= */}

            {user &&
              incomingDuels.length >
                0 && (
                <IncomingDuelCard
                  duel={
                    incomingDuels[0]
                  }
                  totalCount={
                    incomingDuels.length
                  }
                  loading={
                    duelsLoading
                  }
                  responding={
                    duelActionId ===
                    incomingDuels[0]
                      .id
                  }
                  onAccept={() =>
                    void respondToDuel(
                      incomingDuels[0]
                        .id,
                      "accept",
                    )
                  }
                  onReject={() =>
                    void respondToDuel(
                      incomingDuels[0]
                        .id,
                      "reject",
                    )
                  }
                />
              )}

            {/* DUEL MESSAGE */}

            {duelMessage && (
              <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm font-bold text-green-300">
                {duelMessage}
              </div>
            )}

            {duelError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
                {duelError}
              </div>
            )}

            {/* LEADERBOARD */}

            <div
              id="liderlik"
              className="scroll-mt-24"
            >
              <LeaderboardCard />
            </div>

          </div>

        </div>

      </section>

      {/* ===================================================
          OYUNLAR
      =================================================== */}

      <section
        id="oyunlar"
        className="scroll-mt-24 border-t border-white/5 bg-[#081523]"
      >

        <div className="mx-auto max-w-[1180px] px-5 py-14 lg:px-6">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.22em] text-green-400">
                Oyunlar
              </p>

              <h2 className="mt-2 text-3xl font-black">
                İstediğin kadar oyna
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                Dört tek kişilik
                oyunda istediğin zaman
                yeni bir oyuncuyla tekrar
                mücadele et.
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                scrollToSection(
                  "liderlik",
                )
              }
              className="w-fit rounded-xl border border-white/10 px-4 py-2.5 text-sm font-black text-slate-300 transition hover:border-yellow-400/30 hover:text-yellow-300"
            >
              Liderliğe Git →
            </button>

          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

            {games.map(
              (
                game,
              ) => (
                <GameCard
                  key={
                    game.href
                  }
                  {...game}
                />
              ),
            )}

          </div>

        </div>

      </section>

      {/* ===================================================
          KADRO ARAÇLARI
      =================================================== */}

      <section className="border-t border-white/5">

        <div className="mx-auto max-w-[1180px] px-5 py-14 lg:px-6">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-400">
              Kadro Araçları
            </p>

            <h2 className="mt-2 text-3xl font-black">
              Sahaya sen karar ver
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              İster profesyonel takım
              kadrosunu düzenle, ister
              halısaha ekibini kur.
            </p>

          </div>

          <div className="mt-7 grid gap-4 lg:grid-cols-2">

            {builders.map(
              (
                builder,
              ) => (
                <BuilderCard
                  key={
                    builder.href
                  }
                  {...builder}
                />
              ),
            )}

          </div>

        </div>

      </section>

      {/* ===================================================
          DUELLOLAR
      =================================================== */}

      <section
        id="duellolar"
        className="scroll-mt-24 border-t border-white/5 bg-[#081523]"
      >

        <div className="mx-auto max-w-[1180px] px-5 py-14 lg:px-6">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.22em] text-purple-400">
                Düellolar
              </p>

              <h2 className="mt-2 text-3xl font-black">
                Arkadaşına meydan oku
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Rakibini seç,
                futbol bilgini bire bir
                mücadelede kanıtla.
              </p>

            </div>

            {user && (
              <Link
                href="/duels"
                className="w-fit rounded-xl border border-white/10 px-4 py-2.5 text-sm font-black text-slate-300 transition hover:border-purple-400/30 hover:text-purple-300"
              >
                Düellolarım →
              </Link>
            )}

          </div>

          <div className="mt-7 grid gap-4 lg:grid-cols-[1fr_0.65fr]">

            {/* CLUB CLASH */}

            <article className="group relative overflow-hidden rounded-2xl border border-purple-500/25 bg-purple-500/[0.06] p-6 transition hover:-translate-y-1 hover:border-purple-400/40">

              <div className="flex items-start justify-between gap-4">

                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-purple-400/20 bg-purple-500/10 text-2xl">
                  ⚔️
                </div>

                <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-green-400">
                  Oynanabilir
                </span>

              </div>

              <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-purple-400">
                Düello Oyunu
              </p>

              <h3 className="mt-2 text-2xl font-black">
                2 Takım 1 Oyuncu
              </h3>

              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
                İki takımda da forma
                giymiş futbolcuyu
                rakibinden önce bul.
                5 round boyunca mücadele
                et ve düelloyu kazan.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">

                {user ? (
                  <Link
                    href="/duels/challenge?game=club_clash"
                    className="rounded-xl bg-purple-500 px-5 py-3 text-sm font-black text-white transition hover:bg-purple-400"
                  >
                    ⚔️ Düello Gönder
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="rounded-xl bg-purple-500 px-5 py-3 text-sm font-black text-white transition hover:bg-purple-400"
                  >
                    Giriş Yap ve Düello Gönder
                  </Link>
                )}

                {user && (
                  <Link
                    href="/duels"
                    className="rounded-xl border border-white/10 px-5 py-3 text-sm font-black text-slate-300 transition hover:border-white/20 hover:bg-white/[0.04]"
                  >
                    Düellolarım
                  </Link>
                )}

              </div>

            </article>

            {/* HOW TO */}

            <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">

              <p className="text-xs font-black uppercase tracking-[0.2em] text-green-400">
                Nasıl Oynanır?
              </p>

              <div className="mt-5 space-y-5">

                <DuelStep
                  number="1"
                  title="Rakibini seç"
                  text="Kullanıcı adıyla ara veya arkadaşlarından birini seç."
                />

                <DuelStep
                  number="2"
                  title="Meydan oku"
                  text="2 Takım 1 Oyuncu düello davetini gönder."
                />

                <DuelStep
                  number="3"
                  title="Kapış"
                  text="Rakibin kabul ettiğinde 5 roundluk mücadele başlasın."
                />

              </div>

            </article>

          </div>

        </div>

      </section>

      {/* ===================================================
          LIDERLIK CTA
      =================================================== */}

      <section className="border-t border-white/5">

        <div className="mx-auto max-w-[1180px] px-5 py-12 lg:px-6">

          <div className="flex flex-col gap-4 rounded-2xl border border-yellow-400/15 bg-yellow-400/[0.035] p-6 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400">
                Liderlik
              </p>

              <h2 className="mt-2 text-xl font-black">
                Zirvede kim var?
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Genel veya oyun bazlı
                sıralamayı incele.
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                scrollToSection(
                  "liderlik",
                )
              }
              className="rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-black text-[#07111f] transition hover:bg-yellow-300"
            >
              Leaderboard&apos;u Gör
            </button>

          </div>

        </div>

      </section>

      {/* ===================================================
          FOOTER
      =================================================== */}

      <footer className="border-t border-white/10">

        <div className="mx-auto flex max-w-[1180px] flex-col gap-3 px-5 py-7 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between lg:px-6">

          <p>
            © 2026 FootBattle
          </p>

          <span>
            Futbol oyunları arenası
          </span>

        </div>

      </footer>

    </main>
  );
}

/* =========================================================
   INCOMING DUEL CARD
========================================================= */

function IncomingDuelCard({
  duel,
  totalCount,
  loading,
  responding,
  onAccept,
  onReject,
}: {
  duel: IncomingDuel;
  totalCount: number;
  loading: boolean;
  responding: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const player =
    duel.otherPlayer;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-purple-400/40 bg-purple-500/[0.10] shadow-lg shadow-purple-950/20">

      {/* GLOW */}

      <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-purple-500/10 blur-3xl" />

      <div className="relative p-5">

        <div className="flex items-start justify-between gap-4">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-300">
              ⚔️ Düello Daveti
            </p>

            <h2 className="mt-1 text-xl font-black">
              Meydan okuma geldi!
            </h2>

          </div>

          {totalCount >
            1 && (
            <span className="rounded-full border border-purple-400/25 bg-purple-500/15 px-3 py-1 text-[10px] font-black text-purple-200">
              +{totalCount - 1} davet
            </span>
          )}

        </div>

        {player && (
          <div className="mt-4 flex items-center gap-3">

            <div className="relative shrink-0">

              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-purple-500 text-xs font-black text-white">

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
                  getDuelInitials(
                    player,
                  )
                )}

              </div>

              <span
                className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#17172d] ${
                  player.online
                    ? "bg-green-400"
                    : "bg-slate-600"
                }`}
              />

            </div>

            <div className="min-w-0 flex-1">

              <p className="truncate font-black">
                {
                  player.displayName
                }
              </p>

              <div className="mt-0.5 flex items-center gap-2">

                {player.username && (
                  <span className="truncate text-xs font-bold text-purple-300">
                    @{player.username}
                  </span>
                )}

                <span className="text-[10px] font-bold text-green-400">
                  {player.online
                    ? "Çevrimiçi"
                    : player.lastSeenText}
                </span>

              </div>

            </div>

          </div>
        )}

        <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/10 px-4 py-3">

          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Oyun
          </p>

          <p className="mt-1 text-sm font-black text-white">
            {duel.gameLabel}
          </p>

        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">

          <button
            type="button"
            disabled={
              responding ||
              loading
            }
            onClick={
              onReject
            }
            className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-slate-300 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reddet
          </button>

          <button
            type="button"
            disabled={
              responding ||
              loading
            }
            onClick={
              onAccept
            }
            className="rounded-xl bg-purple-500 px-4 py-3 text-sm font-black text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {responding
              ? "İşleniyor..."
              : "⚔️ Kabul Et"}
          </button>

        </div>

        <Link
          href="/duels"
          className="mt-4 block text-center text-xs font-black text-purple-300 transition hover:text-purple-200"
        >
          Tüm düelloları gör →
        </Link>

      </div>

    </section>
  );
}

/* =========================================================
   HOME FRIENDS
========================================================= */

function HomeFriendsCard({
  friends,
  friendCount,
  onlineFriendCount,
  loading,
}: {
  friends: FriendItem[];
  friendCount: number;
  onlineFriendCount: number;
  loading: boolean;
}) {
  const visibleFriends =
    friends.slice(
      0,
      4,
    );

  return (
    <section className="overflow-hidden rounded-2xl border border-green-500/15 bg-[#0d1a2a]">

      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">

        <div>

          <p className="text-xs font-black uppercase tracking-[0.18em] text-green-400">
            Sosyal
          </p>

          <h2 className="mt-1 text-lg font-black">
            Arkadaşlar
          </h2>

        </div>

        <div className="text-right">

          <p className="text-xs font-bold text-slate-500">
            {friendCount} arkadaş
          </p>

          <p className="mt-1 text-xs font-black text-green-400">
            {onlineFriendCount} çevrimiçi
          </p>

        </div>

      </div>

      <div className="p-4">

        {loading &&
        friends.length ===
          0 ? (
          <div className="py-6 text-center text-sm font-bold text-slate-500">
            Arkadaşlar yükleniyor...
          </div>
        ) : visibleFriends.length ===
          0 ? (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center">

            <p className="text-sm font-bold text-slate-500">
              Henüz arkadaşın yok.
            </p>

            <Link
              href="/profile"
              className="mt-3 inline-flex text-xs font-black text-green-400 hover:text-green-300"
            >
              Arkadaş bul →
            </Link>

          </div>
        ) : (
          <div className="space-y-2">

            {visibleFriends.map(
              (
                item,
              ) => (
                <HomeFriendRow
                  key={
                    item.friendshipId
                  }
                  friend={
                    item.user
                  }
                />
              ),
            )}

          </div>
        )}

        {friendCount > 0 && (
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">

            <Link
              href="/profile"
              className="text-xs font-black text-slate-400 transition hover:text-white"
            >
              Tüm arkadaşlar
            </Link>

            <Link
              href="/duels"
              className="text-xs font-black text-purple-400 transition hover:text-purple-300"
            >
              Düellolarım →
            </Link>

          </div>
        )}

      </div>

    </section>
  );
}

/* =========================================================
   HOME FRIEND ROW
========================================================= */

function HomeFriendRow({
  friend,
}: {
  friend: FriendUser;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 transition hover:border-white/10 hover:bg-white/[0.04]">

      <Link
        href={
          friend.username
            ? `/u/${friend.username}`
            : "/profile"
        }
        className="relative shrink-0"
      >

        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-green-500 text-xs font-black text-[#07111f]">

          {friend.avatarUrl ? (
            <img
              src={
                friend.avatarUrl
              }
              alt={
                friend.displayName
              }
              className="h-full w-full object-cover"
            />
          ) : (
            getFriendInitials(
              friend,
            )
          )}

        </div>

        <span
          className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#0d1a2a] ${
            friend.online
              ? "bg-green-400"
              : "bg-slate-600"
          }`}
        />

      </Link>

      <div className="min-w-0 flex-1">

        <Link
          href={
            friend.username
              ? `/u/${friend.username}`
              : "/profile"
          }
          className="block truncate text-sm font-black transition hover:text-green-300"
        >
          {friend.displayName}
        </Link>

        <div className="mt-0.5 flex items-center gap-2">

          {friend.username && (
            <span className="truncate text-[11px] font-bold text-green-400">
              @{friend.username}
            </span>
          )}

          <span
            className={`shrink-0 text-[10px] font-bold ${
              friend.online
                ? "text-green-400"
                : "text-slate-600"
            }`}
          >
            {friend.online
              ? "Çevrimiçi"
              : friend.lastSeenText}
          </span>

        </div>

      </div>

      <Link
        href={`/duels/challenge?opponent=${encodeURIComponent(
          friend.username ??
            friend.id,
        )}`}
        className="shrink-0 rounded-lg border border-purple-500/25 bg-purple-500/10 px-3 py-2 text-[11px] font-black text-purple-300 transition hover:border-purple-400/40 hover:bg-purple-500/20"
      >
        ⚔️
        <span className="ml-1 hidden sm:inline">
          Meydan Oku
        </span>
      </Link>

    </div>
  );
}

/* =========================================================
   HERO STAT
========================================================= */

function HeroStat({
  value,
  label,
}: {
  value:
    | number
    | string;

  label:
    string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.04] p-3">

      <p className="text-lg font-black text-green-400">
        {typeof value ===
        "number"
          ? new Intl.NumberFormat(
              "tr-TR",
            ).format(
              value,
            )
          : value}
      </p>

      <p className="mt-1 text-[11px] text-slate-500">
        {label}
      </p>

    </div>
  );
}

/* =========================================================
   GAME CARD
========================================================= */

function GameCard({
  title,
  description,
  href,
  tag,
}: {
  title:
    string;

  description:
    string;

  href:
    string;

  tag:
    string;
}) {
  return (
    <Link
      href={
        href
      }
      className="group flex min-h-[200px] flex-col rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:-translate-y-1 hover:border-green-400/25 hover:bg-white/[0.05]"
    >

      <div className="flex items-center justify-between gap-3">

        <span className="rounded-lg bg-green-500/10 px-2.5 py-1 text-[10px] font-black text-green-400">
          {tag}
        </span>

        <span className="text-base text-slate-700 transition group-hover:text-green-400">
          ↗
        </span>

      </div>

      <h3 className="mt-5 text-xl font-black">
        {title}
      </h3>

      <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">
        {description}
      </p>

      <p className="mt-4 text-sm font-black text-green-400">
        Oyna →
      </p>

    </Link>
  );
}

/* =========================================================
   BUILDER CARD
========================================================= */

function BuilderCard({
  title,
  description,
  href,
  button,
  icon,
}: {
  title:
    string;

  description:
    string;

  href:
    string;

  button:
    string;

  icon:
    string;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-6">

      <div className="flex items-start gap-4">

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-yellow-400/10 text-xl">
          {icon}
        </div>

        <div className="min-w-0 flex-1">

          <h3 className="text-xl font-black">
            {title}
          </h3>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
            {description}
          </p>

          <Link
            href={
              href
            }
            className="mt-5 inline-flex rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-black text-[#07111f] transition hover:bg-yellow-300"
          >
            {button}
          </Link>

        </div>

      </div>

    </article>
  );
}

/* =========================================================
   DUEL STEP
========================================================= */

function DuelStep({
  number,
  title,
  text,
}: {
  number:
    string;

  title:
    string;

  text:
    string;
}) {
  return (
    <div className="flex gap-4">

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-500 text-sm font-black text-[#07111f]">
        {number}
      </div>

      <div>

        <p className="font-black">
          {title}
        </p>

        <p className="mt-1 text-sm leading-5 text-slate-500">
          {text}
        </p>

      </div>

    </div>
  );
}