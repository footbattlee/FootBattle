"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/* =========================================================
   SETTINGS
========================================================= */

const DEFAULT_MAX_LIVES = 5;
const DEFAULT_GUESS_TIME_SECONDS = 20;
const DEFAULT_MINIMUM_SEARCH_LENGTH = 3;

const COMPLETION_SCORE = 500;

/* =========================================================
   TYPES
========================================================= */

type GameStatus =
  | "playing"
  | "won"
  | "lost";

type FieldType =
  | "birthYear"
  | "nationality"
  | "club";

type PublicPlayer = {
  id: number;
  fullName: string;
  imageUrl: string | null;
};

type BoardConfig = {
  birthYearSlots: number;
  nationalitySlots: number;
  clubSlots: number;
  totalSlots: number;
};

type GameSession = {
  sessionId: string;

  player: PublicPlayer;

  maxLives: number;

  guessTimeSeconds: number;

  minimumSearchLength: number;

  board: BoardConfig;
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

  maxLives?: number;

  guessTimeSeconds?: number;

  minimumSearchLength?: number;

  board?: BoardConfig;
};

type GuessResponse = {
  ok?: boolean;
  error?: string;

  field?: FieldType;

  correct?: boolean;

  duplicate?: boolean;

  matchedClub?:
    | SolvedClub
    | null;
};

type CountrySearchResponse = {
  ok?: boolean;
  error?: string;
  countries?: string[];
};

type ClubSearchResponse = {
  ok?: boolean;
  error?: string;
  clubs?: string[];
};

type CorrectAnswers = {
  birthYear: number;

  nationality:
    | string
    | null;

  clubs: SolvedClub[];
};

