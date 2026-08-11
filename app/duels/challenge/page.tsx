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

import { createClient } from "@/lib/supabase/client";

/* =========================================================
   TYPES
========================================================= */

type GameOption = {
  code: string;

  title: string;
  description: string;

  icon: string;

  enabled: boolean;

  badge?: string;

  rules?: string[];
};

type CreateChallengeResponse = {
  ok?: boolean;

  token?: string;

  challenge?: {
    id?: number;
    token?: string;
    gameCode?: string;
    status?: string;
  };

  error?: string;
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
      "Her roundda iki takımda da forma giymiş futbolcuyu rakibinden önce bul. 5 round oynanır, ilk 3 roundu alan kazanır.",

    icon:
      "⚽",

    enabled:
      true,

    badge:
      "HAZIR",

    rules: [
      "⚡ 5 Round",
      "🏆 İlk 3",
      "🚀 Hız",
    ],
  },

  {
    code: "player_quiz",

    title:
      "Player Quiz",

    description:
      "Aynı futbolcu için doğum yılı, milliyet ve kariyer kulüplerini rakibinden daha iyi tamamla.",

    icon:
      "🧠",

    enabled:
      true,

    badge:
      "HAZIR",

    rules: [
      "⏱ 250 sn",
      "🧠 Bilgi",
      "⚔️ VS",
    ],
  },

  {
    code: "club_nation",

    title:
      "1 Takım 1 Millet",

    description:
      "Verilen takım ve millet kombinasyonuna uyan futbolcuyu rakibinden önce bul. 5 round oynanır, ilk 3 roundu alan kazanır.",

    icon:
      "🌍",

    enabled:
      true,

    badge:
      "HAZIR",

    rules: [
      "⚡ 5 Round",
      "🏆 İlk 3",
      "🌍 Takım + Millet",
    ],
  },

  {
    code: "tic_tac_toe",

    title:
      "Futbol Tic Tac Toe",

    description:
      "Takım ve ülke kriterlerini sağlayan futbolcuları bularak rakibinden önce üçlü sırayı tamamla.",

    icon:
      "❌",

    enabled:
      false,

    badge:
      "YAKINDA",
  },
];

/* =========================================================
   HELPERS
========================================================= */

function cleanPlayerName(
  value: string,
) {
  return value
    .trim()
    .replace(
      /\s+/g,
      " ",
    );
}

