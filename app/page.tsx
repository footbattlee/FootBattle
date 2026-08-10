"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

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

  since:
    | string
    | null;

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

type GameMode =
  | "solo"
  | "duel"
  | "both";

type GameItem = {
  code: string;

  title: string;

  description: string;

  heroDescription: string;

  icon: string;

  mode: GameMode;

  ready: boolean;

  playHref?: string;

  duelHref?: string;

  accent:
    | "green"
    | "purple"
    | "amber"
    | "blue"
    | "cyan"
    | "rose";
};

/* =========================================================
   GAME CATALOG

   Passaparola özellikle burada yok.
========================================================= */

const GAMES: GameItem[] = [
  /* -------------------------------------------------------
     WORDLE
  ------------------------------------------------------- */

  {
    code:
      "wordle",

    title:
      "Wordle",

    description:
      "Futbolcunun soyadını 5 tahminde bul.",

    heroDescription:
      "5 tahminde futbolcunun soyadını bul ve günlük serini koru.",

    icon:
      "🟩",

    mode:
      "solo",

    ready:
      true,

    playHref:
      "/wordle",

    accent:
      "green",
  },

  /* -------------------------------------------------------
     GUESS THE PLAYER
  ------------------------------------------------------- */

  {
    code:
      "guess_the_player",

    title:
      "Guess the Player",

    description:
      "İpuçlarını karşılaştır ve gizli futbolcuyu tahmin et.",

    heroDescription:
      "İpuçlarını takip et, gizli futbolcuyu mümkün olduğunca az tahminde bul.",

    icon:
      "🕵️",

    mode:
      "solo",

    ready:
      true,

    playHref:
      "/guess-the-player",

    accent:
      "cyan",
  },

  /* -------------------------------------------------------
     PLAYER QUIZ
  ------------------------------------------------------- */

  {
    code:
      "player_quiz",

    title:
      "Player Quiz",

    description:
      "Doğum yılı, milliyet ve kariyer kulüplerini tamamla. Tek başına oyna veya arkadaşına meydan oku.",

    heroDescription:
      "Futbolcunun doğum yılını, milliyetini ve kariyer kulüplerini tamamla.",

    icon:
      "🧠",

    mode:
      "both",

    ready:
      true,

    playHref:
      "/player-quiz",

    duelHref:
      "/duels/challenge?game=player_quiz",

    accent:
      "purple",
  },

  /* -------------------------------------------------------
     CAREER PATH
  ------------------------------------------------------- */

  {
    code:
      "career_path",

    title:
      "Career Path",

    description:
      "Oyuncunun kariyerinde forma giydiği kulüpleri doğru şekilde tamamla.",

    heroDescription:
      "Oyuncunun kariyer yolunu çöz ve forma giydiği kulüpleri bul.",

    icon:
      "🛣️",

    mode:
      "solo",

    ready:
      true,

    playHref:
      "/career-path",

    accent:
      "amber",
  },

  /* -------------------------------------------------------
     2 TAKIM 1 OYUNCU
  ------------------------------------------------------- */

  {
    code:
      "club_clash",

    title:
      "2 Takım 1 Oyuncu",

    description:
      "İki takımda da forma giymiş futbolcuyu rakibinden önce bul. 5 round, ilk 3 alan kazanır.",

    heroDescription:
      "İki takımda da oynamış futbolcuyu rakibinden önce bul. İlk 3 roundu alan kazanır.",

    icon:
      "⚔️",

    mode:
      "duel",

    ready:
      true,

    duelHref:
      "/duels/challenge?game=club_clash",

    accent:
      "purple",
  },

  /* -------------------------------------------------------
     TIC TAC TOE
  ------------------------------------------------------- */

  {
    code:
      "tic_tac_toe",

    title:
      "Futbol Tic Tac Toe",

    description:
      "Takım ve ülke kriterlerini sağlayan futbolcuları bul, rakibinden önce üçlü sırayı tamamla.",

    heroDescription:
      "Takım ve ülke kesişimlerini doldurup üçlü sırayı tamamla.",

    icon:
      "❌",

    mode:
      "duel",

    ready:
      false,

    accent:
      "rose",
  },

  /* -------------------------------------------------------
     1 TAKIM 1 MİLLET
  ------------------------------------------------------- */

  {
    code:
      "club_country",

    title:
      "1 Takım 1 Millet",

    description:
      "Verilen takım ve ülke kombinasyonuna uygun futbolcuyu rakibinden önce bul.",

    heroDescription:
      "Takım ve millet kesişimine uyan futbolcuyu bul.",

    icon:
      "🌍",

    mode:
      "duel",

    ready:
      false,

    accent:
      "blue",
  },
];