type ResultResponse = {
  ok?: boolean;
  error?: string;

  won?: boolean;

  score?: number;

  attemptCount?: number;

  alreadyRecorded?: boolean;

  player?:
    | PublicPlayer
    | null;

  correctAnswers?:
    | CorrectAnswers
    | null;

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

type ResultSnapshot = {
  birthYear: string;

  nationality: string;

  solvedClubs: SolvedClub[];

  attemptCount: number;
};

/* =========================================================
   PAGE
========================================================= */

export default function PlayerQuizPage() {
  /* =======================================================
     SESSION
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
     GAME
  ======================================================= */

  const [
    lives,
    setLives,
  ] =
    useState(
      DEFAULT_MAX_LIVES,
    );

  const [
    timeLeft,
    setTimeLeft,
  ] =
    useState(
      DEFAULT_GUESS_TIME_SECONDS,
    );

  const [
    gameStatus,
    setGameStatus,
  ] =
    useState<GameStatus>(
      "playing",
    );

  const [
    message,
    setMessage,
  ] =
    useState(
      "😏 Footy: İstediğin kutudan başlayabilirsin.",
    );

  const [
    attemptCount,
    setAttemptCount,
  ] =
    useState(0);

  const [
    submittingField,
    setSubmittingField,
  ] =
    useState<FieldType | null>(
      null,
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

  const [
    correctAnswers,
    setCorrectAnswers,
  ] =
    useState<CorrectAnswers | null>(
      null,
    );

  /* =======================================================
     BIRTH YEAR
  ======================================================= */

  const [
    birthYearInput,
    setBirthYearInput,
  ] =
    useState("");

  const [
    solvedBirthYear,
    setSolvedBirthYear,
  ] =
    useState(false);

  const [
    solvedBirthYearValue,
    setSolvedBirthYearValue,
  ] =
    useState("");

  /* =======================================================
     NATIONALITY
  ======================================================= */

  const [
    nationalityInput,
    setNationalityInput,
  ] =
    useState("");

  const [
    solvedNationality,
    setSolvedNationality,
  ] =
    useState(false);

  const [
    solvedNationalityValue,
    setSolvedNationalityValue,
  ] =
    useState("");

  const [
    countrySelected,
    setCountrySelected,
  ] =
    useState(false);

  const [
    countryResults,
    setCountryResults,
  ] =
    useState<string[]>([]);

  const [
    countrySearchLoading,
    setCountrySearchLoading,
  ] =
    useState(false);

  const [
    countrySearchError,
    setCountrySearchError,
  ] =
    useState("");

  /* =======================================================
     CLUBS
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

  const [
    solvedClubs,
    setSolvedClubs,
  ] =
    useState<SolvedClub[]>([]);

  /* =======================================================
     COMPUTED
  ======================================================= */

  const maxLives =
    gameSession?.maxLives ??
    DEFAULT_MAX_LIVES;

  const guessTimeSeconds =
    gameSession
      ?.guessTimeSeconds ??
    DEFAULT_GUESS_TIME_SECONDS;

  const minimumSearchLength =
    gameSession
      ?.minimumSearchLength ??
    DEFAULT_MINIMUM_SEARCH_LENGTH;

  const clubSlotCount =
    gameSession?.board
      .clubSlots ??
    0;

  const totalSlotCount =
    gameSession?.board
      .totalSlots ??
    0;

  const completedCount =
    useMemo(() => {
      return (
        (
          solvedBirthYear
            ? 1
            : 0
        ) +
        (
          solvedNationality
            ? 1
            : 0
        ) +
        solvedClubs.length
      );
    }, [
      solvedBirthYear,
      solvedClubs.length,
      solvedNationality,
    ]);

  const progressPercentage =
    totalSlotCount > 0
      ? (
          completedCount /
          totalSlotCount
        ) *
        100
      : 0;

  /* =======================================================
     RESET STATE
  ======================================================= */

  const resetLocalGame =
    useCallback(() => {
      setLives(
        DEFAULT_MAX_LIVES,
      );

      setTimeLeft(
        DEFAULT_GUESS_TIME_SECONDS,
      );

      setGameStatus(
        "playing",
      );

      setMessage(
        "😏 Footy: İstediğin kutudan başlayabilirsin.",
      );

      setAttemptCount(
        0,
      );

      setSubmittingField(
        null,
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

      setCorrectAnswers(
        null,
      );

      setBirthYearInput(
        "",
      );

      setSolvedBirthYear(
        false,
      );

      setSolvedBirthYearValue(
        "",
      );

      setNationalityInput(
        "",
      );

      setSolvedNationality(
        false,
      );

      setSolvedNationalityValue(
        "",
      );

      setCountrySelected(
        false,
      );

      setCountryResults(
        [],
      );

      setCountrySearchError(
        "",
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

      setClubSearchError(
        "",
      );

      setSolvedClubs(
        [],
      );
    }, []);

  /* =======================================================
     START NEW GAME
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
              "/api/player-quiz/today",
              {
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
                "Yeni Player Quiz hazırlanamadı.",
            );
          }

          if (
            !result.sessionId ||
            !result.player ||
            !result.board
          ) {
            throw new Error(
              "Player Quiz bilgileri eksik geldi.",
            );
          }

          const session: GameSession =
            {
              sessionId:
                result.sessionId,

              player:
                result.player,

              maxLives:
                result.maxLives ??
                DEFAULT_MAX_LIVES,

              guessTimeSeconds:
                result.guessTimeSeconds ??
                DEFAULT_GUESS_TIME_SECONDS,

              minimumSearchLength:
                result.minimumSearchLength ??
                DEFAULT_MINIMUM_SEARCH_LENGTH,

              board:
                result.board,
            };

          setGameSession(
            session,
          );

          setLives(
            session.maxLives,
          );

          setTimeLeft(
            session.guessTimeSeconds,
          );

          setMessage(
            initial
              ? "😏 Footy: İstediğin kutudan başlayabilirsin."
              : `⚽ Footy: Yeni oyuncu hazır. ${session.player.fullName} seni bekliyor.`,
          );
        } catch (error) {
          console.error(
            "Player Quiz yükleme hatası:",
            error,
          );

          setGameSession(
            null,
          );

          setLoadingError(
            error instanceof Error
              ? error.message
              : "Player Quiz hazırlanamadı.",
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
     COUNTRY SEARCH
  ======================================================= */

  useEffect(() => {
    const query =
      nationalityInput.trim();

    if (
      query.length <
        minimumSearchLength ||
      countrySelected ||
      solvedNationality ||
      gameStatus !==
        "playing"
    ) {
      setCountryResults(
        [],
      );

      setCountrySearchLoading(
        false,
      );

      setCountrySearchError(
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
            setCountrySearchLoading(
              true,
            );

            setCountrySearchError(
              "",
            );

            const response =
              await fetch(
                `/api/player-quiz/search-country?q=${encodeURIComponent(
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
              (await response.json()) as CountrySearchResponse;

            if (
              !response.ok ||
              !result.ok
            ) {
              throw new Error(
                result.error ??
                  "Milliyetler aranamadı.",
              );
            }

            setCountryResults(
              result.countries ??
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
              "Milliyet arama hatası:",
              error,
            );

            setCountryResults(
              [],
            );

            setCountrySearchError(
              error instanceof Error
                ? error.message
                : "Milliyetler aranamadı.",
            );
          } finally {
            setCountrySearchLoading(
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
    countrySelected,
    gameStatus,
    minimumSearchLength,
    nationalityInput,
    solvedNationality,
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
      solvedClubs.length >=
        clubSlotCount ||
      gameStatus !==
        "playing"
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
              "Kulüp arama hatası:",
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
     SAVE RESULT
  ======================================================= */

  const saveGameResult =
    useCallback(
      async (
        finishReason:
          | "won"
          | "lost",

        snapshot:
          ResultSnapshot,
      ) => {
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
              "/api/player-quiz/result",
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

                    birthYear:
                      snapshot.birthYear,

                    nationality:
                      snapshot.nationality,

                    solvedClubIds:
                      snapshot.solvedClubs.map(
                        (
                          club,
                        ) =>
                          club.id,
                      ),

                    attemptCount:
                      snapshot.attemptCount,
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
                "Player Quiz sonucu kaydedilemedi.",
            );
          }

          setResultSaved(
            true,
          );

          if (
            result.correctAnswers
          ) {
            setCorrectAnswers(
              result.correctAnswers,
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
              `${result.score ?? COMPLETION_SCORE} puan hesabına eklendi. 🔥`,
            );
          } else {
            setResultSaveMessage(
              "Player Quiz sonucun kaydedildi.",
            );
          }
        } catch (error) {
          console.error(
            "Player Quiz sonuç kayıt hatası:",
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
      },
      [
        gameSession,
        resultSaved,
        resultSaving,
      ],
    );

  /* =======================================================
     FINISH GAME?
  ======================================================= */

  function finishGameIfCompleted(
    nextCompletedCount: number,

    snapshot:
      ResultSnapshot,
  ) {
    if (
      totalSlotCount >
        0 &&
      nextCompletedCount >=
        totalSlotCount
    ) {
      setGameStatus(
        "won",
      );

      setTimeLeft(
        0,
      );

      setMessage(
        `🎉 Footy: ${gameSession?.player.fullName} quizini tamamen doldurdun!`,
      );

      void saveGameResult(
        "won",
        snapshot,
      );

      return true;
    }

    return false;
  }

  /* =======================================================
     LOSE LIFE
  ======================================================= */

  const loseLife =
    useCallback(
      (
        reason:
          | "wrong"
          | "timeout",

        nextAttemptCount:
          number,
      ) => {
        const nextLives =
          Math.max(
            lives - 1,
            0,
          );

        setLives(
          nextLives,
        );

        if (
          nextLives ===
          0
        ) {
          setGameStatus(
            "lost",
          );

          setTimeLeft(
            0,
          );

          setMessage(
            reason ===
              "timeout"
              ? "⌛ Footy: Süre doldu ve son can da gitti."
              : "😂 Footy: Son can da gitti. Doğru cevapları açıyorum.",
          );

          void saveGameResult(
            "lost",
            {
              birthYear:
                solvedBirthYearValue,

              nationality:
                solvedNationalityValue,

              solvedClubs,

              attemptCount:
                nextAttemptCount,
            },
          );

          return;
        }

        setMessage(
          reason ===
            "timeout"
            ? `⌛ Footy: Süre doldu. ${nextLives} canın kaldı.`
            : `❌ Footy: Yanlış cevap. ${nextLives} canın kaldı.`,
        );

        setTimeLeft(
          guessTimeSeconds,
        );
      },
      [
        guessTimeSeconds,
        lives,
        saveGameResult,
        solvedBirthYearValue,
        solvedClubs,
        solvedNationalityValue,
      ],
    );

  /* =======================================================
     TIMER
  ======================================================= */

  useEffect(() => {
    if (
      !gameSession ||
      gameStatus !==
        "playing" ||
      submittingField !==
        null ||
      resultSaving
    ) {
      return;
    }

    if (
      timeLeft <=
      0
    ) {
      const nextAttemptCount =
        attemptCount +
        1;

      setAttemptCount(
        nextAttemptCount,
      );

      loseLife(
        "timeout",
        nextAttemptCount,
      );

      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setTimeLeft(
            (
              current,
            ) =>
              current - 1,
          );
        },
        1000,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    attemptCount,
    gameSession,
    gameStatus,
    loseLife,
    resultSaving,
    submittingField,
    timeLeft,
  ]);

  /* =======================================================
     SUBMIT FIELD
  ======================================================= */

  async function submitField(
    field: FieldType,
  ) {
    if (
      !gameSession ||
      gameStatus !==
        "playing" ||
      submittingField !==
        null ||
      resultSaving
    ) {
      return;
    }

    let value:
      | string
      | number = "";

    /* =====================================================
       BIRTH YEAR
    ===================================================== */

    if (
      field ===
      "birthYear"
    ) {
      value =
        birthYearInput.trim();

      if (!value) {
        setMessage(
          "😏 Footy: Önce bir doğum yılı yaz.",
        );

        return;
      }
    }

    /* =====================================================
       NATIONALITY
    ===================================================== */

    if (
      field ===
      "nationality"
    ) {
      value =
        nationalityInput.trim();

      if (
        !value ||
        !countrySelected
      ) {
        setMessage(
          "😏 Footy: Uyruğu arama listesinden seç.",
        );

        return;
      }
    }

    /* =====================================================
       CLUB
    ===================================================== */

    if (
      field ===
      "club"
    ) {
      value =
        clubInput.trim();

      if (
        !value ||
        !clubSelected
      ) {
        setMessage(
          "😏 Footy: Kulübü arama listesinden seç.",
        );

        return;
      }
    }

    try {
      setSubmittingField(
        field,
      );

      setMessage(
        "👀 Footy: Cevabın kontrol ediliyor...",
      );

      const response =
        await fetch(
          "/api/player-quiz/guess",
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

                field,

                value,

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
            "Cevap kontrol edilemedi.",
        );
      }

      const nextAttemptCount =
        attemptCount +
        1;

      setAttemptCount(
        nextAttemptCount,
      );

      /* =================================================
         DUPLICATE CLUB

         Can düşmüyor.
      ================================================= */

      if (
        field ===
          "club" &&
        result.duplicate
      ) {
        setClubInput(
          "",
        );

        setClubSelected(
          false,
        );

        setMessage(
          "😏 Footy: Bu kulübü zaten buldun.",
        );

        setTimeLeft(
          guessTimeSeconds,
        );

        return;
      }

      /* =================================================
         WRONG
      ================================================= */

      if (
        !result.correct
      ) {
        if (
          field ===
          "birthYear"
        ) {
          setBirthYearInput(
            "",
          );
        }

        if (
          field ===
          "nationality"
        ) {
          setNationalityInput(
            "",
          );

          setCountrySelected(
            false,
          );
        }

        if (
          field ===
          "club"
        ) {
          setClubInput(
            "",
          );

          setClubSelected(
            false,
          );
        }

        loseLife(
          "wrong",
          nextAttemptCount,
        );

        return;
      }

      /* =================================================
         BIRTH YEAR CORRECT
      ================================================= */

      if (
        field ===
        "birthYear"
      ) {
        const nextBirthYearValue =
          String(value);

        setSolvedBirthYear(
          true,
        );

        setSolvedBirthYearValue(
          nextBirthYearValue,
        );

        setBirthYearInput(
          "",
        );

        const nextCompletedCount =
          completedCount +
          1;

        const finished =
          finishGameIfCompleted(
            nextCompletedCount,
            {
              birthYear:
                nextBirthYearValue,

              nationality:
                solvedNationalityValue,

              solvedClubs,

              attemptCount:
                nextAttemptCount,
            },
          );

        if (!finished) {
          setMessage(
            "✅ Footy: Doğum yılı doğru!",
          );

          setTimeLeft(
            guessTimeSeconds,
          );
        }

        return;
      }

      /* =================================================
         NATIONALITY CORRECT
      ================================================= */

      if (
        field ===
        "nationality"
      ) {
        const nextNationalityValue =
          String(value);

        setSolvedNationality(
          true,
        );

        setSolvedNationalityValue(
          nextNationalityValue,
        );

        setNationalityInput(
          "",
        );

        setCountrySelected(
          false,
        );

        const nextCompletedCount =
          completedCount +
          1;

        const finished =
          finishGameIfCompleted(
            nextCompletedCount,
            {
              birthYear:
                solvedBirthYearValue,

              nationality:
                nextNationalityValue,

              solvedClubs,

              attemptCount:
                nextAttemptCount,
            },
          );

        if (!finished) {
          setMessage(
            "✅ Footy: Uyruk doğru!",
          );

          setTimeLeft(
            guessTimeSeconds,
          );
        }

        return;
      }

      /* =================================================
         CLUB CORRECT
      ================================================= */

      if (
        field ===
          "club" &&
        result.matchedClub
      ) {
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

        const nextCompletedCount =
          completedCount +
          1;

        const finished =
          finishGameIfCompleted(
            nextCompletedCount,
            {
              birthYear:
                solvedBirthYearValue,

              nationality:
                solvedNationalityValue,

              solvedClubs:
                nextSolvedClubs,

              attemptCount:
                nextAttemptCount,
            },
          );

        if (!finished) {
          setMessage(
            `✅ Footy: ${result.matchedClub.name} doğru kulüplerden biri!`,
          );

          setTimeLeft(
            guessTimeSeconds,
          );
        }
      }
    } catch (error) {
      console.error(
        "Player Quiz cevap kontrol hatası:",
        error,
      );

      setMessage(
        error instanceof Error
          ? `⚠️ Footy: ${error.message}`
          : "⚠️ Footy: Cevap kontrol edilemedi.",
      );
    } finally {
      setSubmittingField(
        null,
      );
    }
  }

  /* =======================================================
     SELECT AUTOCOMPLETE
  ======================================================= */

  function selectCountry(
    country: string,
  ) {
    setNationalityInput(
      country,
    );

    setCountrySelected(
      true,
    );

    setCountryResults(
      [],
    );
  }

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
  }

  /* =======================================================
     NEW GAME
  ======================================================= */

  async function handleNewGame() {
    if (
      newGameLoading ||
      resultSaving ||
      submittingField !==
        null
    ) {
      return;
    }

    await startNewGame(
      false,
    );
  }

  /* =======================================================
     DISPLAY CLUBS

     Kaybedince doğru cevapların tamamını aç.
  ======================================================= */

  const displayClubs =
    gameStatus ===
      "lost" &&
    correctAnswers?.clubs
      ? correctAnswers.clubs
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

          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-white/10 border-t-yellow-400" />

          <p className="mt-4 text-sm text-slate-400">
            Player Quiz hazırlanıyor...
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
              "Player Quiz hazırlanamadı."}
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
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:border-yellow-400/40 hover:text-yellow-300"
          >
            ← Ana Sayfa
          </Link>

          <div className="text-center">

            <p className="font-black">
              FootBattle
            </p>

            <p className="text-xs text-slate-500">
              Player Quiz
            </p>

          </div>

          <div className="text-right">

            <p className="text-sm">
              {"❤️".repeat(
                lives,
              )}

              {"🖤".repeat(
                Math.max(
                  maxLives -
                    lives,
                  0,
                ),
              )}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {attemptCount} tahmin
            </p>

          </div>

        </header>

        {/* =================================================
            MAIN CARD
        ================================================= */}

        <section className="mt-7 overflow-hidden rounded-3xl border border-yellow-400/20 bg-[#111b2a] shadow-2xl shadow-black/40">

          {/* TOP */}

          <div className="border-b border-white/10 bg-yellow-400 px-5 py-4 text-center text-[#111827]">

            <p className="text-xs font-black uppercase tracking-[0.25em]">
              SINIRSIZ PLAYER QUIZ
            </p>

            <h1 className="mt-1 text-2xl font-black">
              {gameSession.player.fullName}
            </h1>

          </div>

          <div className="p-5 sm:p-8">

            <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">

              {/* =============================================
                  LEFT
              ============================================= */}

              <div>

                <div className="rounded-3xl border border-yellow-400/20 bg-yellow-400/5 p-5 text-center">

                  <span className="inline-block rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-xs font-black text-yellow-300">
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

                  <p className="mt-4 text-sm text-slate-400">
                    Bu futbolcunun kariyer bilgilerini doldur.
                  </p>

                </div>

                {/* TIMER */}

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-5">

                  <div className="flex items-center justify-between">

                    <div>

                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Süre
                      </p>

                      <p
                        className={`mt-1 text-4xl font-black ${
                          timeLeft <=
                          5
                            ? "text-red-400"
                            : "text-yellow-300"
                        }`}
                      >
                        {timeLeft}
                      </p>

                    </div>

                    <div className="text-right">

                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Tamamlanan
                      </p>

                      <p className="mt-1 text-4xl font-black text-green-400">
                        {completedCount}
                        /
                        {totalSlotCount}
                      </p>

                    </div>

                  </div>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/5">

                    <div
                      className="h-full rounded-full bg-green-500 transition-all duration-500"
                      style={{
                        width:
                          `${progressPercentage}%`,
                      }}
                    />

                  </div>

                </div>

              </div>

              {/* =============================================
                  RIGHT
              ============================================= */}

              <div>

                {/* MESSAGE */}

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">

                  <p className="text-sm leading-6 text-slate-300">
                    {message}
                  </p>

                </div>

                {/* ===========================================
                    QUIZ CARDS
                =========================================== */}

                <div className="mt-5 grid gap-4 sm:grid-cols-2">

                  {/* BIRTH YEAR */}

                  <QuizCard
                    title="Doğum Yılı"
                    icon="🎂"
                    solved={
                      solvedBirthYear
                    }
                    solvedValue={
                      solvedBirthYearValue
                    }
                  >

                    <div className="flex gap-2">

                      <input
                        type="number"
                        min="1900"
                        max="2100"
                        value={
                          birthYearInput
                        }
                        disabled={
                          solvedBirthYear ||
                          gameStatus !==
                            "playing"
                        }
                        onChange={(
                          event,
                        ) =>
                          setBirthYearInput(
                            event.target.value,
                          )
                        }
                        onKeyDown={(
                          event,
                        ) => {
                          if (
                            event.key ===
                            "Enter"
                          ) {
                            void submitField(
                              "birthYear",
                            );
                          }
                        }}
                        placeholder="Örn. 1985"
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 outline-none placeholder:text-slate-600"
                      />

                      <CheckButton
                        loading={
                          submittingField ===
                          "birthYear"
                        }
                        disabled={
                          solvedBirthYear ||
                          gameStatus !==
                            "playing"
                        }
                        onClick={() =>
                          void submitField(
                            "birthYear",
                          )
                        }
                      />

                    </div>

                  </QuizCard>

                  {/* NATIONALITY */}

                  <QuizCard
                    title="Uyruk"
                    icon="🌍"
                    solved={
                      solvedNationality
                    }
                    solvedValue={
                      solvedNationalityValue
                    }
                  >

                    <div className="relative">

                      <div className="flex gap-2">

                        <input
                          type="text"
                          value={
                            nationalityInput
                          }
                          disabled={
                            solvedNationality ||
                            gameStatus !==
                              "playing"
                          }
                          onChange={(
                            event,
                          ) => {
                            setNationalityInput(
                              event.target.value,
                            );

                            setCountrySelected(
                              false,
                            );
                          }}
                          onKeyDown={(
                            event,
                          ) => {
                            if (
                              event.key ===
                              "Enter"
                            ) {
                              void submitField(
                                "nationality",
                              );
                            }
                          }}
                          placeholder={`En az ${minimumSearchLength} harf`}
                          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 outline-none placeholder:text-slate-600"
                        />

                        <CheckButton
                          loading={
                            submittingField ===
                            "nationality"
                          }
                          disabled={
                            solvedNationality ||
                            gameStatus !==
                              "playing"
                          }
                          onClick={() =>
                            void submitField(
                              "nationality",
                            )
                          }
                        />

                      </div>

                      {!countrySelected &&
                        !solvedNationality &&
                        nationalityInput.trim()
                          .length >=
                          minimumSearchLength &&
                        gameStatus ===
                          "playing" && (
                          <SearchDropdown
                            loading={
                              countrySearchLoading
                            }
                            error={
                              countrySearchError
                            }
                            emptyText="Milliyet bulunamadı."
                            items={
                              countryResults
                            }
                            onSelect={
                              selectCountry
                            }
                          />
                        )}

                    </div>

                  </QuizCard>

                  {/* CLUBS */}

                  <QuizCard
                    title="Oynadığı Kulüpler"
                    icon="⚽"
                    solved={
                      solvedClubs.length >=
                      clubSlotCount
                    }
                    solvedValue=""
                    wide
                  >

                    <div className="relative">

                      <div className="flex gap-2">

                        <input
                          type="text"
                          value={
                            clubInput
                          }
                          disabled={
                            solvedClubs.length >=
                              clubSlotCount ||
                            gameStatus !==
                              "playing"
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
                          }}
                          onKeyDown={(
                            event,
                          ) => {
                            if (
                              event.key ===
                              "Enter"
                            ) {
                              void submitField(
                                "club",
                              );
                            }
                          }}
                          placeholder={`Kulüp ara... En az ${minimumSearchLength} harf`}
                          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 outline-none placeholder:text-slate-600"
                        />

                        <CheckButton
                          loading={
                            submittingField ===
                            "club"
                          }
                          disabled={
                            solvedClubs.length >=
                              clubSlotCount ||
                            gameStatus !==
                              "playing"
                          }
                          onClick={() =>
                            void submitField(
                              "club",
                            )
                          }
                        />

                      </div>

                      {!clubSelected &&
                        solvedClubs.length <
                          clubSlotCount &&
                        clubInput.trim()
                          .length >=
                          minimumSearchLength &&
                        gameStatus ===
                          "playing" && (
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

                    </div>

                    {/* CLUB SLOTS */}

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">

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

                          const userSolved =
                            solvedClubs.some(
                              (
                                solvedClub,
                              ) =>
                                solvedClub.id ===
                                club?.id,
                            );

                          const revealed =
                            gameStatus ===
                              "lost" &&
                            club &&
                            !userSolved;

                          return (
                            <div
                              key={
                                index
                              }
                              className={`flex min-h-20 items-center justify-center rounded-xl border px-3 text-center text-sm font-bold ${
                                club
                                  ? revealed
                                    ? "border-yellow-400/40 bg-yellow-400/15 text-yellow-200"
                                    : "border-green-400/40 bg-green-500/20 text-green-200"
                                  : "border-white/10 bg-[#07111f] text-2xl text-slate-600"
                              }`}
                            >
                              {club
                                ? club.name
                                : "?"}
                            </div>
                          );
                        },
                      )}

                    </div>

                  </QuizCard>

                </div>

                {/* ===========================================
                    RESULT
                =========================================== */}

                {gameStatus !==
                  "playing" && (
                  <div
                    className={`mt-6 rounded-2xl border p-5 text-center ${
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
                        ? "Player Quiz tamamlandı!"
                        : "Canların bitti!"}

                    </p>

                    <p className="mt-2 text-sm text-slate-300">
                      {gameSession.player.fullName}
                    </p>

                    {/* LOSS ANSWERS */}

                    {gameStatus ===
                      "lost" &&
                      resultSaving && (
                        <p className="mt-4 text-sm text-slate-400">
                          Doğru cevaplar yükleniyor...
                        </p>
                      )}

                    {gameStatus ===
                      "lost" &&
                      correctAnswers && (
                        <div className="mx-auto mt-5 max-w-md rounded-2xl border border-white/10 bg-black/20 p-4 text-left">

                          <p className="text-center text-xs font-black uppercase tracking-widest text-yellow-300">
                            Doğru Cevaplar
                          </p>

                          <div className="mt-4 space-y-3">

                            <div className="flex items-center justify-between gap-4">

                              <span className="text-sm text-slate-500">
                                Doğum yılı
                              </span>

                              <strong className="text-white">
                                {correctAnswers.birthYear}
                              </strong>

                            </div>

                            <div className="flex items-center justify-between gap-4">

                              <span className="text-sm text-slate-500">
                                Uyruk
                              </span>

                              <strong className="text-white">
                                {correctAnswers.nationality ??
                                  "Bilinmiyor"}
                              </strong>

                            </div>

                          </div>

                          <p className="mt-4 text-center text-xs text-slate-500">
                            Eksik kulüpler yukarıdaki kutularda sarı olarak açıldı.
                          </p>

                        </div>
                      )}

                    <p
                      className={`mt-5 text-4xl font-black ${
                        gameStatus ===
                        "won"
                          ? "text-green-400"
                          : "text-slate-500"
                      }`}
                    >
                      {gameStatus ===
                      "won"
                        ? `${COMPLETION_SCORE} puan`
                        : "0 puan"}
                    </p>

                    {resultSaveMessage && (
                      <p
                        className={`mt-3 text-sm font-semibold ${
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

                    {/* ACTIONS */}

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
                        className="rounded-xl bg-yellow-400 px-6 py-3 text-sm font-black text-[#111827] transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
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
   QUIZ CARD
========================================================= */

type QuizCardProps = {
  title: string;
  icon: string;
  solved: boolean;
  solvedValue: string;
  wide?: boolean;
  children: ReactNode;
};

function QuizCard({
  title,
  icon,
  solved,
  solvedValue,
  wide = false,
  children,
}: QuizCardProps) {
  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        solved
          ? "border-green-400/40 bg-green-500/10"
          : "border-yellow-400/20 bg-yellow-400/5"
      } ${
        wide
          ? "sm:col-span-2"
          : ""
      }`}
    >

      <div className="mb-3 flex items-center justify-between gap-3">

        <div className="flex items-center gap-2">

          <span className="text-xl">
            {icon}
          </span>

          <p
            className={`text-sm font-black uppercase tracking-wide ${
              solved
                ? "text-green-300"
                : "text-yellow-200"
            }`}
          >
            {title}
          </p>

        </div>

        {solved && (
          <span className="rounded-full bg-green-500 px-2 py-1 text-xs font-black text-[#07111f]">
            ✓
          </span>
        )}

      </div>

      {solved &&
      solvedValue ? (
        <div className="rounded-xl border border-green-400/30 bg-green-500/20 px-4 py-4 text-center font-black text-green-100">
          {solvedValue}
        </div>
      ) : (
        children
      )}

    </div>
  );
}

/* =========================================================
   CHECK BUTTON
========================================================= */

type CheckButtonProps = {
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
};

function CheckButton({
  loading,
  disabled,
  onClick,
}: CheckButtonProps) {
  return (
    <button
      type="button"
      disabled={
        disabled ||
        loading
      }
      onClick={
        onClick
      }
      className="shrink-0 rounded-xl bg-yellow-400 px-4 py-3 text-sm font-black text-[#111827] transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {loading
        ? "..."
        : "Kontrol"}
    </button>
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
    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-[#0c1929] shadow-2xl shadow-black/60">

      {loading ? (
        <p className="px-4 py-3 text-sm text-slate-500">
          Aranıyor...
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