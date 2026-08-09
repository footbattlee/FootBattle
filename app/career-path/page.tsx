"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const DEFAULT_MAX_WRONG_GUESSES = 5;
const DEFAULT_MINIMUM_SEARCH_LENGTH = 3;

type GameStatus =
  | "playing"
  | "won"
  | "lost";

type PublicPlayer = {
  id: number;
  fullName: string;
  imageUrl: string | null;
};

type BoardConfig = {
  clubSlots: number;
};

type ScoringConfig = {
  zeroWrong: number;
  oneWrong: number;
  twoWrong: number;
  threeWrong: number;
  fourWrong: number;
  fiveWrong: number;
};

type GameSession = {
  sessionId: string;
  player: PublicPlayer;
  board: BoardConfig;
  maxWrongGuesses: number;
  minimumSearchLength: number;
  scoring: ScoringConfig;
};

type SolvedClub = {
  id: number;
  name: string;
  careerOrder: number;
};

type TodayResponse = {
  ok?: boolean;
  error?: string;

  sessionId?: string;

  player?: PublicPlayer;

  board?: BoardConfig;

  maxWrongGuesses?: number;

  minimumSearchLength?: number;

  scoring?: ScoringConfig;
};

type ClubSearchResponse = {
  ok?: boolean;
  error?: string;
  clubs?: string[];
};

type GuessResponse = {
  ok?: boolean;
  error?: string;

  correct?: boolean;
  duplicate?: boolean;

  matchedClub?:
    | SolvedClub
    | null;
};

type ResultResponse = {
  ok?: boolean;
  error?: string;

  won?: boolean;
  score?: number;

  wrongCount?: number;
  attemptCount?: number;

  alreadyRecorded?: boolean;

  player?:
    | PublicPlayer
    | null;

  allClubs?: SolvedClub[];

  currentStreak?:
    | number
    | null;

  bestStreak?:
    | number
    | null;

  totalScore?: number;

  gamesPlayed?: number;

  gamesWon?: number;
};

const DEFAULT_SCORING: ScoringConfig = {
  zeroWrong: 250,
  oneWrong: 200,
  twoWrong: 150,
  threeWrong: 100,
  fourWrong: 50,
  fiveWrong: 0,
};

function getScore(
  wrongCount: number,
  scoring: ScoringConfig,
) {
  if (
    wrongCount <= 0
  ) {
    return scoring.zeroWrong;
  }

  if (
    wrongCount === 1
  ) {
    return scoring.oneWrong;
  }

  if (
    wrongCount === 2
  ) {
    return scoring.twoWrong;
  }

  if (
    wrongCount === 3
  ) {
    return scoring.threeWrong;
  }

  if (
    wrongCount === 4
  ) {
    return scoring.fourWrong;
  }

  return scoring.fiveWrong;
}