/* =========================================================
   ACTIVE HERO GAMES

   Sadece gerçekten oynanabilen oyunlar döner.
========================================================= */

const HERO_GAMES =
  GAMES.filter(
    (game) =>
      game.ready,
  );

/* =========================================================
   BUILDERS
========================================================= */

const BUILDERS = [
  {
    title:
      "Takım Kadro Oluşturucu",

    description:
      "Takımını seç, ilk 11'i düzenle, transferlerini ekle ve kadronu paylaş.",

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
      "Arkadaşlarını sahaya diz, halısaha kadronu oluştur ve tek linkle paylaş.",

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
      .slice(
        0,
        2,
      )
      .toUpperCase();
  }

  return (
    parts[0].slice(
      0,
      1,
    ) +
    parts[
      parts.length -
        1
    ].slice(
      0,
      1,
    )
  ).toUpperCase();
}

function gameModeLabel(
  game: GameItem,
) {
  if (
    game.mode ===
    "both"
  ) {
    return "Tek Oyuncu + Düello";
  }

  if (
    game.mode ===
    "duel"
  ) {
    return "Düello";
  }

  return "Tek Oyuncu";
}

/* =========================================================
   PAGE
========================================================= */

export default function HomePage() {
  /* =======================================================
     USER
  ======================================================= */

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
     HERO
  ======================================================= */

  const [
    activeHeroGameIndex,
    setActiveHeroGameIndex,
  ] =
    useState(0);

  const activeHeroGame =
    HERO_GAMES[
      activeHeroGameIndex
    ] ??
    HERO_GAMES[0];

  /* =======================================================
     10 SECOND ROTATION
  ======================================================= */

  useEffect(() => {
    if (
      HERO_GAMES.length <=
      1
    ) {
      return;
    }

    const intervalId =
      window.setInterval(
        () => {
          setActiveHeroGameIndex(
            (
              currentIndex,
            ) =>
              (
                currentIndex +
                1
              ) %
              HERO_GAMES.length,
          );
        },

        10_000,
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

        if (
          !authUser
        ) {
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
      } catch {
        setUser(
          null,
        );

        setProfile(
          null,
        );
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
              first,
              second,
            ) => {
              if (
                first.user
                  .online ===
                second.user
                  .online
              ) {
                return first.user
                  .displayName
                  .localeCompare(
                    second.user
                      .displayName,

                    "tr",
                  );
              }

              return first
                .user.online
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
        // Ana sayfayı bozma.
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
  }, [
    user,
  ]);

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

    element?.scrollIntoView({
      behavior:
        "smooth",

      block:
        "start",
    });
  }

  /* =======================================================
     HERO ACTIONS
  ======================================================= */

  const heroButtons =
    useMemo(
      () => {
        if (
          !activeHeroGame
        ) {
          return null;
        }

        return (
          <div className="flex flex-wrap gap-3">

            {activeHeroGame.playHref && (
              <Link
                href={
                  activeHeroGame.playHref
                }
                className="rounded-xl bg-green-500 px-6 py-3.5 text-sm font-black text-[#07111f] transition hover:-translate-y-0.5 hover:bg-green-400"
              >
                {
                  activeHeroGame.icon
                }{" "}
                {
                  activeHeroGame.title
                }{" "}
                Oyna
              </Link>
            )}

            {activeHeroGame.duelHref && (
              <Link
                href={
                  activeHeroGame.duelHref
                }
                className={`rounded-xl px-6 py-3.5 text-sm font-black transition hover:-translate-y-0.5 ${
                  activeHeroGame.playHref
                    ? "border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
                    : "bg-purple-500 text-white hover:bg-purple-400"
                }`}
              >
                ⚔️ Düello
              </Link>
            )}

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
        );
      },
      [
        activeHeroGame,
      ],
    );

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#07111f] text-white">

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07111f]/95 shadow-lg shadow-black/10 backdrop-blur-xl">

        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-5 lg:px-6">

          {/* LOGO */}

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

          {/* NAV */}

          <nav className="hidden items-center gap-7 text-sm font-bold text-slate-400 xl:flex">

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

          </nav>

          {/* ACCOUNT */}

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

        <div
          className={`mx-auto px-5 pb-16 pt-8 lg:px-6 ${
            user
              ? "grid max-w-[1240px] gap-10 lg:grid-cols-[minmax(0,1.12fr)_minmax(350px,0.72fr)]"
              : "max-w-[1180px]"
          }`}
        >

          {/* =================================================
              HERO MAIN

              Giriş yoksa:
              max-w kullanmıyoruz.
              Sol taraf yataya yayılıyor.
          ================================================= */}

          <div
            className={`flex flex-col justify-center pt-7 ${
              user
                ? ""
                : "min-h-[650px] w-full"
            }`}
          >

            <div
              className={`${
                user
                  ? "max-w-[720px]"
                  : "w-full"
              }`}
            >

              {/* ACTIVE BADGE */}

              <div className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-black text-green-400">

                <span>
                  {
                    activeHeroGame.icon
                  }
                </span>

                <span>
                  {gameModeLabel(
                    activeHeroGame,
                  )}
                </span>

                <span className="opacity-40">
                  •
                </span>

                <span>
                  {
                    activeHeroGame.title
                  }
                </span>

              </div>

              {/* HERO TEXT */}

              <h1
                className={`mt-7 font-black leading-[1.03] tracking-tight ${
                  user
                    ? "max-w-[690px] text-5xl lg:text-[64px]"
                    : "max-w-[900px] text-5xl sm:text-6xl lg:text-[74px]"
                }`}
              >

                Futbol bilgini

                <span className="mt-2 block text-green-400">
                  kanıtlamaya hazır
                </span>

                <span className="block text-green-400">
                  mısın?
                </span>

              </h1>

              <p
                className={`mt-6 leading-8 text-slate-400 ${
                  user
                    ? "max-w-[620px] text-base"
                    : "max-w-[850px] text-lg"
                }`}
              >
                Tek başına skor kovala,
                arkadaşına meydan oku veya
                yeni oyunları keşfet.
                FootBattle&apos;da bahane
                yok, futbol bilgisi konuşur.
              </p>

              {/* ACTIVE GAME PREVIEW */}

              <div
                className={`mt-7 rounded-2xl border border-green-500/15 bg-green-500/[0.035] px-5 py-4 ${
                  user
                    ? "max-w-[650px]"
                    : "max-w-[900px]"
                }`}
              >

                <div className="flex items-center gap-4">

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-white/[0.04] text-2xl">
                    {
                      activeHeroGame.icon
                    }
                  </div>

                  <div className="min-w-0">

                    <p className="font-black">
                      {
                        activeHeroGame.title
                      }
                    </p>

                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {
                        activeHeroGame.heroDescription
                      }
                    </p>

                  </div>

                </div>

                {/* HERO GAME DOTS */}

                <div className="mt-4 flex flex-wrap gap-2">

                  {HERO_GAMES.map(
                    (
                      game,
                      index,
                    ) => {
                      const active =
                        index ===
                        activeHeroGameIndex;

                      return (
                        <button
                          key={
                            game.code
                          }
                          type="button"
                          title={
                            game.title
                          }
                          onClick={() =>
                            setActiveHeroGameIndex(
                              index,
                            )
                          }
                          className={`h-2 rounded-full transition-all ${
                            active
                              ? "w-9 bg-green-400"
                              : "w-4 bg-white/10 hover:bg-white/20"
                          }`}
                        />
                      );
                    },
                  )}

                </div>

              </div>

              {/* HERO BUTTONS */}

              <div className="mt-6">
                {heroButtons}
              </div>

              {/* USER STATS */}

              {profile && (
                <div className="mt-8 grid max-w-[560px] grid-cols-3 gap-3">

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

          </div>

          {/* =================================================
              FRIENDS - ONLY LOGGED IN
          ================================================= */}

          {user && (
            <div className="self-start pt-3">

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

            </div>
          )}

        </div>

      </section>

      {/* ===================================================
          GAMES
      =================================================== */}

      <section
        id="oyunlar"
        className="scroll-mt-24 border-t border-white/5 bg-[#081523]"
      >

        <div className="mx-auto max-w-[1240px] px-5 py-16 lg:px-6">

          {/* TITLE */}

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.22em] text-green-400">
                FootBattle Oyunları
              </p>

              <h2 className="mt-2 text-3xl font-black sm:text-4xl">
                Arenadaki oyununu seç
              </h2>

              <p className="mt-3 max-w-[760px] text-sm leading-6 text-slate-400 sm:text-base">
                Hazır oyunlara hemen gir.
                Düello destekleyenlerde
                arkadaşına link gönderip
                kapış. Geliştirme aşamasındaki
                oyunları da burada takip et.
              </p>

            </div>

            <div className="flex items-center gap-4 text-xs font-black">

              <span className="flex items-center gap-2 text-green-400">

                <span className="h-2 w-2 rounded-full bg-green-400" />

                {
                  GAMES.filter(
                    (
                      game,
                    ) =>
                      game.ready,
                  ).length
                } oynanabilir

              </span>

              <span className="flex items-center gap-2 text-slate-500">

                <span className="h-2 w-2 rounded-full bg-slate-600" />

                {
                  GAMES.filter(
                    (
                      game,
                    ) =>
                      !game.ready,
                  ).length
                } yakında

              </span>

            </div>

          </div>

          {/* =================================================
              GAME GRID
          ================================================= */}

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">

            {GAMES.map(
              (
                game,
              ) => (
                <GameCard
                  key={
                    game.code
                  }
                  game={
                    game
                  }
                />
              ),
            )}

          </div>

        </div>

      </section>

      {/* ===================================================
          BUILDERS
      =================================================== */}

      <section className="border-t border-white/5">

        <div className="mx-auto max-w-[1240px] px-5 py-16 lg:px-6">

          <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-400">
            Kadro Araçları
          </p>

          <h2 className="mt-2 text-3xl font-black">
            Sahaya sen karar ver
          </h2>

          <p className="mt-3 max-w-[720px] text-sm leading-6 text-slate-400">
            İster profesyonel takım kadronu
            oluştur, ister halısaha ekibini
            sahaya diz. Hazırladığın kadroyu
            arkadaşlarınla paylaş.
          </p>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">

            {BUILDERS.map(
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
          FUTURE
      =================================================== */}

      <section className="border-t border-white/5 bg-[#081523]">

        <div className="mx-auto max-w-[1240px] px-5 py-12 lg:px-6">

          <div className="rounded-3xl border border-purple-500/15 bg-purple-500/[0.04] p-6 sm:p-8">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">
                  Arena Büyüyor
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Yeni oyunlar sırada
                </h2>

                <p className="mt-2 max-w-[700px] text-sm leading-6 text-slate-400">
                  1 Takım 1 Millet ve
                  Futbol Tic Tac Toe,
                  mevcut challenge altyapısına
                  ekleyeceğimiz sonraki oyunlar.
                </p>

              </div>

              <div className="flex gap-2">

                <SoonPill>
                  🌍 1 Takım 1 Millet
                </SoonPill>

                <SoonPill>
                  ❌ Tic Tac Toe
                </SoonPill>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* ===================================================
          FOOTER
      =================================================== */}

      <footer className="border-t border-white/10">

        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 py-7 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between lg:px-6">

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
   HERO STAT
========================================================= */

function HeroStat({
  value,
  label,
}: {
  value:
    | number
    | string;

  label: string;
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
  game,
}: {
  game: GameItem;
}) {
  const duelOnly =
    game.mode ===
    "duel";

  const both =
    game.mode ===
    "both";

  /* -------------------------------------------------------
     SOON
  ------------------------------------------------------- */

  if (
    !game.ready
  ) {
    return (
      <article className="relative flex min-h-[260px] flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 opacity-70">

        <div className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500">
          Yakında
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-2xl">
          {game.icon}
        </div>

        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
          {gameModeLabel(
            game,
          )}
        </p>

        <h3 className="mt-2 text-xl font-black text-slate-300">
          {game.title}
        </h3>

        <p className="mt-3 flex-1 text-sm leading-6 text-slate-500">
          {game.description}
        </p>

        <button
          type="button"
          disabled
          className="mt-5 w-fit cursor-not-allowed rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-sm font-black text-slate-600"
        >
          Yakında
        </button>

      </article>
    );
  }

  /* -------------------------------------------------------
     ACTIVE
  ------------------------------------------------------- */

  return (
    <article
      className={`group flex min-h-[260px] flex-col rounded-2xl border p-5 transition hover:-translate-y-1 ${
        duelOnly
          ? "border-purple-500/25 bg-purple-500/[0.055] hover:border-purple-400/40"
          : both
            ? "border-green-500/15 bg-white/[0.035] hover:border-purple-400/30"
            : "border-white/10 bg-white/[0.035] hover:border-green-400/25"
      }`}
    >

      {/* TOP */}

      <div className="flex items-start justify-between gap-3">

        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-2xl">
          {game.icon}
        </div>

        <div className="flex flex-col items-end gap-2">

          <span className="rounded-full border border-green-500/15 bg-green-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-green-400">
            Oynanabilir
          </span>

          <span
            className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-wider ${
              duelOnly ||
              both
                ? "bg-purple-500/10 text-purple-300"
                : "bg-white/[0.04] text-slate-500"
            }`}
          >
            {gameModeLabel(
              game,
            )}
          </span>

        </div>

      </div>

      {/* CONTENT */}

      <h3 className="mt-5 text-xl font-black">
        {game.title}
      </h3>

      <p className="mt-3 flex-1 text-sm leading-6 text-slate-400">
        {game.description}
      </p>

      {/* ACTIONS */}

      <div className="mt-6 flex flex-wrap gap-2">

        {game.playHref && (
          <Link
            href={
              game.playHref
            }
            className="rounded-xl bg-green-500 px-4 py-2.5 text-sm font-black text-[#07111f] transition hover:bg-green-400"
          >
            Oyna →
          </Link>
        )}

        {game.duelHref && (
          <Link
            href={
              game.duelHref
            }
            className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${
              game.playHref
                ? "border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
                : "bg-purple-500 text-white hover:bg-purple-400"
            }`}
          >
            ⚔️ Düello
          </Link>
        )}

      </div>

    </article>
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
  title: string;

  description: string;

  href: string;

  button: string;

  icon: string;
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
   FRIENDS CARD
========================================================= */

function HomeFriendsCard({
  friends,
  friendCount,
  onlineFriendCount,
  loading,
}: {
  friends:
    FriendItem[];

  friendCount:
    number;

  onlineFriendCount:
    number;

  loading:
    boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-green-500/20 bg-white/[0.035]">

      {/* HEADER */}

      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">

        <div>

          <p className="text-xs font-black uppercase tracking-[0.2em] text-green-400">
            Sosyal
          </p>

          <h2 className="mt-1 text-xl font-black">
            Arkadaşlar
          </h2>

        </div>

        <div className="text-right text-xs font-black">

          <p className="text-slate-500">
            {friendCount} arkadaş
          </p>

          <p className="mt-1 text-green-400">
            {onlineFriendCount} çevrimiçi
          </p>

        </div>

      </div>

      {/* LIST */}

      <div className="p-4">

        {loading &&
        friends.length ===
          0 ? (
          <div className="rounded-xl border border-white/5 bg-black/10 px-4 py-6 text-center text-sm text-slate-500">
            Arkadaşların yükleniyor...
          </div>
        ) : friends.length ===
          0 ? (
          <div className="rounded-xl border border-white/5 bg-black/10 px-4 py-6 text-center">

            <p className="text-sm font-black">
              Henüz arkadaşın yok
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Oyuncuları bulup arkadaş listene ekleyebilirsin.
            </p>

          </div>
        ) : (
          <div className="space-y-2">

            {friends
              .slice(
                0,
                4,
              )
              .map(
                (
                  item,
                ) => (
                  <FriendRow
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

      </div>

      {/* FOOTER */}

      <div className="flex items-center justify-between border-t border-white/10 px-5 py-4">

        <Link
          href="/friends"
          className="text-xs font-black text-slate-400 transition hover:text-white"
        >
          Tüm arkadaşlar
        </Link>

        <Link
          href="/duels/challenge?game=club_clash"
          className="text-xs font-black text-purple-300 transition hover:text-purple-200"
        >
          ⚔️ Meydan Oku →
        </Link>

      </div>

    </section>
  );
}

/* =========================================================
   FRIEND ROW
========================================================= */

function FriendRow({
  friend,
}: {
  friend:
    FriendUser;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/10 px-3 py-3">

      {/* AVATAR */}

      <div className="relative">

        {friend.avatarUrl ? (
          <img
            src={
              friend.avatarUrl
            }
            alt=""
            className="h-11 w-11 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500 font-black text-[#07111f]">
            {getFriendInitials(
              friend,
            )}
          </div>
        )}

        <span
          className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#0b1726] ${
            friend.online
              ? "bg-green-400"
              : "bg-slate-600"
          }`}
        />

      </div>

      {/* INFO */}

      <div className="min-w-0 flex-1">

        <p className="truncate text-sm font-black">
          {
            friend.displayName
          }
        </p>

        <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[10px]">

          {friend.username && (
            <span className="truncate font-black text-green-400">
              @
              {
                friend.username
              }
            </span>
          )}

          <span className="truncate text-slate-600">
            {
              friend.lastSeenText
            }
          </span>

        </div>

      </div>

      {/* CHALLENGE */}

      <Link
        href="/duels/challenge?game=club_clash"
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
   SOON PILL
========================================================= */

function SoonPill({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <span className="rounded-xl border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-xs font-black text-purple-300">
      {children}
    </span>
  );
}