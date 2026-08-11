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
    gameSession?.board.clubSlots ??
    0;

  const totalSlotCount =
    gameSession?.board.totalSlots ??
    0;

  const completedCount =
    useMemo(() => {
      return (
        (solvedBirthYear
          ? 1
          : 0) +
        (solvedNationality
          ? 1
          : 0) +
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
              error instanceof DOMException &&
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
              error instanceof DOMException &&
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
     AUTOCOMPLETE
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
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#07111f] text-white">

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
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#07111f] px-4 text-white">

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
    <main className="min-h-[100dvh] bg-[#07111f] px-3 pb-[calc(24px+env(safe-area-inset-bottom))] pt-4 text-white sm:px-6 sm:py-6">

      <div className="mx-auto max-w-5xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-white/10 pb-3 sm:pb-5">

          <div className="flex justify-start">

            <Link
              href="/"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:border-yellow-400/40 hover:text-yellow-300 sm:px-4 sm:text-sm"
            >
              ← Ana Sayfa
            </Link>

          </div>

          <div className="text-center">

            <p className="text-sm font-black sm:text-base">
              FootBattle
            </p>

            <p className="text-[10px] text-slate-500 sm:text-xs">
              Player Quiz
            </p>

          </div>

          <div className="flex justify-end">

            <div className="text-right">

              <p className="text-[11px] leading-none sm:text-sm">
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

              <p className="mt-1 text-[9px] text-slate-600 sm:text-xs">
                {attemptCount} tahmin
              </p>

            </div>

          </div>

        </header>

        {/* =================================================
            MAIN CARD
        ================================================= */}

        <section className="mt-4 overflow-hidden rounded-2xl border border-yellow-400/20 bg-[#111b2a] shadow-2xl shadow-black/40 sm:mt-7 sm:rounded-3xl">

          {/* =================================================
              PLAYER HERO
          ================================================= */}

          <div className="border-b border-white/10 bg-gradient-to-b from-yellow-400/[0.11] to-transparent px-4 pb-4 pt-4 text-center sm:px-6 sm:pb-6 sm:pt-6">

            <div className="flex items-start justify-between gap-3 sm:hidden">

              <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-yellow-300">
                SOLO
              </span>

              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">

                <span className="text-xs">
                  ⏱
                </span>

                <span
                  className={`font-mono text-sm font-black ${
                    timeLeft <=
                    5
                      ? "text-red-300"
                      : "text-yellow-300"
                  }`}
                >
                  {timeLeft}s
                </span>

              </div>

            </div>

            <p className="hidden text-xs font-black uppercase tracking-[0.22em] text-yellow-300 sm:block">
              SOLO PLAYER QUIZ
            </p>

            <h1 className="mt-3 text-2xl font-black sm:mt-2 sm:text-3xl">
              {gameSession.player.fullName}
            </h1>

            <div className="mx-auto mt-3 flex h-40 w-40 items-end justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#07111f] sm:mt-5 sm:h-60 sm:w-60 sm:rounded-3xl">

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
                <div className="text-5xl sm:text-6xl">
                  ⚽
                </div>
              )}

            </div>

            <p className="mx-auto mt-3 max-w-md text-xs leading-5 text-slate-400 sm:mt-4 sm:text-sm">
              Doğum yılını, uyruğunu ve kariyer kulüplerini doldur.
            </p>

          </div>

          {/* =================================================
              BODY
          ================================================= */}

          <div className="p-3 sm:p-8">

            {/* ===============================================
                COMPACT STATUS - MOBILE
            =============================================== */}

            <div className="grid grid-cols-3 gap-2 sm:hidden">

              <CompactStat
                label="Süre"
                value={`${timeLeft}s`}
                tone={
                  timeLeft <=
                  5
                    ? "danger"
                    : "warning"
                }
              />

              <CompactStat
                label="Tamamlanan"
                value={`${completedCount}/${totalSlotCount}`}
                tone="success"
              />

              <CompactStat
                label="Can"
                value={`${lives}/${maxLives}`}
              />

            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5 sm:hidden">

              <div
                className="h-full rounded-full bg-green-500 transition-all duration-500"
                style={{
                  width:
                    `${progressPercentage}%`,
                }}
              />

            </div>

            {/* ===============================================
                DESKTOP STATUS
            =============================================== */}

            <div className="hidden grid-cols-2 gap-4 sm:grid">

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">

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

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">

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

            <div className="mt-4 hidden h-3 overflow-hidden rounded-full bg-white/5 sm:block">

              <div
                className="h-full rounded-full bg-green-500 transition-all duration-500"
                style={{
                  width:
                    `${progressPercentage}%`,
                }}
              />

            </div>

            {/* ===============================================
                FOOTY
            =============================================== */}

            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-center sm:mt-5 sm:rounded-2xl sm:p-4">

              <p className="text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6">
                {message}
              </p>

            </div>

            {/* ===============================================
                QUIZ GRID
            =============================================== */}

            <div className="mt-4 grid gap-3 sm:mt-5 sm:grid-cols-2 sm:gap-4">

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
                progress={
                  solvedBirthYear
                    ? "1/1"
                    : "0/1"
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
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-sm font-bold outline-none placeholder:text-slate-600 focus:border-yellow-400/40 sm:px-4 sm:text-base"
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
                progress={
                  solvedNationality
                    ? "1/1"
                    : "0/1"
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
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-sm font-bold outline-none placeholder:text-slate-600 focus:border-yellow-400/40 sm:px-4 sm:text-base"
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
                title="Kariyer Kulüpleri"
                icon="🏟️"
                solved={
                  solvedClubs.length >=
                  clubSlotCount
                }
                solvedValue=""
                progress={`${solvedClubs.length}/${clubSlotCount}`}
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
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-sm font-bold outline-none placeholder:text-slate-600 focus:border-yellow-400/40 sm:px-4 sm:text-base"
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

                <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-3">

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
                          className={`flex min-h-[58px] items-center justify-center rounded-xl border px-2 text-center text-xs font-black sm:min-h-20 sm:px-3 sm:text-sm ${
                            club
                              ? revealed
                                ? "border-yellow-400/40 bg-yellow-400/15 text-yellow-200"
                                : "border-green-400/40 bg-green-500/20 text-green-200"
                              : "border-white/10 bg-[#07111f] text-xl text-slate-600 sm:text-2xl"
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

            {/* ===============================================
                RESULT
            =============================================== */}

            {gameStatus !==
              "playing" && (
              <div
                className={`mt-5 rounded-2xl border p-4 text-center sm:mt-6 sm:p-5 ${
                  gameStatus ===
                  "won"
                    ? "border-green-500/30 bg-green-500/10"
                    : "border-red-500/30 bg-red-500/10"
                }`}
              >

                <p className="text-3xl sm:text-4xl">
                  {gameStatus ===
                  "won"
                    ? "🏆"
                    : "😤"}
                </p>

                <p className="mt-2 text-xl font-black sm:mt-3 sm:text-2xl">
                  {gameStatus ===
                  "won"
                    ? "Player Quiz tamamlandı!"
                    : "Canların bitti!"}
                </p>

                <p className="mt-1.5 text-xs text-slate-300 sm:mt-2 sm:text-sm">
                  {gameSession.player.fullName}
                </p>

                {gameStatus ===
                  "lost" &&
                  resultSaving && (
                    <p className="mt-3 text-xs text-slate-400 sm:mt-4 sm:text-sm">
                      Doğru cevaplar yükleniyor...
                    </p>
                  )}

                {gameStatus ===
                  "lost" &&
                  correctAnswers && (
                    <div className="mx-auto mt-4 max-w-md rounded-2xl border border-white/10 bg-black/20 p-4 text-left sm:mt-5">

                      <p className="text-center text-[10px] font-black uppercase tracking-widest text-yellow-300 sm:text-xs">
                        Doğru Cevaplar
                      </p>

                      <div className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">

                        <div className="flex items-center justify-between gap-4">

                          <span className="text-xs text-slate-500 sm:text-sm">
                            Doğum yılı
                          </span>

                          <strong className="text-sm text-white sm:text-base">
                            {correctAnswers.birthYear}
                          </strong>

                        </div>

                        <div className="flex items-center justify-between gap-4">

                          <span className="text-xs text-slate-500 sm:text-sm">
                            Uyruk
                          </span>

                          <strong className="text-sm text-white sm:text-base">
                            {correctAnswers.nationality ??
                              "Bilinmiyor"}
                          </strong>

                        </div>

                      </div>

                      <p className="mt-3 text-center text-[10px] leading-4 text-slate-500 sm:mt-4 sm:text-xs">
                        Eksik kulüpler yukarıdaki kutularda sarı olarak açıldı.
                      </p>

                    </div>
                  )}

                <p
                  className={`mt-4 text-3xl font-black sm:mt-5 sm:text-4xl ${
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
                    className={`mt-2 text-xs font-semibold sm:mt-3 sm:text-sm ${
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

                <div className="mt-4 flex flex-col justify-center gap-2 sm:mt-6 sm:flex-row">

                  <button
                    type="button"
                    disabled={
                      newGameLoading ||
                      resultSaving
                    }
                    onClick={() =>
                      void handleNewGame()
                    }
                    className="rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black text-[#111827] transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6 sm:text-sm"
                  >

                    {newGameLoading
                      ? "Yeni oyuncu seçiliyor..."
                      : "⚽ Yeni Oyuncuyla Tekrar Oyna"}

                  </button>

                  <Link
                    href="/"
                    className="rounded-xl border border-white/15 px-5 py-3 text-xs font-black transition hover:bg-white/5 sm:px-6 sm:text-sm"
                  >
                    Ana Sayfa
                  </Link>

                </div>

              </div>
            )}

          </div>

        </section>

      </div>

    </main>
  );
}

/* =========================================================
   COMPACT STAT
========================================================= */

function CompactStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?:
    | "default"
    | "success"
    | "warning"
    | "danger";
}) {
  const toneClasses =
    tone ===
    "success"
      ? "border-green-500/20 bg-green-500/[0.06] text-green-300"
      : tone ===
          "warning"
        ? "border-yellow-400/20 bg-yellow-400/[0.06] text-yellow-300"
        : tone ===
            "danger"
          ? "border-red-500/20 bg-red-500/[0.06] text-red-300"
          : "border-white/10 bg-black/10 text-white";

  return (
    <div
      className={`rounded-xl border px-2 py-2.5 text-center ${toneClasses}`}
    >

      <p className="text-[8px] font-black uppercase tracking-[0.12em] opacity-60">
        {label}
      </p>

      <p className="mt-1 text-sm font-black">
        {value}
      </p>

    </div>
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
  progress?: string;
  wide?: boolean;
  children: ReactNode;
};

function QuizCard({
  title,
  icon,
  solved,
  solvedValue,
  progress,
  wide = false,
  children,
}: QuizCardProps) {
  return (
    <div
      className={`rounded-2xl border p-3 transition sm:p-4 ${
        solved
          ? "border-green-400/40 bg-green-500/10"
          : "border-yellow-400/20 bg-yellow-400/5"
      } ${
        wide
          ? "sm:col-span-2"
          : ""
      }`}
    >

      <div className="mb-2.5 flex items-center justify-between gap-3 sm:mb-3">

        <div className="flex min-w-0 items-center gap-2">

          <span className="shrink-0 text-lg sm:text-xl">
            {icon}
          </span>

          <p
            className={`truncate text-xs font-black uppercase tracking-wide sm:text-sm ${
              solved
                ? "text-green-300"
                : "text-yellow-200"
            }`}
          >
            {title}
          </p>

        </div>

        <div className="flex shrink-0 items-center gap-2">

          {progress && (
            <span className="text-[9px] font-black text-slate-500 sm:text-xs">
              {progress}
            </span>
          )}

          {solved && (
            <span className="rounded-full bg-green-500 px-2 py-1 text-[9px] font-black text-[#07111f] sm:text-xs">
              ✓
            </span>
          )}

        </div>

      </div>

      {solved &&
      solvedValue ? (
        <div className="rounded-xl border border-green-400/30 bg-green-500/20 px-3 py-3 text-center text-sm font-black text-green-100 sm:px-4 sm:py-4 sm:text-base">
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
      className="shrink-0 rounded-xl bg-yellow-400 px-3 py-3 text-xs font-black text-[#111827] transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:text-sm"
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
    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-[45dvh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0c1929] shadow-2xl shadow-black/60">

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