export default function CareerPathPage() {
  /* =======================================================
     GAME SESSION
  ======================================================= */

  const [
    gameSession,
    setGameSession,
  ] =
    useState<GameSession | null>(
      null,
    );

  const [
    loadingGame,
    setLoadingGame,
  ] =
    useState(true);

  const [
    loadingError,
    setLoadingError,
  ] =
    useState("");

  const [
    newGameLoading,
    setNewGameLoading,
  ] =
    useState(false);

  /* =======================================================
     SEARCH
  ======================================================= */

  const [
    clubInput,
    setClubInput,
  ] =
    useState("");

  const [
    clubSelected,
    setClubSelected,
  ] =
    useState(false);

  const [
    clubResults,
    setClubResults,
  ] =
    useState<string[]>([]);

  const [
    clubSearchLoading,
    setClubSearchLoading,
  ] =
    useState(false);

  const [
    clubSearchError,
    setClubSearchError,
  ] =
    useState("");

  /* =======================================================
     GAME STATE
  ======================================================= */

  const [
    solvedClubs,
    setSolvedClubs,
  ] =
    useState<SolvedClub[]>([]);

  const [
    revealedClubs,
    setRevealedClubs,
  ] =
    useState<SolvedClub[]>([]);

  const [
    wrongCount,
    setWrongCount,
  ] =
    useState(0);

  const [
    attemptCount,
    setAttemptCount,
  ] =
    useState(0);

  const [
    gameStatus,
    setGameStatus,
  ] =
    useState<GameStatus>(
      "playing",
    );

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState(
      "😏 Footy: Oyuncunun kariyerindeki kulüpleri bul.",
    );

  /* =======================================================
     RESULT
  ======================================================= */

  const [
    resultSaved,
    setResultSaved,
  ] =
    useState(false);

  const [
    resultSaving,
    setResultSaving,
  ] =
    useState(false);

  const [
    resultSaveMessage,
    setResultSaveMessage,
  ] =
    useState("");

  /* =======================================================
     COMPUTED
  ======================================================= */

  const maxWrongGuesses =
    gameSession?.maxWrongGuesses ??
    DEFAULT_MAX_WRONG_GUESSES;

  const minimumSearchLength =
    gameSession
      ?.minimumSearchLength ??
    DEFAULT_MINIMUM_SEARCH_LENGTH;

  const scoring =
    gameSession?.scoring ??
    DEFAULT_SCORING;

  const clubSlotCount =
    gameSession?.board.clubSlots ??
    0;

  const currentScore =
    useMemo(
      () =>
        getScore(
          wrongCount,
          scoring,
        ),
      [
        wrongCount,
        scoring,
      ],
    );

  const completedCount =
    solvedClubs.length;

  const progressPercentage =
    clubSlotCount > 0
      ? (
          completedCount /
          clubSlotCount
        ) *
        100
      : 0;

  const remainingWrongGuesses =
    Math.max(
      maxWrongGuesses -
        wrongCount,
      0,
    );

  /* =======================================================
     RESET LOCAL STATE
  ======================================================= */

  const resetLocalGame =
    useCallback(() => {
      setClubInput("");

      setClubSelected(
        false,
      );

      setClubResults(
        [],
      );

      setClubSearchLoading(
        false,
      );

      setClubSearchError(
        "",
      );

      setSolvedClubs(
        [],
      );

      setRevealedClubs(
        [],
      );

      setWrongCount(
        0,
      );

      setAttemptCount(
        0,
      );

      setGameStatus(
        "playing",
      );

      setSubmitting(
        false,
      );

      setResultSaved(
        false,
      );

      setResultSaving(
        false,
      );

      setResultSaveMessage(
        "",
      );

      setMessage(
        "😏 Footy: Oyuncunun kariyerindeki kulüpleri bul.",
      );
    }, []);

  /* =======================================================
     NEW GAME
  ======================================================= */

  const startNewGame =
    useCallback(
      async (
        initial =
          false,
      ) => {
        try {
          if (initial) {
            setLoadingGame(
              true,
            );
          } else {
            setNewGameLoading(
              true,
            );
          }

          setLoadingError(
            "",
          );

          resetLocalGame();

          const response =
            await fetch(
              "/api/career-path/today",
              {
                method:
                  "GET",

                cache:
                  "no-store",
              },
            );

          const result =
            (await response.json()) as TodayResponse;

          if (
            !response.ok ||
            !result.ok
          ) {
            throw new Error(
              result.error ??
                "Yeni Career Path oyunu hazırlanamadı.",
            );
          }

          if (
            !result.sessionId ||
            !result.player ||
            !result.board
          ) {
            throw new Error(
              "Career Path oyun bilgileri eksik geldi.",
            );
          }

          setGameSession({
            sessionId:
              result.sessionId,

            player:
              result.player,

            board:
              result.board,

            maxWrongGuesses:
              result.maxWrongGuesses ??
              DEFAULT_MAX_WRONG_GUESSES,

            minimumSearchLength:
              result.minimumSearchLength ??
              DEFAULT_MINIMUM_SEARCH_LENGTH,

            scoring:
              result.scoring ??
              DEFAULT_SCORING,
          });

          setMessage(
            initial
              ? "😏 Footy: Oyuncunun kariyerindeki kulüpleri bul."
              : "⚽ Footy: Yeni oyuncu hazır. Kariyerini ne kadar biliyorsun görelim.",
          );
        } catch (error) {
          console.error(
            "Career Path yükleme hatası:",
            error,
          );

          setGameSession(
            null,
          );

          setLoadingError(
            error instanceof Error
              ? error.message
              : "Yeni Career Path oyunu hazırlanamadı.",
          );
        } finally {
          setLoadingGame(
            false,
          );

          setNewGameLoading(
            false,
          );
        }
      },
      [
        resetLocalGame,
      ],
    );

  /* =======================================================
     INITIAL GAME
  ======================================================= */

  useEffect(() => {
    void startNewGame(
      true,
    );
  }, [
    startNewGame,
  ]);

  /* =======================================================
     CLUB SEARCH
  ======================================================= */

  useEffect(() => {
    const query =
      clubInput.trim();

    if (
      query.length <
        minimumSearchLength ||
      clubSelected ||
      gameStatus !==
        "playing" ||
      solvedClubs.length >=
        clubSlotCount
    ) {
      setClubResults(
        [],
      );

      setClubSearchLoading(
        false,
      );

      setClubSearchError(
        "",
      );

      return;
    }

    const abortController =
      new AbortController();

    const timer =
      window.setTimeout(
        async () => {
          try {
            setClubSearchLoading(
              true,
            );

            setClubSearchError(
              "",
            );

            const response =
              await fetch(
                `/api/player-quiz/search-club?q=${encodeURIComponent(
                  query,
                )}`,
                {
                  cache:
                    "no-store",

                  signal:
                    abortController.signal,
                },
              );

            const result =
              (await response.json()) as ClubSearchResponse;

            if (
              !response.ok ||
              !result.ok
            ) {
              throw new Error(
                result.error ??
                  "Kulüpler aranamadı.",
              );
            }

            setClubResults(
              result.clubs ??
                [],
            );
          } catch (error) {
            if (
              error instanceof
                DOMException &&
              error.name ===
                "AbortError"
            ) {
              return;
            }

            console.error(
              "Career Path kulüp arama hatası:",
              error,
            );

            setClubResults(
              [],
            );

            setClubSearchError(
              error instanceof Error
                ? error.message
                : "Kulüpler aranamadı.",
            );
          } finally {
            setClubSearchLoading(
              false,
            );
          }
        },
        250,
      );

    return () => {
      window.clearTimeout(
        timer,
      );

      abortController.abort();
    };
  }, [
    clubInput,
    clubSelected,
    clubSlotCount,
    gameStatus,
    minimumSearchLength,
    solvedClubs.length,
  ]);

  /* =======================================================
     SELECT CLUB
  ======================================================= */

  function selectClub(
    club: string,
  ) {
    setClubInput(
      club,
    );

    setClubSelected(
      true,
    );

    setClubResults(
      [],
    );

    setClubSearchError(
      "",
    );
  }

  /* =======================================================
     RESULT
  ======================================================= */

  async function saveGameResult(
    finishReason:
      | "won"
      | "lost",

    nextSolvedClubs:
      SolvedClub[],

    nextWrongCount:
      number,

    nextAttemptCount:
      number,
  ) {
    if (
      resultSaved ||
      resultSaving ||
      !gameSession
    ) {
      return;
    }

    try {
      setResultSaving(
        true,
      );

      setResultSaveMessage(
        "Sonuç kaydediliyor...",
      );

      const response =
        await fetch(
          "/api/career-path/result",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                sessionId:
                  gameSession.sessionId,

                finishReason,

                solvedClubIds:
                  nextSolvedClubs.map(
                    (
                      club,
                    ) =>
                      club.id,
                  ),

                wrongCount:
                  nextWrongCount,

                attemptCount:
                  nextAttemptCount,
              }),
          },
        );

      const result =
        (await response.json()) as ResultResponse;

      if (
        response.status ===
        401
      ) {
        setResultSaveMessage(
          "Puanını kaydetmek için giriş yapmalısın.",
        );

        return;
      }

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
            "Career Path sonucu kaydedilemedi.",
        );
      }

      setResultSaved(
        true,
      );

      /*
       * Kaybedince bütün kariyer burada geliyor.
       */
      if (
        result.allClubs &&
        result.allClubs.length >
          0
      ) {
        setRevealedClubs(
          result.allClubs,
        );
      }

      if (
        result.alreadyRecorded
      ) {
        setResultSaveMessage(
          "Bu oyunun sonucu daha önce kaydedilmiş.",
        );

        return;
      }

      if (
        result.won
      ) {
        setResultSaveMessage(
          `${result.score ?? 0} puan hesabına eklendi. 🔥`,
        );
      } else {
        setResultSaveMessage(
          "Career Path sonucun kaydedildi.",
        );
      }
    } catch (error) {
      console.error(
        "Career Path sonuç kayıt hatası:",
        error,
      );

      setResultSaveMessage(
        error instanceof Error
          ? error.message
          : "Sonuç kaydedilirken hata oluştu.",
      );
    } finally {
      setResultSaving(
        false,
      );
    }
  }

  /* =======================================================
     SUBMIT CLUB
  ======================================================= */

  async function submitClub() {
    if (
      !gameSession ||
      submitting ||
      resultSaving ||
      gameStatus !==
        "playing"
    ) {
      return;
    }

    const clubName =
      clubInput.trim();

    if (
      !clubName ||
      !clubSelected
    ) {
      if (
        clubResults.length ===
        1
      ) {
        const onlyClub =
          clubResults[0];

        setClubInput(
          onlyClub,
        );

        setClubSelected(
          true,
        );

        await submitSelectedClub(
          onlyClub,
        );

        return;
      }

      setMessage(
        "😏 Footy: Kulübü arama listesinden seç.",
      );

      return;
    }

    await submitSelectedClub(
      clubName,
    );
  }

  /* =======================================================
     ACTUAL SUBMIT
  ======================================================= */

  async function submitSelectedClub(
    clubName: string,
  ) {
    if (
      !gameSession ||
      submitting ||
      resultSaving ||
      gameStatus !==
        "playing"
    ) {
      return;
    }

    try {
      setSubmitting(
        true,
      );

      setMessage(
        "👀 Footy: Kulüp kontrol ediliyor...",
      );

      const response =
        await fetch(
          "/api/career-path/guess",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                sessionId:
                  gameSession.sessionId,

                clubName,

                solvedClubIds:
                  solvedClubs.map(
                    (
                      club,
                    ) =>
                      club.id,
                  ),
              }),
          },
        );

      const result =
        (await response.json()) as GuessResponse;

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
            "Kulüp kontrol edilemedi.",
        );
      }

      const nextAttemptCount =
        attemptCount +
        1;

      setAttemptCount(
        nextAttemptCount,
      );

      /* =================================================
         DUPLICATE
      ================================================= */

      if (
        result.duplicate
      ) {
        setClubInput(
          "",
        );

        setClubSelected(
          false,
        );

        setClubResults(
          [],
        );

        setMessage(
          "😏 Footy: Bu kulübü zaten buldun. Başka bir kulüp dene.",
        );

        return;
      }

      /* =================================================
         WRONG
      ================================================= */

      if (
        !result.correct ||
        !result.matchedClub
      ) {
        const nextWrongCount =
          wrongCount +
          1;

        setWrongCount(
          nextWrongCount,
        );

        setClubInput(
          "",
        );

        setClubSelected(
          false,
        );

        setClubResults(
          [],
        );

        if (
          nextWrongCount >=
          maxWrongGuesses
        ) {
          setGameStatus(
            "lost",
          );

          setMessage(
            "😂 Footy: Beş yanlış yaptın. Eksik kariyer kulüplerini aşağıda açıyorum.",
          );

          void saveGameResult(
            "lost",
            solvedClubs,
            nextWrongCount,
            nextAttemptCount,
          );

          return;
        }

        setMessage(
          `❌ Footy: Bu kulüp kariyerinde yok. ${
            maxWrongGuesses -
            nextWrongCount
          } hata hakkın kaldı.`,
        );

        return;
      }

      /* =================================================
         CORRECT

         Burada kritik nokta:
         matchedClub.careerOrder hangi slot ise
         o slot açılıyor.
      ================================================= */

      const nextSolvedClubs =
        [
          ...solvedClubs,
          result.matchedClub,
        ].sort(
          (
            firstClub,
            secondClub,
          ) =>
            firstClub.careerOrder -
            secondClub.careerOrder,
        );

      setSolvedClubs(
        nextSolvedClubs,
      );

      setClubInput(
        "",
      );

      setClubSelected(
        false,
      );

      setClubResults(
        [],
      );

      /* =================================================
         WON
      ================================================= */

      if (
        nextSolvedClubs.length >=
        clubSlotCount
      ) {
        setGameStatus(
          "won",
        );

        setRevealedClubs(
          nextSolvedClubs,
        );

        setMessage(
          `🎉 Footy: ${gameSession.player.fullName} kariyerini tamamen bildin!`,
        );

        void saveGameResult(
          "won",
          nextSolvedClubs,
          wrongCount,
          nextAttemptCount,
        );

        return;
      }

      setMessage(
        `✅ Footy: ${result.matchedClub.name} doğru! Kariyerde ${result.matchedClub.careerOrder}. sıraya yerleşti.`,
      );
    } catch (error) {
      console.error(
        "Career Path tahmin hatası:",
        error,
      );

      setMessage(
        error instanceof Error
          ? `⚠️ Footy: ${error.message}`
          : "⚠️ Footy: Kulüp kontrol edilemedi.",
      );
    } finally {
      setSubmitting(
        false,
      );
    }
  }

  /* =======================================================
     NEW GAME BUTTON
  ======================================================= */

  async function handleNewGame() {
    if (
      newGameLoading ||
      submitting ||
      resultSaving
    ) {
      return;
    }

    await startNewGame(
      false,
    );
  }

  /* =======================================================
     DISPLAY CLUBS
  ======================================================= */

  const displayClubs =
    gameStatus ===
      "lost" &&
    revealedClubs.length >
      0
      ? revealedClubs
      : solvedClubs;

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loadingGame &&
    !gameSession
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07111f] text-white">

        <div className="text-center">

          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-white/10 border-t-amber-400" />

          <p className="mt-4 text-sm text-slate-400">
            Yeni Career Path hazırlanıyor...
          </p>

        </div>

      </main>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (
    loadingError ||
    !gameSession
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07111f] px-4 text-white">

        <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-red-500/10 p-7 text-center">

          <p className="text-xl font-black">
            Oyun yüklenemedi
          </p>

          <p className="mt-3 text-sm text-red-200">
            {loadingError ||
              "Career Path oyunu hazırlanamadı."}
          </p>

          <button
            type="button"
            onClick={() =>
              void startNewGame(
                true,
              )
            }
            className="mt-5 rounded-xl bg-white px-5 py-3 font-black text-[#07111f]"
          >
            Tekrar Dene
          </button>

        </div>

      </main>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-6 text-white sm:px-6">

      <div className="mx-auto max-w-5xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="flex items-center justify-between border-b border-white/10 pb-5">

          <Link
            href="/"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:border-amber-400/40 hover:text-amber-300"
          >
            ← Ana Sayfa
          </Link>

          <div className="text-center">

            <p className="font-black">
              FootBattle
            </p>

            <p className="text-xs text-slate-500">
              Career Path
            </p>

          </div>

          <div className="text-right">

            <p className="text-sm font-black text-amber-300">
              {currentScore} puan
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {attemptCount} tahmin
            </p>

          </div>

        </header>

        {/* =================================================
            MAIN CARD
        ================================================= */}

        <section className="mt-7 overflow-hidden rounded-3xl border border-amber-400/20 bg-[#111b2a] shadow-2xl shadow-black/40">

          {/* ===============================================
              TOP BAR
          =============================================== */}

          <div className="border-b border-white/10 bg-gradient-to-r from-amber-500 to-yellow-400 px-5 py-5 text-center text-[#111827]">

            <p className="text-xs font-black uppercase tracking-[0.25em]">
              SINIRSIZ CAREER PATH
            </p>

            <h1 className="mt-1 text-2xl font-black">
              Kariyerindeki kulüpleri bul
            </h1>

          </div>

          <div className="p-5 sm:p-8">

            <div className="grid gap-7 lg:grid-cols-[0.7fr_1.3fr]">

              {/* =============================================
                  LEFT
              ============================================= */}

              <div>

                {/* PLAYER */}

                <div className="rounded-3xl border border-amber-400/20 bg-amber-400/5 p-5 text-center">

                  <span className="inline-block rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-black text-amber-300">
                    YENİ OYUN
                  </span>

                  <div className="mx-auto mt-5 flex h-60 w-60 items-end justify-center overflow-hidden rounded-3xl border border-white/10 bg-[#07111f]">

                    {gameSession.player.imageUrl ? (
                      <img
                        src={
                          gameSession.player.imageUrl
                        }
                        alt={
                          gameSession.player.fullName
                        }
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="text-6xl">
                        ⚽
                      </div>
                    )}

                  </div>

                  <h2 className="mt-5 text-2xl font-black">
                    {gameSession.player.fullName}
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    Kulüpleri istediğin sırada bulabilirsin.
                    Doğru kulüp kendi kariyer sırasına yerleşir.
                  </p>

                </div>

                {/* STATS */}

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-5">

                  <div className="grid grid-cols-3 gap-3 text-center">

                    <div>

                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Tamamlanan
                      </p>

                      <p className="mt-2 text-3xl font-black text-green-400">
                        {completedCount}
                        /
                        {clubSlotCount}
                      </p>

                    </div>

                    <div>

                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Yanlış
                      </p>

                      <p className="mt-2 text-3xl font-black text-red-400">
                        {wrongCount}
                        /
                        {maxWrongGuesses}
                      </p>

                    </div>

                    <div>

                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Kalan
                      </p>

                      <p className="mt-2 text-3xl font-black text-amber-300">
                        {remainingWrongGuesses}
                      </p>

                    </div>

                  </div>

                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/5">

                    <div
                      className="h-full rounded-full bg-green-500 transition-all duration-500"
                      style={{
                        width:
                          `${progressPercentage}%`,
                      }}
                    />

                  </div>

                </div>

                {/* SCORE TABLE */}

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">

                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Güncel puan
                  </p>

                  <p className="mt-2 text-4xl font-black text-amber-300">
                    {currentScore}
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">

                    {[
                      [
                        "0 yanlış",
                        250,
                        "text-green-300",
                      ],
                      [
                        "1 yanlış",
                        200,
                        "text-green-300",
                      ],
                      [
                        "2 yanlış",
                        150,
                        "text-yellow-300",
                      ],
                      [
                        "3 yanlış",
                        100,
                        "text-yellow-300",
                      ],
                      [
                        "4 yanlış",
                        50,
                        "text-orange-300",
                      ],
                      [
                        "5 yanlış",
                        0,
                        "text-red-300",
                      ],
                    ].map(
                      ([
                        label,
                        scoreValue,
                        color,
                      ]) => (
                        <div
                          key={
                            String(
                              label,
                            )
                          }
                          className="rounded-lg bg-white/5 p-2"
                        >

                          {label}

                          <strong
                            className={`mt-1 block ${color}`}
                          >
                            {scoreValue}
                          </strong>

                        </div>
                      ),
                    )}

                  </div>

                </div>

              </div>

              {/* =============================================
                  RIGHT
              ============================================= */}

              <div>

                {/* FOOTY */}

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">

                  <p className="text-sm leading-6 text-slate-300">
                    {message}
                  </p>

                </div>

                {/* ===========================================
                    SEARCH
                =========================================== */}

                {gameStatus ===
                  "playing" && (
                  <div className="relative mt-5">

                    <div className="flex gap-2">

                      <input
                        type="text"
                        value={
                          clubInput
                        }
                        disabled={
                          submitting ||
                          resultSaving
                        }
                        onChange={(
                          event,
                        ) => {
                          setClubInput(
                            event.target.value,
                          );

                          setClubSelected(
                            false,
                          );

                          setClubSearchError(
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
                            event.preventDefault();

                            void submitClub();
                          }
                        }}
                        placeholder={`Kulüp ara... En az ${minimumSearchLength} harf`}
                        autoComplete="off"
                        className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#07111f] px-5 py-4 outline-none placeholder:text-slate-600 focus:border-amber-400/50 disabled:cursor-not-allowed disabled:opacity-50"
                      />

                      <button
                        type="button"
                        disabled={
                          submitting ||
                          resultSaving ||
                          (
                            !clubSelected &&
                            clubResults.length !==
                              1
                          )
                        }
                        onClick={() =>
                          void submitClub()
                        }
                        className="shrink-0 rounded-2xl bg-amber-400 px-5 py-4 font-black text-[#111827] transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {submitting
                          ? "..."
                          : "Kontrol"}
                      </button>

                    </div>

                    {!clubSelected &&
                      clubInput.trim()
                        .length >=
                        minimumSearchLength && (
                        <SearchDropdown
                          loading={
                            clubSearchLoading
                          }
                          error={
                            clubSearchError
                          }
                          emptyText="Kulüp bulunamadı."
                          items={
                            clubResults
                          }
                          onSelect={
                            selectClub
                          }
                        />
                      )}

                    <p className="mt-3 text-center text-xs text-slate-600">
                      Takım adının herhangi bir yerinden 3 harf yazabilirsin.
                    </p>

                  </div>
                )}

                {/* ===========================================
                    CAREER PATH
                =========================================== */}

                <div className="mt-6">

                  <p className="mb-3 text-sm font-black uppercase tracking-widest text-amber-200">
                    Kariyer Yolu
                  </p>

                  <div className="space-y-3">

                    {Array.from({
                      length:
                        clubSlotCount,
                    }).map(
                      (
                        _,
                        index,
                      ) => {
                        const slotNumber =
                          index +
                          1;

                        const club =
                          displayClubs.find(
                            (
                              solvedClub,
                            ) =>
                              solvedClub.careerOrder ===
                              slotNumber,
                          );

                        const wasSolved =
                          solvedClubs.some(
                            (
                              solvedClub,
                            ) =>
                              solvedClub.id ===
                              club?.id,
                          );

                        const revealedAfterLoss =
                          gameStatus ===
                            "lost" &&
                          club &&
                          !wasSolved;

                        return (
                          <div
                            key={
                              index
                            }
                            className={`flex min-h-20 items-center gap-4 rounded-2xl border px-5 transition ${
                              club
                                ? revealedAfterLoss
                                  ? "border-amber-400/30 bg-amber-400/10"
                                  : "border-green-400/40 bg-green-500/15"
                                : "border-white/10 bg-[#0c1929]"
                            }`}
                          >

                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-black ${
                                club
                                  ? revealedAfterLoss
                                    ? "bg-amber-400 text-[#07111f]"
                                    : "bg-green-500 text-[#07111f]"
                                  : "bg-white/5 text-slate-500"
                              }`}
                            >
                              {slotNumber}
                            </div>

                            <div className="flex-1">

                              {club ? (
                                <>

                                  <p
                                    className={`text-lg font-black ${
                                      revealedAfterLoss
                                        ? "text-amber-200"
                                        : "text-green-200"
                                    }`}
                                  >
                                    {club.name}
                                  </p>

                                  <p
                                    className={`mt-1 text-xs ${
                                      revealedAfterLoss
                                        ? "text-amber-400/70"
                                        : "text-green-400/70"
                                    }`}
                                  >
                                    {revealedAfterLoss
                                      ? "Oyun sonunda açıldı"
                                      : "Doğru tahmin"}
                                  </p>

                                </>
                              ) : (
                                <>

                                  <p className="text-lg font-black text-slate-600">
                                    ?
                                  </p>

                                  <p className="mt-1 text-xs text-slate-600">
                                    Bu kariyer kulübü henüz bulunamadı.
                                  </p>

                                </>
                              )}

                            </div>

                            {club && (
                              <span
                                className={`flex h-8 w-8 items-center justify-center rounded-full font-black text-[#07111f] ${
                                  revealedAfterLoss
                                    ? "bg-amber-400"
                                    : "bg-green-500"
                                }`}
                              >
                                {revealedAfterLoss
                                  ? "!"
                                  : "✓"}
                              </span>
                            )}

                          </div>
                        );
                      },
                    )}

                  </div>

                </div>

                {/* ===========================================
                    RESULT
                =========================================== */}

                {gameStatus !==
                  "playing" && (
                  <div
                    className={`mt-6 rounded-2xl border p-6 text-center ${
                      gameStatus ===
                      "won"
                        ? "border-green-500/30 bg-green-500/10"
                        : "border-red-500/30 bg-red-500/10"
                    }`}
                  >

                    <p className="text-4xl">
                      {gameStatus ===
                      "won"
                        ? "🏆"
                        : "😤"}
                    </p>

                    <p className="mt-3 text-2xl font-black">
                      {gameStatus ===
                      "won"
                        ? "Career Path tamamlandı!"
                        : "Career Path sona erdi"}
                    </p>

                    <p className="mt-2 text-sm text-slate-300">
                      {gameSession.player.fullName}
                    </p>

                    <p
                      className={`mt-4 text-5xl font-black ${
                        gameStatus ===
                        "won"
                          ? "text-green-400"
                          : "text-slate-500"
                      }`}
                    >
                      {gameStatus ===
                      "won"
                        ? `${currentScore} puan`
                        : "0 puan"}
                    </p>

                    {gameStatus ===
                      "won" && (
                      <p className="mt-3 text-sm text-amber-200">

                        {wrongCount ===
                        0
                          ? "Hatasız tamamladın. Kusursuz kariyer bilgisi! 🔥"
                          : `${wrongCount} yanlışla tamamladın.`}

                      </p>
                    )}

                    {gameStatus ===
                      "lost" &&
                      resultSaving && (
                        <p className="mt-3 text-sm text-slate-400">
                          Eksik kariyer kulüpleri yükleniyor...
                        </p>
                      )}

                    {gameStatus ===
                      "lost" &&
                      revealedClubs.length >
                        0 && (
                        <p className="mt-3 text-sm text-amber-200">
                          Bulamadığın kulüpler yukarıda sarı olarak gösterildi.
                        </p>
                      )}

                    {resultSaveMessage && (
                      <p
                        className={`mt-4 text-sm font-semibold ${
                          resultSaveMessage.includes(
                            "giriş",
                          ) ||
                          resultSaveMessage.includes(
                            "hata",
                          ) ||
                          resultSaveMessage.includes(
                            "kaydedilemedi",
                          )
                            ? "text-amber-300"
                            : "text-yellow-200"
                        }`}
                      >
                        {resultSaveMessage}
                      </p>
                    )}

                    <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">

                      <button
                        type="button"
                        disabled={
                          newGameLoading ||
                          resultSaving
                        }
                        onClick={() =>
                          void handleNewGame()
                        }
                        className="rounded-xl bg-amber-400 px-6 py-3 text-sm font-black text-[#111827] transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {newGameLoading
                          ? "Yeni oyuncu seçiliyor..."
                          : "⚽ Yeni Oyuncuyla Tekrar Oyna"}
                      </button>

                      <Link
                        href="/"
                        className="rounded-xl border border-white/15 px-6 py-3 text-sm font-black transition hover:bg-white/5"
                      >
                        Ana Sayfa
                      </Link>

                    </div>

                  </div>
                )}

              </div>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}

/* =========================================================
   SEARCH DROPDOWN
========================================================= */

type SearchDropdownProps = {
  loading: boolean;

  error: string;

  emptyText: string;

  items: string[];

  onSelect:
    (
      item: string,
    ) => void;
};

function SearchDropdown({
  loading,
  error,
  emptyText,
  items,
  onSelect,
}: SearchDropdownProps) {
  return (
    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-[#0c1929] shadow-2xl shadow-black/60">

      {loading ? (
        <p className="px-4 py-3 text-sm text-slate-500">
          Kulüpler aranıyor...
        </p>
      ) : error ? (
        <p className="px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : items.length >
        0 ? (
        items.map(
          (
            item,
          ) => (
            <button
              key={
                item
              }
              type="button"
              onClick={() =>
                onSelect(
                  item,
                )
              }
              className="block w-full border-b border-white/5 px-4 py-3 text-left text-sm font-semibold transition last:border-b-0 hover:bg-white/5"
            >
              {item}
            </button>
          ),
        )
      ) : (
        <p className="px-4 py-3 text-sm text-slate-500">
          {emptyText}
        </p>
      )}

    </div>
  );
}