async function readJsonSafely<T>(
  response: Response,
): Promise<T> {
  const contentType =
    response.headers.get(
      "content-type",
    ) ?? "";

  if (
    !contentType
      .toLowerCase()
      .includes(
        "application/json",
      )
  ) {
    const rawText =
      await response.text();

    console.error(
      "Challenge API JSON dışı cevap:",
      {
        status:
          response.status,

        statusText:
          response.statusText,

        contentType,

        body:
          rawText.slice(
            0,
            700,
          ),
      },
    );

    throw new Error(
      `Challenge API geçersiz cevap döndürdü. HTTP ${response.status}`,
    );
  }

  return (
    await response.json()
  ) as T;
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

              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-purple-400" />

              <p className="mt-4 text-sm font-bold text-slate-400">
                Düello ekranı hazırlanıyor...
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

  /* =======================================================
     URL GAME
  ======================================================= */

  const gameFromUrl =
    searchParams.get(
      "game",
    );

  const initialGameCode =
    useMemo(
      () => {
        const requested =
          GAME_OPTIONS.find(
            (
              game,
            ) =>
              game.code ===
                gameFromUrl &&
              game.enabled,
          );

        if (
          requested
        ) {
          return requested.code;
        }

        return "club_clash";
      },
      [
        gameFromUrl,
      ],
    );

  /* =======================================================
     FORM
  ======================================================= */

  const [
    selectedGameCode,
    setSelectedGameCode,
  ] =
    useState(
      initialGameCode,
    );

  const [
    challengerName,
    setChallengerName,
  ] =
    useState("");

  /* =======================================================
     LOGGED USER
  ======================================================= */

  const [
    loggedInName,
    setLoggedInName,
  ] =
    useState<
      string | null
    >(null);

  const [
    checkingUser,
    setCheckingUser,
  ] =
    useState(true);

  /* =======================================================
     ACTION
  ======================================================= */

  const [
    creating,
    setCreating,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  /* =======================================================
     URL SYNC
  ======================================================= */

  useEffect(() => {
    setSelectedGameCode(
      initialGameCode,
    );
  }, [
    initialGameCode,
  ]);

  /* =======================================================
     LOAD CURRENT USER

     Giriş varsa profil adını otomatik kullanıyoruz.
     Guest ise isim inputu gösteriyoruz.
  ======================================================= */

  useEffect(() => {
    let cancelled =
      false;

    async function loadCurrentUser() {
      try {
        const supabase =
          createClient();

        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser();

        if (
          cancelled
        ) {
          return;
        }

        if (
          !user
        ) {
          setLoggedInName(
            null,
          );

          return;
        }

        const {
          data:
            profile,
        } =
          await supabase
            .from(
              "profiles",
            )
            .select(`
              username,
              display_name
            `)
            .eq(
              "id",
              user.id,
            )
            .maybeSingle();

        if (
          cancelled
        ) {
          return;
        }

        const name =
          profile
            ?.display_name
            ?.trim() ||
          profile
            ?.username
            ?.trim() ||
          user.email
            ?.split(
              "@",
            )[0]
            ?.trim() ||
          "Oyuncu";

        setLoggedInName(
          name,
        );

        setChallengerName(
          name,
        );
      } catch (
        loadError
      ) {
        console.error(
          "Challenge kullanıcı bilgisi okunamadı:",
          loadError,
        );

        setLoggedInName(
          null,
        );
      } finally {
        if (
          !cancelled
        ) {
          setCheckingUser(
            false,
          );
        }
      }
    }

    void loadCurrentUser();

    return () => {
      cancelled =
        true;
    };
  }, []);

  /* =======================================================
     SELECTED GAME
  ======================================================= */

  const selectedGame =
    useMemo(
      () =>
        GAME_OPTIONS.find(
          (
            game,
          ) =>
            game.code ===
            selectedGameCode,
        ) ??
        null,
      [
        selectedGameCode,
      ],
    );

  /* =======================================================
     CREATE CHALLENGE
  ======================================================= */

  async function createChallenge() {
    if (
      creating ||
      checkingUser
    ) {
      return;
    }

    const cleanName =
      cleanPlayerName(
        challengerName,
      );

    if (
      !cleanName
    ) {
      setError(
        "Düelloda görünecek ismini yaz.",
      );

      return;
    }

    if (
      cleanName.length <
      2
    ) {
      setError(
        "İsmin en az 2 karakter olmalı.",
      );

      return;
    }

    if (
      cleanName.length >
      30
    ) {
      setError(
        "İsmin en fazla 30 karakter olabilir.",
      );

      return;
    }

    if (
      !selectedGame
    ) {
      setError(
        "Önce bir oyun seç.",
      );

      return;
    }

    if (
      !selectedGame.enabled
    ) {
      setError(
        "Bu oyun henüz aktif değil.",
      );

      return;
    }

    try {
      setCreating(
        true,
      );

      setError(
        "",
      );

      const response =
        await fetch(
          "/api/challenges/create",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify({
                gameCode:
                  selectedGame.code,

                challengerName:
                  cleanName,
              }),
          },
        );

      const json =
        await readJsonSafely<CreateChallengeResponse>(
          response,
        );

      if (
        !response.ok ||
        !json.ok
      ) {
        throw new Error(
          json.error ??
            `Meydan okuma oluşturulamadı. HTTP ${response.status}`,
        );
      }

      const challengeToken =
        json.challenge
          ?.token ??
        json.token;

      if (
        !challengeToken
      ) {
        throw new Error(
          "Challenge oluşturuldu fakat davet bağlantısı alınamadı.",
        );
      }

      if (
        selectedGame.code ===
        "club_nation"
      ) {
        router.push(
  `/challenge/${encodeURIComponent(
    challengeToken,
  )}`,
);

        return;
      }

      router.push(
        `/challenge/${encodeURIComponent(
          challengeToken,
        )}`,
      );
    } catch (
      createError
    ) {
      console.error(
        "Challenge create frontend hatası:",
        createError,
      );

      setError(
        createError instanceof Error
          ? createError.message
          : "Meydan okuma oluşturulamadı.",
      );
    } finally {
      setCreating(
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

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="border-b border-white/10 pb-6">

          <div className="flex flex-wrap items-center justify-between gap-3">

            <Link
              href="/"
              className="inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/5"
            >
              ← Ana Sayfa
            </Link>

            <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-purple-300">
              ⚔️ Düello
            </span>

          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-purple-400">
            FootBattle Arena
          </p>

          <h1 className="mt-2 text-4xl font-black sm:text-5xl">
            Düello Başlat
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Oyununu seç ve meydan okumayı oluştur.
            Sana özel linki arkadaşına gönder.
            Arkadaşının hesap açmasına gerek yok.
          </p>

        </header>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">

            {error}

          </div>
        )}

        {/* =================================================
            MAIN GRID
        ================================================= */}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">

          {/* ===============================================
              GAME SELECTION
          =============================================== */}

          <section className="rounded-3xl border border-white/10 bg-[#101c2c] p-6">

            <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">
              1. Oyun
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Kapışacağınız oyunu seç
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Challenge altyapısına bağlı oyunlardan birini seç.
            </p>

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
                        !game.enabled ||
                        creating
                      }
                      onClick={() => {
                        setSelectedGameCode(
                          game.code,
                        );

                        setError(
                          "",
                        );
                      }}
                      className={`relative w-full overflow-hidden rounded-2xl border p-5 text-left transition ${
                        !game.enabled
                          ? "cursor-not-allowed border-white/[0.05] bg-black/10 opacity-45"
                          : selected
                            ? "border-purple-400/50 bg-purple-500/15"
                            : "border-white/10 bg-black/10 hover:border-white/20 hover:bg-white/[0.03]"
                      }`}
                    >

                      <div className="flex items-start gap-4">

                        <div
                          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ${
                            selected
                              ? "bg-purple-500/20"
                              : "bg-white/[0.04]"
                          }`}
                        >
                          {game.icon}
                        </div>

                        <div className="min-w-0 flex-1">

                          <div className="flex flex-wrap items-center justify-between gap-2">

                            <p className="font-black">
                              {game.title}
                            </p>

                            <div className="flex items-center gap-2">

                              {game.badge && (
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
                                    game.enabled
                                      ? "bg-green-500/15 text-green-400"
                                      : "bg-white/[0.06] text-slate-600"
                                  }`}
                                >
                                  {game.badge}
                                </span>
                              )}

                              {selected &&
                                game.enabled && (
                                  <span className="rounded-full bg-purple-500 px-2.5 py-1 text-[9px] font-black">
                                    SEÇİLDİ
                                  </span>
                                )}

                            </div>

                          </div>

                          <p className="mt-2 text-sm leading-5 text-slate-500">
                            {game.description}
                          </p>

                          {game.rules &&
                            game.rules.length >
                              0 && (
                              <div className="mt-3 flex flex-wrap gap-2">

                                {game.rules.map(
                                  (
                                    rule,
                                  ) => (
                                    <GameRuleBadge
                                      key={
                                        rule
                                      }
                                    >
                                      {rule}
                                    </GameRuleBadge>
                                  ),
                                )}

                              </div>
                            )}

                        </div>

                      </div>

                    </button>
                  );
                },
              )}

            </div>

          </section>

          {/* ===============================================
              PLAYER
          =============================================== */}

          <section className="rounded-3xl border border-white/10 bg-[#101c2c] p-6">

            <p className="text-xs font-black uppercase tracking-[0.2em] text-green-400">
              2. Sen
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Düellodaki adın
            </h2>

            {/* =============================================
                USER CHECK
            ============================================= */}

            {checkingUser ? (
              <div className="mt-6 rounded-xl border border-white/10 bg-[#07111f] px-4 py-4 text-sm font-bold text-slate-500">
                Oyuncu bilgisi hazırlanıyor...
              </div>
            ) : loggedInName ? (
              /* ===========================================
                 LOGGED USER

                 Input göstermiyoruz.
              =========================================== */

              <div className="mt-6 rounded-2xl border border-green-500/20 bg-green-500/[0.06] p-5">

                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  FootBattle Profili
                </p>

                <p className="mt-2 text-2xl font-black text-green-300">
                  {loggedInName}
                </p>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Düelloda profilindeki isim kullanılacak.
                  Tekrar isim yazmana gerek yok.
                </p>

              </div>
            ) : (
              /* ===========================================
                 GUEST
              =========================================== */

              <>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Üyelik gerekmiyor. Rakibinin seni tanıyacağı bir isim yaz.
                </p>

                <label className="mt-6 block">

                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Oyuncu Adı
                  </span>

                  <input
                    type="text"
                    value={
                      challengerName
                    }
                    onChange={(
                      event,
                    ) => {
                      setChallengerName(
                        event.target
                          .value,
                      );

                      setError(
                        "",
                      );
                    }}
                    onKeyDown={(
                      event,
                    ) => {
                      if (
                        event.key ===
                        "Enter"
                      ) {
                        void createChallenge();
                      }
                    }}
                    disabled={
                      creating
                    }
                    maxLength={
                      30
                    }
                    placeholder="Örn. Emre"
                    autoComplete="nickname"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-4 text-base font-bold outline-none transition placeholder:text-slate-700 focus:border-green-400/40 disabled:opacity-50"
                  />

                </label>

                <div className="mt-2 flex items-center justify-between">

                  <p className="text-[11px] text-slate-600">
                    2–30 karakter
                  </p>

                  <p className="text-[11px] font-bold text-slate-600">
                    {challengerName.length}
                    /30
                  </p>

                </div>

              </>
            )}

            {/* =============================================
                INFO
            ============================================= */}

            <div className="mt-6 rounded-2xl border border-green-500/15 bg-green-500/[0.05] p-4">

              <p className="text-sm font-black text-green-300">
                ✓ Rakibin hesap açmak zorunda değil
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Meydan okumayı oluşturduktan sonra sana özel
                davet linki gelecek. Arkadaşın linke girip sadece
                ismini yazarak katılabilecek.
              </p>

            </div>

            {/* =============================================
                FLOW
            ============================================= */}

            <div className="mt-5 rounded-2xl border border-white/10 bg-[#07111f] p-4">

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
                Nasıl çalışır?
              </p>

              <div className="mt-4 space-y-3">

                <FlowItem
                  number="1"
                  text="Meydan okumayı oluştur."
                />

                <FlowItem
                  number="2"
                  text="Linki WhatsApp'tan arkadaşına gönder."
                />

                <FlowItem
                  number="3"
                  text="Arkadaşın ismini yazıp katılsın."
                />

                <FlowItem
                  number="4"
                  text="Düelloyu başlat ve kapış."
                />

              </div>

            </div>

          </section>

        </div>

        {/* =================================================
            CREATE
        ================================================= */}

        <section className="mt-6 rounded-3xl border border-purple-500/20 bg-purple-500/[0.05] p-6">

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div className="min-w-0">

              <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">
                Meydan Okuma
              </p>

              <p className="mt-2 text-xl font-black">

                {selectedGame
                  ?.icon ??
                  "⚔️"}

                {" "}

                {selectedGame
                  ?.title ??
                  "Oyun seçilmedi"}

              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">

                <span>
                  Oyuncu:
                </span>

                <span className="font-black text-white">
                  {cleanPlayerName(
                    challengerName,
                  ) ||
                    "İsim bekleniyor"}
                </span>

              </div>

            </div>

            <button
              type="button"
              disabled={
                creating ||
                checkingUser ||
                !selectedGame
                  ?.enabled ||
                cleanPlayerName(
                  challengerName,
                ).length <
                  2
              }
              onClick={() =>
                void createChallenge()
              }
              className="shrink-0 rounded-xl bg-purple-500 px-7 py-4 text-sm font-black text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {creating
                ? "Oluşturuluyor..."
                : "⚔️ Meydan Okuma Oluştur"}
            </button>

          </div>

        </section>

        {/* =================================================
            INFO CARDS
        ================================================= */}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">

          <InfoCard
            icon="👤"
            title="Üyeliksiz Rakip"
            description="Challenge linkini alan oyuncu hesap açmadan katılabilir."
          />

          <InfoCard
            icon="🔗"
            title="Tek Link"
            description="Linki gönder, arkadaşın direkt düello ekranına gelsin."
          />

          <InfoCard
            icon="⚡"
            title="Canlı"
            description="Round ve skorlar iki tarafta otomatik güncellenir."
          />

        </div>

      </div>

    </main>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function GameRuleBadge({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <span className="rounded-full border border-white/10 bg-[#07111f] px-2.5 py-1 text-[10px] font-black text-slate-400">
      {children}
    </span>
  );
}

function FlowItem({
  number,
  text,
}: {
  number: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3">

      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-[11px] font-black text-purple-300">
        {number}
      </div>

      <p className="text-xs font-bold leading-5 text-slate-400">
        {text}
      </p>

    </div>
  );
}

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#101c2c] p-4">

      <div className="text-xl">
        {icon}
      </div>

      <p className="mt-2 text-sm font-black">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>

    </div>
  );
}