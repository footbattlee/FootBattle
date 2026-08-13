"use client";

import {
  useEffect,
  useState,
} from "react";

type SearchPlayer = {
  id: number;

  name: string;

  imageUrl:
    | string
    | null;

  nationality:
    | string
    | null;

  currentClubName:
    | string
    | null;

  popularityScore:
    | number
    | null;
};

type QuizItem = {
  id: string;

  playerId: number;

  playerName: string;

  playerImageUrl:
    | string
    | null;

  headline: string;

  clubName: string;

  isActive: boolean;

  createdAt:
    | string
    | null;
};

type AdminListResponse = {
  ok?: boolean;

  error?: string;

  activeQuiz?:
    | QuizItem
    | null;

  quizzes?: QuizItem[];
};

export default function TransferQuizAdminPage() {
  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    searchLoading,
    setSearchLoading,
  ] =
    useState(false);

  const [
    players,
    setPlayers,
  ] =
    useState<
      SearchPlayer[]
    >([]);

  const [
    selectedPlayer,
    setSelectedPlayer,
  ] =
    useState<
      SearchPlayer | null
    >(null);

  const [
    headline,
    setHeadline,
  ] =
    useState("");

  const [
    clubName,
    setClubName,
  ] =
    useState("");

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    activeQuiz,
    setActiveQuiz,
  ] =
    useState<
      QuizItem | null
    >(null);

  const [
    recentQuizzes,
    setRecentQuizzes,
  ] =
    useState<
      QuizItem[]
    >([]);

  /* =====================================================
     LOAD CURRENT
  ===================================================== */

  useEffect(() => {
    void loadCurrentQuizzes();
  }, []);

  async function loadCurrentQuizzes() {
    try {
      const response =
        await fetch(
          "/api/admin/transfer-quiz",
          {
            cache:
              "no-store",
          },
        );

      const result =
        (await response.json()) as AdminListResponse;

      if (
        !response.ok ||
        !result.ok
      ) {
        return;
      }

      setActiveQuiz(
        result.activeQuiz ??
        null,
      );

      setRecentQuizzes(
        result.quizzes ??
        [],
      );
    } catch {
      // admin sayfasını bozma
    }
  }

  /* =====================================================
     SEARCH
  ===================================================== */

  useEffect(() => {
    if (
      selectedPlayer &&
      search ===
        selectedPlayer.name
    ) {
      setPlayers([]);
      return;
    }

    const query =
      search.trim();

    if (
      query.length <
      2
    ) {
      setPlayers([]);
      return;
    }

    const timeout =
      window.setTimeout(
        () => {
          void searchPlayers(
            query,
          );
        },
        300,
      );

    return () =>
      window.clearTimeout(
        timeout,
      );
  }, [
    search,
    selectedPlayer,
  ]);

  async function searchPlayers(
    query: string,
  ) {
    try {
      setSearchLoading(
        true,
      );

      const response =
        await fetch(
          `/api/admin/transfer-quiz/player-search?q=${encodeURIComponent(
            query,
          )}`,
          {
            cache:
              "no-store",
          },
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.ok
      ) {
        setPlayers([]);
        return;
      }

      setPlayers(
        result.players ??
        [],
      );
    } catch {
      setPlayers([]);
    } finally {
      setSearchLoading(
        false,
      );
    }
  }

  /* =====================================================
     SELECT
  ===================================================== */

  function selectPlayer(
    player: SearchPlayer,
  ) {
    setSelectedPlayer(
      player,
    );

    setSearch(
      player.name,
    );

    setPlayers([]);

    setMessage("");
    setError("");
  }

  /* =====================================================
     SAVE
  ===================================================== */

  async function handleSave() {
    setMessage("");
    setError("");

    if (
      !selectedPlayer
    ) {
      setError(
        "Önce bir oyuncu seç.",
      );
      return;
    }

    if (
      !headline.trim()
    ) {
      setError(
        "Başlık gir.",
      );
      return;
    }

    if (
      !clubName.trim()
    ) {
      setError(
        "Hedef kulüp gir.",
      );
      return;
    }

    try {
      setSaving(
        true,
      );

      const response =
        await fetch(
          "/api/admin/transfer-quiz",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                playerId:
                  selectedPlayer.id,

                headline:
                  headline.trim(),

                clubName:
                  clubName.trim(),
              }),
          },
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
            "Quiz kaydedilemedi.",
        );
      }

      setMessage(
        `${selectedPlayer.name} Transfer Quiz için aktif edildi.`,
      );

      await loadCurrentQuizzes();
    } catch (
      saveError
    ) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Quiz kaydedilemedi.",
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-10 text-white">
      <div className="mx-auto max-w-5xl">

        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-green-400">
            FootBattle Admin
          </p>

          <h1 className="mt-2 text-3xl font-black">
            Transfer Quiz Yönetimi
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Oyuncuyu ara, transfer başlığını yaz ve aktif quiz olarak yayınla.
          </p>
        </div>

        {/* ACTIVE */}

        {activeQuiz && (
          <section className="mb-6 rounded-2xl border border-green-500/25 bg-green-500/[0.06] p-5">

            <p className="text-xs font-black uppercase tracking-widest text-green-400">
              Şu an aktif
            </p>

            <div className="mt-3 flex items-center gap-4">

              {activeQuiz.playerImageUrl ? (
                <img
                  src={
                    activeQuiz.playerImageUrl
                  }
                  alt=""
                  className="h-16 w-16 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/5 text-xl">
                  ⚽
                </div>
              )}

              <div>
                <p className="text-lg font-black">
                  {
                    activeQuiz.playerName
                  }
                </p>

                <p className="mt-1 text-sm text-slate-300">
                  {
                    activeQuiz.headline
                  }
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Hedef kulüp:{" "}
                  {
                    activeQuiz.clubName
                  }
                </p>
              </div>

            </div>

          </section>
        )}

        {/* FORM */}

        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">

          <div className="grid gap-5 lg:grid-cols-2">

            {/* PLAYER */}

            <div className="relative lg:col-span-2">

              <label className="text-sm font-black">
                Oyuncu Ara
              </label>

              <input
                value={
                  search
                }
                onChange={(
                  event,
                ) => {
                  setSearch(
                    event.target.value,
                  );

                  if (
                    selectedPlayer &&
                    event.target.value !==
                      selectedPlayer.name
                  ) {
                    setSelectedPlayer(
                      null,
                    );
                  }
                }}
                placeholder="Örn. Vlahovic"
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1726] px-4 py-3 text-sm outline-none transition focus:border-green-500/50"
              />

              {searchLoading && (
                <p className="mt-2 text-xs text-slate-500">
                  Oyuncular aranıyor...
                </p>
              )}

              {players.length >
                0 && (
                <div className="absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-xl border border-white/10 bg-[#0b1726] shadow-2xl">

                  {players.map(
                    (
                      player,
                    ) => (
                      <button
                        key={
                          player.id
                        }
                        type="button"
                        onClick={() =>
                          selectPlayer(
                            player,
                          )
                        }
                        className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition last:border-0 hover:bg-white/[0.05]"
                      >

                        {player.imageUrl ? (
                          <img
                            src={
                              player.imageUrl
                            }
                            alt=""
                            className="h-11 w-11 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/5">
                            ⚽
                          </div>
                        )}

                        <div className="min-w-0 flex-1">

                          <p className="truncate text-sm font-black">
                            {
                              player.name
                            }
                          </p>

                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {player.nationality ??
                              "-"}
                            {" • "}
                            {player.currentClubName ??
                              "-"}
                          </p>

                        </div>

                        {player.popularityScore !==
                          null && (
                          <span className="text-xs font-black text-green-400">
                            {
                              Math.round(
                                player.popularityScore,
                              )
                            }
                          </span>
                        )}

                      </button>
                    ),
                  )}

                </div>
              )}

              {selectedPlayer && (
                <div className="mt-3 rounded-xl border border-green-500/20 bg-green-500/[0.05] p-3">

                  <p className="text-xs font-black uppercase tracking-wider text-green-400">
                    Seçilen Oyuncu
                  </p>

                  <p className="mt-1 font-black">
                    {
                      selectedPlayer.name
                    }
                  </p>

                </div>
              )}

            </div>

            {/* HEADLINE */}

            <div>
              <label className="text-sm font-black">
                Başlık
              </label>

              <input
                value={
                  headline
                }
                onChange={(
                  event,
                ) =>
                  setHeadline(
                    event.target.value,
                  )
                }
                placeholder="Beşiktaş Transfer Özel"
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1726] px-4 py-3 text-sm outline-none transition focus:border-green-500/50"
              />
            </div>

            {/* CLUB */}

            <div>
              <label className="text-sm font-black">
                Hedef Kulüp
              </label>

              <input
                value={
                  clubName
                }
                onChange={(
                  event,
                ) =>
                  setClubName(
                    event.target.value,
                  )
                }
                placeholder="Beşiktaş"
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1726] px-4 py-3 text-sm outline-none transition focus:border-green-500/50"
              />
            </div>

          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
              {error}
            </div>
          )}

          {message && (
            <div className="mt-5 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm font-bold text-green-300">
              {message}
            </div>
          )}

          <button
            type="button"
            onClick={
              handleSave
            }
            disabled={
              saving ||
              !selectedPlayer
            }
            className="mt-6 rounded-xl bg-green-500 px-5 py-3 text-sm font-black text-[#07111f] transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving
              ? "Kaydediliyor..."
              : "Kaydet ve Aktif Et"}
          </button>

        </section>

        {/* RECENT */}

        {recentQuizzes.length >
          0 && (
          <section className="mt-8">

            <h2 className="text-xl font-black">
              Son Transfer Quizleri
            </h2>

            <div className="mt-4 space-y-3">

              {recentQuizzes.map(
                (
                  quiz,
                ) => (
                  <div
                    key={
                      quiz.id
                    }
                    className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3"
                  >

                    <div className="min-w-0">

                      <p className="truncate font-black">
                        {
                          quiz.playerName
                        }
                      </p>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {
                          quiz.headline
                        }
                        {" • "}
                        {
                          quiz.clubName
                        }
                      </p>

                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                        quiz.isActive
                          ? "bg-green-500/10 text-green-400"
                          : "bg-white/5 text-slate-500"
                      }`}
                    >
                      {quiz.isActive
                        ? "Aktif"
                        : "Pasif"}
                    </span>

                  </div>
                ),
              )}

            </div>

          </section>
        )}

      </div>
    </main>
  );
}