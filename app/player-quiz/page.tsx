"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const DEFAULT_MAX_LIVES = 5;
const DEFAULT_GUESS_TIME_SECONDS = 20;
const DEFAULT_MINIMUM_SEARCH_LENGTH = 3;
const COMPLETION_SCORE = 500;

type GameStatus = "playing" | "won" | "lost";

type FieldType =
  | "birthYear"
  | "nationality"
  | "trophy"
  | "club";

type PublicPlayer = {
  id: number;
  fullName: string;
  imageUrl: string | null;
};

type BoardConfig = {
  birthYearSlots: number;
  nationalitySlots: number;
  trophySlots: number;
  clubSlots: number;
  totalSlots: number;
};

type DailyGame = {
  dateKey: string;
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
  dateKey?: string;
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
  matchedId?: number | null;
  matchedClub?: SolvedClub | null;
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

type TrophySearchResponse = {
  ok?: boolean;
  error?: string;
  trophies?: string[];
};

type ResultResponse = {
  ok?: boolean;
  error?: string;
  won?: boolean;
  score?: number;
  alreadyRecorded?: boolean;
  currentStreak?: number | null;
  bestStreak?: number | null;
};

type SavedGame = {
  dateKey: string;
  lives: number;
  timeLeft: number;
  gameStatus: GameStatus;
  message: string;
  attemptCount: number;

  solvedBirthYear: boolean;
  solvedBirthYearValue: string;

  solvedNationality: boolean;
  solvedNationalityValue: string;

  solvedTrophy: boolean;
  solvedTrophyValue: string;

  solvedClubs: SolvedClub[];

  resultSaved: boolean;
  resultSaveMessage: string;
};

type ResultSnapshot = {
  birthYear: string;
  nationality: string;
  trophy: string;
  solvedClubs: SolvedClub[];
  attemptCount: number;
};

function getStorageKey(dateKey: string) {
  return `footbattle-player-quiz-${dateKey}`;
}

export default function PlayerQuizPage() {
  const [dailyGame, setDailyGame] =
    useState<DailyGame | null>(null);

  const [loadingGame, setLoadingGame] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const [lives, setLives] = useState(DEFAULT_MAX_LIVES);

  const [timeLeft, setTimeLeft] = useState(
    DEFAULT_GUESS_TIME_SECONDS,
  );

  const [gameStatus, setGameStatus] =
    useState<GameStatus>("playing");

  const [message, setMessage] = useState(
    "😏 Footy: İstediğin kutudan başlayabilirsin.",
  );

  const [attemptCount, setAttemptCount] = useState(0);

  const [submittingField, setSubmittingField] =
    useState<FieldType | null>(null);

  const [resultSaved, setResultSaved] = useState(false);

  const [resultSaving, setResultSaving] = useState(false);

  const [resultSaveMessage, setResultSaveMessage] =
    useState("");

  /*
   * Doğum yılı
   */
  const [birthYearInput, setBirthYearInput] = useState("");

  const [solvedBirthYear, setSolvedBirthYear] =
    useState(false);

  const [
    solvedBirthYearValue,
    setSolvedBirthYearValue,
  ] = useState("");

  /*
   * Milliyet
   */
  const [nationalityInput, setNationalityInput] =
    useState("");

  const [solvedNationality, setSolvedNationality] =
    useState(false);

  const [
    solvedNationalityValue,
    setSolvedNationalityValue,
  ] = useState("");

  const [countrySelected, setCountrySelected] =
    useState(false);

  const [countryResults, setCountryResults] = useState<
    string[]
  >([]);

  const [
    countrySearchLoading,
    setCountrySearchLoading,
  ] = useState(false);

  const [countrySearchError, setCountrySearchError] =
    useState("");

  /*
   * Kupa
   */
  const [trophyInput, setTrophyInput] = useState("");

  const [solvedTrophy, setSolvedTrophy] =
    useState(false);

  const [solvedTrophyValue, setSolvedTrophyValue] =
    useState("");

  const [trophySelected, setTrophySelected] =
    useState(false);

  const [trophyResults, setTrophyResults] = useState<
    string[]
  >([]);

  const [
    trophySearchLoading,
    setTrophySearchLoading,
  ] = useState(false);

  const [trophySearchError, setTrophySearchError] =
    useState("");

  /*
   * Kulüpler
   */
  const [clubInput, setClubInput] = useState("");

  const [clubSelected, setClubSelected] = useState(false);

  const [clubResults, setClubResults] = useState<string[]>(
    [],
  );

  const [clubSearchLoading, setClubSearchLoading] =
    useState(false);

  const [clubSearchError, setClubSearchError] =
    useState("");

  const [solvedClubs, setSolvedClubs] = useState<
    SolvedClub[]
  >([]);

  const maxLives =
    dailyGame?.maxLives ?? DEFAULT_MAX_LIVES;

  const guessTimeSeconds =
    dailyGame?.guessTimeSeconds ??
    DEFAULT_GUESS_TIME_SECONDS;

  const minimumSearchLength =
    dailyGame?.minimumSearchLength ??
    DEFAULT_MINIMUM_SEARCH_LENGTH;

  const clubSlotCount = dailyGame?.board.clubSlots ?? 0;

  const totalSlotCount = dailyGame?.board.totalSlots ?? 0;

  const completedCount = useMemo(() => {
    return (
      (solvedBirthYear ? 1 : 0) +
      (solvedNationality ? 1 : 0) +
      (solvedTrophy ? 1 : 0) +
      solvedClubs.length
    );
  }, [
    solvedBirthYear,
    solvedClubs.length,
    solvedNationality,
    solvedTrophy,
  ]);

  const progressPercentage =
    totalSlotCount > 0
      ? (completedCount / totalSlotCount) * 100
      : 0;

  /*
   * Günün oyununu yükle.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadDailyGame() {
      try {
        setLoadingGame(true);
        setLoadingError("");

        const response = await fetch(
          "/api/player-quiz/today",
          {
            cache: "no-store",
          },
        );

        const result =
          (await response.json()) as TodayResponse;

        if (!response.ok || !result.ok) {
          throw new Error(
            result.error ??
              "Günün Player Quiz oyunu yüklenemedi.",
          );
        }

        if (
          !result.dateKey ||
          !result.player ||
          !result.board
        ) {
          throw new Error(
            "Günün oyun bilgileri eksik geldi.",
          );
        }

        const game: DailyGame = {
          dateKey: result.dateKey,
          player: result.player,
          maxLives:
            result.maxLives ?? DEFAULT_MAX_LIVES,
          guessTimeSeconds:
            result.guessTimeSeconds ??
            DEFAULT_GUESS_TIME_SECONDS,
          minimumSearchLength:
            result.minimumSearchLength ??
            DEFAULT_MINIMUM_SEARCH_LENGTH,
          board: result.board,
        };

        if (cancelled) {
          return;
        }

        setDailyGame(game);
        setLives(game.maxLives);
        setTimeLeft(game.guessTimeSeconds);

        const savedValue = localStorage.getItem(
          getStorageKey(game.dateKey),
        );

        if (savedValue) {
          try {
            const savedGame = JSON.parse(
              savedValue,
            ) as SavedGame;

            if (savedGame.dateKey === game.dateKey) {
              setLives(
                typeof savedGame.lives === "number"
                  ? savedGame.lives
                  : game.maxLives,
              );

              setTimeLeft(
                typeof savedGame.timeLeft === "number"
                  ? savedGame.timeLeft
                  : game.guessTimeSeconds,
              );

              setGameStatus(
                savedGame.gameStatus ?? "playing",
              );

              setMessage(
                savedGame.message ??
                  "😏 Footy: Kaldığın yerden devam et.",
              );

              setAttemptCount(
                savedGame.attemptCount ?? 0,
              );

              setSolvedBirthYear(
                savedGame.solvedBirthYear ?? false,
              );

              setSolvedBirthYearValue(
                savedGame.solvedBirthYearValue ?? "",
              );

              setSolvedNationality(
                savedGame.solvedNationality ?? false,
              );

              setSolvedNationalityValue(
                savedGame.solvedNationalityValue ?? "",
              );

              setSolvedTrophy(
                savedGame.solvedTrophy ?? false,
              );

              setSolvedTrophyValue(
                savedGame.solvedTrophyValue ?? "",
              );

              setSolvedClubs(savedGame.solvedClubs ?? []);

              setResultSaved(
                savedGame.resultSaved ?? false,
              );

              setResultSaveMessage(
                savedGame.resultSaveMessage ?? "",
              );
            }
          } catch {
            localStorage.removeItem(
              getStorageKey(game.dateKey),
            );
          }
        }

        setHydrated(true);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "Player Quiz yükleme hatası:",
          error,
        );

        setLoadingError(
          error instanceof Error
            ? error.message
            : "Günün oyunu yüklenemedi.",
        );
      } finally {
        if (!cancelled) {
          setLoadingGame(false);
        }
      }
    }

    void loadDailyGame();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Oyun ilerlemesini tarayıcıda sakla.
   */
  useEffect(() => {
    if (!dailyGame || !hydrated) {
      return;
    }

    const savedGame: SavedGame = {
      dateKey: dailyGame.dateKey,
      lives,
      timeLeft,
      gameStatus,
      message,
      attemptCount,
      solvedBirthYear,
      solvedBirthYearValue,
      solvedNationality,
      solvedNationalityValue,
      solvedTrophy,
      solvedTrophyValue,
      solvedClubs,
      resultSaved,
      resultSaveMessage,
    };

    localStorage.setItem(
      getStorageKey(dailyGame.dateKey),
      JSON.stringify(savedGame),
    );
  }, [
    attemptCount,
    dailyGame,
    gameStatus,
    hydrated,
    lives,
    message,
    resultSaved,
    resultSaveMessage,
    solvedBirthYear,
    solvedBirthYearValue,
    solvedClubs,
    solvedNationality,
    solvedNationalityValue,
    solvedTrophy,
    solvedTrophyValue,
    timeLeft,
  ]);

  /*
   * Milliyet autocomplete
   */
  useEffect(() => {
    const query = nationalityInput.trim();

    if (
      query.length < minimumSearchLength ||
      countrySelected ||
      solvedNationality ||
      gameStatus !== "playing"
    ) {
      setCountryResults([]);
      setCountrySearchLoading(false);
      setCountrySearchError("");
      return;
    }

    const abortController = new AbortController();

    const timer = window.setTimeout(async () => {
      try {
        setCountrySearchLoading(true);
        setCountrySearchError("");

        const response = await fetch(
          `/api/player-quiz/search-country?q=${encodeURIComponent(
            query,
          )}`,
          {
            cache: "no-store",
            signal: abortController.signal,
          },
        );

        const result =
          (await response.json()) as CountrySearchResponse;

        if (!response.ok || !result.ok) {
          throw new Error(
            result.error ?? "Milliyetler aranamadı.",
          );
        }

        setCountryResults(result.countries ?? []);
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error("Milliyet arama hatası:", error);

        setCountryResults([]);

        setCountrySearchError(
          error instanceof Error
            ? error.message
            : "Milliyetler aranamadı.",
        );
      } finally {
        setCountrySearchLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      abortController.abort();
    };
  }, [
    countrySelected,
    gameStatus,
    minimumSearchLength,
    nationalityInput,
    solvedNationality,
  ]);

  /*
   * Kupa autocomplete
   */
  useEffect(() => {
    const query = trophyInput.trim();

    if (
      query.length < minimumSearchLength ||
      trophySelected ||
      solvedTrophy ||
      gameStatus !== "playing"
    ) {
      setTrophyResults([]);
      setTrophySearchLoading(false);
      setTrophySearchError("");
      return;
    }

    const abortController = new AbortController();

    const timer = window.setTimeout(async () => {
      try {
        setTrophySearchLoading(true);
        setTrophySearchError("");

        const response = await fetch(
          `/api/player-quiz/search-trophy?q=${encodeURIComponent(
            query,
          )}`,
          {
            cache: "no-store",
            signal: abortController.signal,
          },
        );

        const result =
          (await response.json()) as TrophySearchResponse;

        if (!response.ok || !result.ok) {
          throw new Error(
            result.error ?? "Kupalar aranamadı.",
          );
        }

        setTrophyResults(result.trophies ?? []);
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error("Kupa arama hatası:", error);

        setTrophyResults([]);

        setTrophySearchError(
          error instanceof Error
            ? error.message
            : "Kupalar aranamadı.",
        );
      } finally {
        setTrophySearchLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      abortController.abort();
    };
  }, [
    gameStatus,
    minimumSearchLength,
    solvedTrophy,
    trophyInput,
    trophySelected,
  ]);

  /*
   * Kulüp autocomplete
   */
  useEffect(() => {
    const query = clubInput.trim();

    if (
      query.length < minimumSearchLength ||
      clubSelected ||
      solvedClubs.length >= clubSlotCount ||
      gameStatus !== "playing"
    ) {
      setClubResults([]);
      setClubSearchLoading(false);
      setClubSearchError("");
      return;
    }

    const abortController = new AbortController();

    const timer = window.setTimeout(async () => {
      try {
        setClubSearchLoading(true);
        setClubSearchError("");

        const response = await fetch(
          `/api/player-quiz/search-club?q=${encodeURIComponent(
            query,
          )}`,
          {
            cache: "no-store",
            signal: abortController.signal,
          },
        );

        const result =
          (await response.json()) as ClubSearchResponse;

        if (!response.ok || !result.ok) {
          throw new Error(
            result.error ?? "Kulüpler aranamadı.",
          );
        }

        setClubResults(result.clubs ?? []);
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error("Kulüp arama hatası:", error);

        setClubResults([]);

        setClubSearchError(
          error instanceof Error
            ? error.message
            : "Kulüpler aranamadı.",
        );
      } finally {
        setClubSearchLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
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

  /*
   * Oyun sonucunu ortak kayıt sistemine gönder.
   */
  const saveGameResult = useCallback(
    async (
      finishReason: "won" | "lost",
      snapshot: ResultSnapshot,
    ) => {
      if (resultSaved || resultSaving) {
        return;
      }

      try {
        setResultSaving(true);
        setResultSaveMessage("Sonuç kaydediliyor...");

        const response = await fetch(
          "/api/player-quiz/result",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              finishReason,
              birthYear: snapshot.birthYear,
              nationality: snapshot.nationality,
              trophy: snapshot.trophy,
              solvedClubIds: snapshot.solvedClubs.map(
                (club) => club.id,
              ),
              attemptCount: snapshot.attemptCount,
            }),
          },
        );

        const result =
          (await response.json()) as ResultResponse;

        if (response.status === 401) {
          setResultSaveMessage(
            "Puanını kaydetmek için giriş yapmalısın.",
          );
          return;
        }

        if (!response.ok || !result.ok) {
          throw new Error(
            result.error ??
              "Player Quiz sonucu kaydedilemedi.",
          );
        }

        setResultSaved(true);

        if (result.alreadyRecorded) {
          setResultSaveMessage(
            "Bugünkü Player Quiz sonucun daha önce kaydedilmiş.",
          );
          return;
        }

        if (result.won) {
          setResultSaveMessage(
            `${result.score ?? COMPLETION_SCORE} puan hesabına eklendi. 🔥 Player Quiz serisi: ${
              result.currentStreak ?? 1
            }`,
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
        setResultSaving(false);
      }
    },
    [resultSaved, resultSaving],
  );

  /*
   * Bir can azalt.
   */
  const loseLife = useCallback(
    (
      reason: "wrong" | "timeout",
      nextAttemptCount: number,
    ) => {
      setLives((currentLives) => {
        const nextLives = Math.max(currentLives - 1, 0);

        if (nextLives === 0) {
          setGameStatus("lost");

          setMessage(
            reason === "timeout"
              ? "⌛ Footy: Süre ve canlar bitti. Bugünlük bu kadar."
              : "😂 Footy: Son can da gitti. Bugün olmadı.",
          );

          void saveGameResult("lost", {
            birthYear: solvedBirthYearValue,
            nationality: solvedNationalityValue,
            trophy: solvedTrophyValue,
            solvedClubs,
            attemptCount: nextAttemptCount,
          });
        } else {
          setMessage(
            reason === "timeout"
              ? `⌛ Footy: Süre doldu. ${nextLives} canın kaldı.`
              : `❌ Footy: Yanlış cevap. ${nextLives} canın kaldı.`,
          );
        }

        return nextLives;
      });

      setTimeLeft(guessTimeSeconds);
    },
    [
      guessTimeSeconds,
      saveGameResult,
      solvedBirthYearValue,
      solvedClubs,
      solvedNationalityValue,
      solvedTrophyValue,
    ],
  );

  /*
   * Sayaç
   */
  useEffect(() => {
    if (
      !dailyGame ||
      !hydrated ||
      gameStatus !== "playing" ||
      submittingField !== null ||
      resultSaving
    ) {
      return;
    }

    if (timeLeft <= 0) {
      const nextAttemptCount = attemptCount + 1;

      setAttemptCount(nextAttemptCount);

      loseLife("timeout", nextAttemptCount);
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((current) => current - 1);
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    attemptCount,
    dailyGame,
    gameStatus,
    hydrated,
    loseLife,
    resultSaving,
    submittingField,
    timeLeft,
  ]);

  function finishGameIfCompleted(
    nextCompletedCount: number,
    snapshot: ResultSnapshot,
  ) {
    if (
      totalSlotCount > 0 &&
      nextCompletedCount >= totalSlotCount
    ) {
      setGameStatus("won");
      setTimeLeft(0);

      setMessage(
        `🎉 Footy: ${dailyGame?.player.fullName} kariyerini tamamen doldurdun!`,
      );

      void saveGameResult("won", snapshot);

      return true;
    }

    return false;
  }

  async function submitField(field: FieldType) {
    if (
      !dailyGame ||
      gameStatus !== "playing" ||
      submittingField !== null ||
      resultSaving
    ) {
      return;
    }

    let value: string | number = "";

    if (field === "birthYear") {
      value = birthYearInput.trim();

      if (!value) {
        setMessage(
          "😏 Footy: Önce bir doğum yılı yaz.",
        );
        return;
      }
    }

    if (field === "nationality") {
      value = nationalityInput.trim();

      if (!value || !countrySelected) {
        setMessage(
          "😏 Footy: Uyruğu arama listesinden seç.",
        );
        return;
      }
    }

    if (field === "trophy") {
      value = trophyInput.trim();

      if (!value || !trophySelected) {
        setMessage(
          "😏 Footy: Kupayı arama listesinden seç.",
        );
        return;
      }
    }

    if (field === "club") {
      value = clubInput.trim();

      if (!value || !clubSelected) {
        setMessage(
          "😏 Footy: Kulübü arama listesinden seç.",
        );
        return;
      }
    }

    try {
      setSubmittingField(field);

      setMessage(
        "👀 Footy: Cevabın kontrol ediliyor...",
      );

      const response = await fetch(
        "/api/player-quiz/guess",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            field,
            value,
            solvedClubIds: solvedClubs.map(
              (club) => club.id,
            ),
          }),
        },
      );

      const result =
        (await response.json()) as GuessResponse;

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error ?? "Cevap kontrol edilemedi.",
        );
      }

      const nextAttemptCount = attemptCount + 1;

      setAttemptCount(nextAttemptCount);

      /*
       * Aynı kulüp yeniden seçildiyse can düşürme.
       */
      if (field === "club" && result.duplicate) {
        setClubInput("");
        setClubSelected(false);

        setMessage(
          "😏 Footy: Bu kulübü zaten buldun. Başka bir kulüp dene.",
        );

        setTimeLeft(guessTimeSeconds);
        return;
      }

      if (!result.correct) {
        if (field === "birthYear") {
          setBirthYearInput("");
        }

        if (field === "nationality") {
          setNationalityInput("");
          setCountrySelected(false);
        }

        if (field === "trophy") {
          setTrophyInput("");
          setTrophySelected(false);
        }

        if (field === "club") {
          setClubInput("");
          setClubSelected(false);
        }

        loseLife("wrong", nextAttemptCount);
        return;
      }

      if (field === "birthYear") {
        const nextBirthYearValue = String(value);

        setSolvedBirthYear(true);
        setSolvedBirthYearValue(nextBirthYearValue);
        setBirthYearInput("");

        const nextCompletedCount = completedCount + 1;

        const finished = finishGameIfCompleted(
          nextCompletedCount,
          {
            birthYear: nextBirthYearValue,
            nationality: solvedNationalityValue,
            trophy: solvedTrophyValue,
            solvedClubs,
            attemptCount: nextAttemptCount,
          },
        );

        if (!finished) {
          setMessage("✅ Footy: Doğum yılı doğru!");
          setTimeLeft(guessTimeSeconds);
        }

        return;
      }

      if (field === "nationality") {
        const nextNationalityValue = String(value);

        setSolvedNationality(true);

        setSolvedNationalityValue(
          nextNationalityValue,
        );

        setNationalityInput("");
        setCountrySelected(false);

        const nextCompletedCount = completedCount + 1;

        const finished = finishGameIfCompleted(
          nextCompletedCount,
          {
            birthYear: solvedBirthYearValue,
            nationality: nextNationalityValue,
            trophy: solvedTrophyValue,
            solvedClubs,
            attemptCount: nextAttemptCount,
          },
        );

        if (!finished) {
          setMessage("✅ Footy: Uyruk doğru!");
          setTimeLeft(guessTimeSeconds);
        }

        return;
      }

      if (field === "trophy") {
        const nextTrophyValue = String(value);

        setSolvedTrophy(true);
        setSolvedTrophyValue(nextTrophyValue);
        setTrophyInput("");
        setTrophySelected(false);

        const nextCompletedCount = completedCount + 1;

        const finished = finishGameIfCompleted(
          nextCompletedCount,
          {
            birthYear: solvedBirthYearValue,
            nationality: solvedNationalityValue,
            trophy: nextTrophyValue,
            solvedClubs,
            attemptCount: nextAttemptCount,
          },
        );

        if (!finished) {
          setMessage("🏆 Footy: Kupa doğru!");
          setTimeLeft(guessTimeSeconds);
        }

        return;
      }

      if (field === "club" && result.matchedClub) {
        const nextSolvedClubs = [
          ...solvedClubs,
          result.matchedClub,
        ].sort(
          (firstClub, secondClub) =>
            firstClub.careerOrder -
            secondClub.careerOrder,
        );

        setSolvedClubs(nextSolvedClubs);
        setClubInput("");
        setClubSelected(false);

        const nextCompletedCount = completedCount + 1;

        const finished = finishGameIfCompleted(
          nextCompletedCount,
          {
            birthYear: solvedBirthYearValue,
            nationality: solvedNationalityValue,
            trophy: solvedTrophyValue,
            solvedClubs: nextSolvedClubs,
            attemptCount: nextAttemptCount,
          },
        );

        if (!finished) {
          setMessage(
            `✅ Footy: ${result.matchedClub.name} doğru kulüplerden biri!`,
          );

          setTimeLeft(guessTimeSeconds);
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
      setSubmittingField(null);
    }
  }

  function selectCountry(country: string) {
    setNationalityInput(country);
    setCountrySelected(true);
    setCountryResults([]);
  }

  function selectTrophy(trophy: string) {
    setTrophyInput(trophy);
    setTrophySelected(true);
    setTrophyResults([]);
  }

  function selectClub(club: string) {
    setClubInput(club);
    setClubSelected(true);
    setClubResults([]);
  }

  function resetGameForTesting() {
    if (!dailyGame) {
      return;
    }

    localStorage.removeItem(
      getStorageKey(dailyGame.dateKey),
    );

    setLives(maxLives);
    setTimeLeft(guessTimeSeconds);
    setGameStatus("playing");
    setAttemptCount(0);
    setSubmittingField(null);

    setResultSaved(false);
    setResultSaving(false);
    setResultSaveMessage("");

    setBirthYearInput("");
    setSolvedBirthYear(false);
    setSolvedBirthYearValue("");

    setNationalityInput("");
    setSolvedNationality(false);
    setSolvedNationalityValue("");
    setCountrySelected(false);
    setCountryResults([]);
    setCountrySearchError("");

    setTrophyInput("");
    setSolvedTrophy(false);
    setSolvedTrophyValue("");
    setTrophySelected(false);
    setTrophyResults([]);
    setTrophySearchError("");

    setClubInput("");
    setClubSelected(false);
    setClubResults([]);
    setClubSearchError("");
    setSolvedClubs([]);

    setMessage(
      "😏 Footy: Oyun sıfırlandı. İstediğin kutudan başla.",
    );
  }

  if (loadingGame) {
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

  if (loadingError || !dailyGame) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07111f] px-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-red-500/10 p-7 text-center">
          <p className="text-xl font-black">
            Oyun yüklenemedi
          </p>

          <p className="mt-3 text-sm text-red-200">
            {loadingError}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-white px-5 py-3 font-black text-[#07111f]"
          >
            Tekrar Dene
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <Link
            href="/"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:border-yellow-400/40 hover:text-yellow-300"
          >
            ← Ana Sayfa
          </Link>

          <div className="text-center">
            <p className="font-black">FootBattle</p>

            <p className="text-xs text-slate-500">
              Player Quiz
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm">
              {"❤️".repeat(lives)}
              {"🖤".repeat(
                Math.max(maxLives - lives, 0),
              )}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {attemptCount} tahmin
            </p>
          </div>
        </header>

        <section className="mt-7 overflow-hidden rounded-3xl border border-yellow-400/20 bg-[#111b2a] shadow-2xl shadow-black/40">
          <div className="border-b border-white/10 bg-yellow-400 px-5 py-4 text-center text-[#111827]">
            <p className="text-xs font-black uppercase tracking-[0.25em]">
              Günün Player Quiz&apos;i
            </p>

            <h1 className="mt-1 text-2xl font-black">
              {dailyGame.player.fullName}
            </h1>
          </div>

          <div className="p-5 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
              <div>
                <div className="rounded-3xl border border-yellow-400/20 bg-yellow-400/5 p-5 text-center">
                  <span className="inline-block rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-xs font-black text-yellow-300">
                    {dailyGame.dateKey}
                  </span>

                  <div className="mx-auto mt-5 flex h-60 w-60 items-end justify-center overflow-hidden rounded-3xl border border-white/10 bg-[#07111f]">
                    {dailyGame.player.imageUrl ? (
                      <img
                        src={dailyGame.player.imageUrl}
                        alt={dailyGame.player.fullName}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="text-6xl">⚽</div>
                    )}
                  </div>

                  <p className="mt-4 text-sm text-slate-400">
                    Bu futbolcunun kariyer bilgilerini
                    doldur.
                  </p>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Süre
                      </p>

                      <p
                        className={`mt-1 text-4xl font-black ${
                          timeLeft <= 5
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
                        {completedCount}/{totalSlotCount}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all duration-500"
                      style={{
                        width: `${progressPercentage}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                  <p className="text-sm leading-6 text-slate-300">
                    {message}
                  </p>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <QuizCard
                    title="Doğum Yılı"
                    icon="🎂"
                    solved={solvedBirthYear}
                    solvedValue={solvedBirthYearValue}
                  >
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1900"
                        max="2100"
                        value={birthYearInput}
                        disabled={
                          solvedBirthYear ||
                          gameStatus !== "playing"
                        }
                        onChange={(event) =>
                          setBirthYearInput(
                            event.target.value,
                          )
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            void submitField("birthYear");
                          }
                        }}
                        placeholder="Örn. 1985"
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 outline-none placeholder:text-slate-600"
                      />

                      <CheckButton
                        loading={
                          submittingField === "birthYear"
                        }
                        disabled={
                          solvedBirthYear ||
                          gameStatus !== "playing"
                        }
                        onClick={() =>
                          void submitField("birthYear")
                        }
                      />
                    </div>
                  </QuizCard>

                  <QuizCard
                    title="Uyruk"
                    icon="🌍"
                    solved={solvedNationality}
                    solvedValue={solvedNationalityValue}
                  >
                    <div className="relative">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={nationalityInput}
                          disabled={
                            solvedNationality ||
                            gameStatus !== "playing"
                          }
                          onChange={(event) => {
                            setNationalityInput(
                              event.target.value,
                            );
                            setCountrySelected(false);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
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
                            gameStatus !== "playing"
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
                        nationalityInput.trim().length >=
                          minimumSearchLength &&
                        gameStatus === "playing" && (
                          <SearchDropdown
                            loading={
                              countrySearchLoading
                            }
                            error={countrySearchError}
                            emptyText="Milliyet bulunamadı."
                            items={countryResults}
                            onSelect={selectCountry}
                          />
                        )}
                    </div>
                  </QuizCard>

                  <QuizCard
                    title="Kazandığı Kupalardan Biri"
                    icon="🏆"
                    solved={solvedTrophy}
                    solvedValue={solvedTrophyValue}
                    wide
                  >
                    <div className="relative">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={trophyInput}
                          disabled={
                            solvedTrophy ||
                            gameStatus !== "playing"
                          }
                          onChange={(event) => {
                            setTrophyInput(
                              event.target.value,
                            );
                            setTrophySelected(false);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              void submitField("trophy");
                            }
                          }}
                          placeholder={`Kupa ara... En az ${minimumSearchLength} harf`}
                          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 outline-none placeholder:text-slate-600"
                        />

                        <CheckButton
                          loading={
                            submittingField === "trophy"
                          }
                          disabled={
                            solvedTrophy ||
                            gameStatus !== "playing"
                          }
                          onClick={() =>
                            void submitField("trophy")
                          }
                        />
                      </div>

                      {!trophySelected &&
                        !solvedTrophy &&
                        trophyInput.trim().length >=
                          minimumSearchLength &&
                        gameStatus === "playing" && (
                          <SearchDropdown
                            loading={
                              trophySearchLoading
                            }
                            error={trophySearchError}
                            emptyText="Kupa bulunamadı."
                            items={trophyResults}
                            onSelect={selectTrophy}
                          />
                        )}
                    </div>
                  </QuizCard>

                  <QuizCard
                    title="Oynadığı Kulüpler"
                    icon="⚽"
                    solved={
                      solvedClubs.length >= clubSlotCount
                    }
                    solvedValue=""
                    wide
                  >
                    <div className="relative">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={clubInput}
                          disabled={
                            solvedClubs.length >=
                              clubSlotCount ||
                            gameStatus !== "playing"
                          }
                          onChange={(event) => {
                            setClubInput(
                              event.target.value,
                            );
                            setClubSelected(false);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              void submitField("club");
                            }
                          }}
                          placeholder={`En az ${minimumSearchLength} harf`}
                          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 outline-none placeholder:text-slate-600"
                        />

                        <CheckButton
                          loading={
                            submittingField === "club"
                          }
                          disabled={
                            solvedClubs.length >=
                              clubSlotCount ||
                            gameStatus !== "playing"
                          }
                          onClick={() =>
                            void submitField("club")
                          }
                        />
                      </div>

                      {!clubSelected &&
                        solvedClubs.length <
                          clubSlotCount &&
                        clubInput.trim().length >=
                          minimumSearchLength &&
                        gameStatus === "playing" && (
                          <SearchDropdown
                            loading={clubSearchLoading}
                            error={clubSearchError}
                            emptyText="Kulüp bulunamadı."
                            items={clubResults}
                            onSelect={selectClub}
                          />
                        )}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {Array.from({
                        length: clubSlotCount,
                      }).map((_, index) => {
                        const club = solvedClubs.find(
                          (solvedClub) =>
                            solvedClub.careerOrder ===
                            index + 1,
                        );

                        return (
                          <div
                            key={index}
                            className={`flex min-h-20 items-center justify-center rounded-xl border px-3 text-center text-sm font-bold ${
                              club
                                ? "border-green-400/40 bg-green-500/20 text-green-200"
                                : "border-white/10 bg-[#07111f] text-2xl text-slate-600"
                            }`}
                          >
                            {club ? club.name : "?"}
                          </div>
                        );
                      })}
                    </div>
                  </QuizCard>
                </div>

                {gameStatus !== "playing" && (
                  <div
                    className={`mt-6 rounded-2xl border p-5 text-center ${
                      gameStatus === "won"
                        ? "border-green-500/30 bg-green-500/10"
                        : "border-red-500/30 bg-red-500/10"
                    }`}
                  >
                    <p className="text-2xl font-black">
                      {gameStatus === "won"
                        ? "Player Quiz tamamlandı! 🎉"
                        : "Canların bitti 😏"}
                    </p>

                    <p className="mt-2 text-sm text-slate-300">
                      {dailyGame.player.fullName}
                    </p>

                    <p
                      className={`mt-4 text-4xl font-black ${
                        gameStatus === "won"
                          ? "text-green-400"
                          : "text-slate-500"
                      }`}
                    >
                      {gameStatus === "won"
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
                  </div>
                )}

                <button
                  type="button"
                  onClick={resetGameForTesting}
                  className="mx-auto mt-5 block rounded-xl border border-red-400/20 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
                >
                  Test için oyunu sıfırla
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

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
      } ${wide ? "sm:col-span-2" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>

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

      {solved && solvedValue ? (
        <div className="rounded-xl border border-green-400/30 bg-green-500/20 px-4 py-4 text-center font-black text-green-100">
          {solvedValue}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

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
      disabled={disabled || loading}
      onClick={onClick}
      className="shrink-0 rounded-xl bg-yellow-400 px-4 py-3 text-sm font-black text-[#111827] transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {loading ? "..." : "Kontrol"}
    </button>
  );
}

type SearchDropdownProps = {
  loading: boolean;
  error: string;
  emptyText: string;
  items: string[];
  onSelect: (item: string) => void;
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
      ) : items.length > 0 ? (
        items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onSelect(item)}
            className="block w-full border-b border-white/5 px-4 py-3 text-left text-sm font-semibold transition last:border-b-0 hover:bg-white/5"
          >
            {item}
          </button>
        ))
      ) : (
        <p className="px-4 py-3 text-sm text-slate-500">
          {emptyText}
        </p>
      )}
    </div>
  );
}