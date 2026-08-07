"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const DEFAULT_MAX_ATTEMPTS = 5;

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "DELETE"],
];

type LetterStatus = "correct" | "present" | "absent" | "empty";
type GameStatus = "playing" | "won" | "lost";

type EvaluatedLetter = {
  letter: string;
  status: Exclude<LetterStatus, "empty">;
};

type EvaluatedGuess = {
  guess: string;
  evaluation: EvaluatedLetter[];
};

type DailyGame = {
  dateKey: string;
  letterCount: number;
  maxAttempts: number;
};

type SavedGame = {
  dateKey: string;
  letterCount: number;
  maxAttempts: number;
  evaluatedGuesses: EvaluatedGuess[];
  currentGuess: string;
  gameStatus: GameStatus;
  message: string;
  resultSaved: boolean;
  resultSaveMessage: string;
};

type TodayResponse = {
  ok?: boolean;
  error?: string;
  dateKey?: string;
  letterCount?: number;
  maxAttempts?: number;
};

type GuessResponse = {
  ok?: boolean;
  error?: string;
  guess?: string;
  evaluation?: EvaluatedLetter[];
  won?: boolean;
};

type SaveResultResponse = {
  ok?: boolean;
  error?: string;
  won?: boolean;
  score?: number;
  attemptCount?: number;
  alreadyRecorded?: boolean;
  currentStreak?: number | null;
  bestStreak?: number | null;
};

function getStorageKey(dateKey: string) {
  return `footbattle-wordle-${dateKey}`;
}

function calculateScore(attemptCount: number, won: boolean) {
  if (!won) {
    return 0;
  }

  const scoreTable = [250, 200, 150, 100, 50];

  return scoreTable[attemptCount - 1] ?? 0;
}

function getTileClasses(status: LetterStatus) {
  if (status === "correct") {
    return "border-green-400 bg-green-500 text-[#07111f]";
  }

  if (status === "present") {
    return "border-amber-400 bg-amber-400 text-[#07111f]";
  }

  if (status === "absent") {
    return "border-slate-600 bg-slate-700 text-white";
  }

  return "border-white/15 bg-[#0c1929] text-white";
}

function getKeyboardClasses(status?: LetterStatus) {
  if (status === "correct") {
    return "border-green-400 bg-green-500 text-[#07111f]";
  }

  if (status === "present") {
    return "border-amber-400 bg-amber-400 text-[#07111f]";
  }

  if (status === "absent") {
    return "border-slate-700 bg-slate-800 text-slate-500";
  }

  return "border-white/10 bg-white/10 text-white hover:bg-white/20";
}

function getShareSymbol(status: LetterStatus) {
  if (status === "correct") {
    return "🟩";
  }

  if (status === "present") {
    return "🟨";
  }

  return "⬛";
}

function normalizeKeyboardLetter(value: string) {
  return value
    .toLocaleUpperCase("tr-TR")
    .replace(/İ/g, "I")
    .replace(/Ç/g, "C")
    .replace(/Ğ/g, "G")
    .replace(/Ö/g, "O")
    .replace(/Ş/g, "S")
    .replace(/Ü/g, "U");
}

export default function WordlePage() {
  const [dailyGame, setDailyGame] =
    useState<DailyGame | null>(null);

  const [evaluatedGuesses, setEvaluatedGuesses] = useState<
    EvaluatedGuess[]
  >([]);

  const [currentGuess, setCurrentGuess] = useState("");

  const [message, setMessage] = useState(
    "😏 Footy: İlk tahminini görelim bakalım.",
  );

  const [gameStatus, setGameStatus] =
    useState<GameStatus>("playing");

  const [hydrated, setHydrated] = useState(false);
  const [loadingError, setLoadingError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [shareMessage, setShareMessage] = useState("");
  const [resultSaved, setResultSaved] = useState(false);

  const [resultSaveMessage, setResultSaveMessage] =
    useState("");

  const guesses = useMemo(
    () => evaluatedGuesses.map((item) => item.guess),
    [evaluatedGuesses],
  );

  const score = calculateScore(
    evaluatedGuesses.length,
    gameStatus === "won",
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDailyGame() {
      try {
        setLoadingError("");

        const response = await fetch("/api/wordle/today", {
          method: "GET",
          cache: "no-store",
        });

        const result = (await response.json()) as TodayResponse;

        if (!response.ok || !result.ok) {
          throw new Error(
            result.error ?? "Günün oyunu yüklenemedi.",
          );
        }

        if (
          !result.dateKey ||
          typeof result.letterCount !== "number"
        ) {
          throw new Error(
            "Günün oyunu bilgileri eksik geldi.",
          );
        }

        const game: DailyGame = {
          dateKey: result.dateKey,
          letterCount: result.letterCount,
          maxAttempts:
            result.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
        };

        if (cancelled) {
          return;
        }

        setDailyGame(game);

        const savedValue = localStorage.getItem(
          getStorageKey(game.dateKey),
        );

        if (savedValue) {
          try {
            const savedGame = JSON.parse(
              savedValue,
            ) as SavedGame;

            const storageMatchesGame =
              savedGame.dateKey === game.dateKey &&
              savedGame.letterCount === game.letterCount;

            if (storageMatchesGame) {
              setEvaluatedGuesses(
                savedGame.evaluatedGuesses ?? [],
              );

              setCurrentGuess(
                savedGame.currentGuess ?? "",
              );

              setGameStatus(
                savedGame.gameStatus ?? "playing",
              );

              setMessage(
                savedGame.message ??
                  "😏 Footy: Kaldığın yerden devam et bakalım.",
              );

              setResultSaved(
                savedGame.resultSaved ?? false,
              );

              setResultSaveMessage(
                savedGame.resultSaveMessage ?? "",
              );
            } else {
              localStorage.removeItem(
                getStorageKey(game.dateKey),
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

        console.error("Wordle yükleme hatası:", error);

        setLoadingError(
          error instanceof Error
            ? error.message
            : "Günün oyunu yüklenemedi.",
        );

        setHydrated(true);
      }
    }

    void loadDailyGame();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !dailyGame) {
      return;
    }

    const savedGame: SavedGame = {
      dateKey: dailyGame.dateKey,
      letterCount: dailyGame.letterCount,
      maxAttempts: dailyGame.maxAttempts,
      evaluatedGuesses,
      currentGuess,
      gameStatus,
      message,
      resultSaved,
      resultSaveMessage,
    };

    localStorage.setItem(
      getStorageKey(dailyGame.dateKey),
      JSON.stringify(savedGame),
    );
  }, [
    currentGuess,
    dailyGame,
    evaluatedGuesses,
    gameStatus,
    hydrated,
    message,
    resultSaved,
    resultSaveMessage,
  ]);

  const keyboardStatuses = useMemo(() => {
    const statusMap: Record<string, LetterStatus> = {};

    evaluatedGuesses.forEach((evaluatedGuess) => {
      evaluatedGuess.evaluation.forEach(
        ({ letter, status }) => {
          const oldStatus = statusMap[letter];

          if (status === "correct") {
            statusMap[letter] = "correct";
            return;
          }

          if (
            status === "present" &&
            oldStatus !== "correct"
          ) {
            statusMap[letter] = "present";
            return;
          }

          if (!oldStatus) {
            statusMap[letter] = "absent";
          }
        },
      );
    });

    return statusMap;
  }, [evaluatedGuesses]);

  const saveGameResult = useCallback(
    async (
      completedGuesses: string[],
      status: "won" | "lost",
    ) => {
      if (resultSaved) {
        return;
      }

      try {
        setResultSaveMessage("Sonuç kaydediliyor...");

        const response = await fetch("/api/wordle/result", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            guesses: completedGuesses,
          }),
        });

        const result =
          (await response.json()) as SaveResultResponse;

        if (response.status === 401) {
          setResultSaveMessage(
            "Puanını kaydetmek için giriş yapmalısın.",
          );
          return;
        }

        if (!response.ok || !result.ok) {
          throw new Error(
            result.error ?? "Oyun sonucu kaydedilemedi.",
          );
        }

        setResultSaved(true);

        if (result.alreadyRecorded) {
          setResultSaveMessage(
            "Bugünkü sonucun daha önce kaydedilmiş.",
          );
          return;
        }

        setResultSaveMessage(
          status === "won"
            ? `${result.score ?? 0} puan hesabına eklendi. 🔥`
            : "Oyun sonucun kaydedildi.",
        );
      } catch (error) {
        console.error("Sonuç kaydetme hatası:", error);

        setResultSaveMessage(
          error instanceof Error
            ? error.message
            : "Sonuç kaydedilirken hata oluştu.",
        );
      }
    },
    [resultSaved],
  );

  const submitGuess = useCallback(async () => {
    if (
      !dailyGame ||
      gameStatus !== "playing" ||
      submitting
    ) {
      return;
    }

    if (currentGuess.length !== dailyGame.letterCount) {
      setMessage(
        `😏 Footy: ${dailyGame.letterCount} harf lazım. Saymayı tekrar mı çalışsak?`,
      );
      return;
    }

    try {
      setSubmitting(true);
      setMessage("👀 Footy: Tahminin kontrol ediliyor...");

      const response = await fetch("/api/wordle/guess", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          guess: currentGuess,
        }),
      });

      const result = (await response.json()) as GuessResponse;

      if (
        !response.ok ||
        !result.ok ||
        !result.guess ||
        !Array.isArray(result.evaluation)
      ) {
        throw new Error(
          result.error ?? "Tahmin kontrol edilemedi.",
        );
      }

      const evaluatedGuess: EvaluatedGuess = {
        guess: result.guess,
        evaluation: result.evaluation,
      };

      const nextEvaluatedGuesses = [
        ...evaluatedGuesses,
        evaluatedGuess,
      ];

      const nextGuesses = nextEvaluatedGuesses.map(
        (item) => item.guess,
      );

      setEvaluatedGuesses(nextEvaluatedGuesses);
      setCurrentGuess("");

      if (result.won) {
        setGameStatus("won");

        if (nextEvaluatedGuesses.length === 1) {
          setMessage(
            "🤯 Footy: İlk tahminde mi? Tamam, buna saygı duydum.",
          );
        } else if (nextEvaluatedGuesses.length <= 3) {
          setMessage(
            "😎 Footy: Fena değilsin. Çok da havaya girme.",
          );
        } else {
          setMessage(
            "😏 Footy: Son anda kurtardın. Yine de sayıyorum.",
          );
        }

        void saveGameResult(nextGuesses, "won");
        return;
      }

      if (
        nextEvaluatedGuesses.length >=
        dailyGame.maxAttempts
      ) {
        setGameStatus("lost");

        setMessage(
          "😂 Footy: Bugün olmadı. Kol bozuk deme, yarın yeniden denersin.",
        );

        void saveGameResult(nextGuesses, "lost");
        return;
      }

      const remainingAttempts =
        dailyGame.maxAttempts -
        nextEvaluatedGuesses.length;

      setMessage(
        `👀 Footy: Olmadı. ${remainingAttempts} hakkın kaldı, toparlan.`,
      );
    } catch (error) {
      console.error("Tahmin gönderme hatası:", error);

      setMessage(
        error instanceof Error
          ? `⚠️ Footy: ${error.message}`
          : "⚠️ Footy: Tahmin kontrol edilirken hata oluştu.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    currentGuess,
    dailyGame,
    evaluatedGuesses,
    gameStatus,
    saveGameResult,
    submitting,
  ]);

  const handleKey = useCallback(
    (key: string) => {
      if (
        !dailyGame ||
        gameStatus !== "playing" ||
        submitting
      ) {
        return;
      }

      if (key === "ENTER") {
        void submitGuess();
        return;
      }

      if (
        key === "DELETE" ||
        key === "BACKSPACE"
      ) {
        setCurrentGuess((previous) =>
          previous.slice(0, -1),
        );
        return;
      }

      if (/^[A-Z]$/.test(key)) {
        setCurrentGuess((previous) => {
          if (
            previous.length >= dailyGame.letterCount
          ) {
            return previous;
          }

          return previous + key;
        });
      }
    },
    [
      dailyGame,
      gameStatus,
      submitGuess,
      submitting,
    ],
  );

  useEffect(() => {
    function handlePhysicalKeyboard(
      event: KeyboardEvent,
    ) {
      const key = normalizeKeyboardLetter(event.key);

      if (key === "ENTER") {
        event.preventDefault();
        handleKey("ENTER");
        return;
      }

      if (key === "BACKSPACE") {
        event.preventDefault();
        handleKey("BACKSPACE");
        return;
      }

      if (/^[A-Z]$/.test(key)) {
        handleKey(key);
      }
    }

    window.addEventListener(
      "keydown",
      handlePhysicalKeyboard,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handlePhysicalKeyboard,
      );
    };
  }, [handleKey]);

  async function shareResult() {
    if (!dailyGame || gameStatus === "playing") {
      return;
    }

    const resultRows = evaluatedGuesses
      .map((row) =>
        row.evaluation
          .map(({ status }) =>
            getShareSymbol(status),
          )
          .join(""),
      )
      .join("\n");

    const resultText = [
      "FootBattle Wordle",
      dailyGame.dateKey,
      gameStatus === "won"
        ? `${evaluatedGuesses.length}/${dailyGame.maxAttempts} — ${score} puan`
        : `X/${dailyGame.maxAttempts} — 0 puan`,
      "",
      resultRows,
      "",
      "Futbol bilgini konuşma, göster.",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(resultText);

      setShareMessage(
        "Sonuç panoya kopyalandı! ✅",
      );
    } catch {
      setShareMessage(
        "Sonuç kopyalanamadı. Tarayıcı iznini kontrol et.",
      );
    }

    window.setTimeout(() => {
      setShareMessage("");
    }, 3000);
  }

  function resetGameForTesting() {
    if (!dailyGame) {
      return;
    }

    localStorage.removeItem(
      getStorageKey(dailyGame.dateKey),
    );

    setCurrentGuess("");
    setEvaluatedGuesses([]);
    setGameStatus("playing");

    setMessage(
      "😏 Footy: Test için sıfırladın. Bu kez bahane yok.",
    );

    setShareMessage("");
    setResultSaved(false);
    setResultSaveMessage("");
  }

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07111f] text-white">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-white/10 border-t-green-500" />

          <p className="mt-3 text-sm text-slate-400">
            Günün oyunu hazırlanıyor...
          </p>
        </div>
      </main>
    );
  }

  if (loadingError || !dailyGame) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07111f] px-4 text-white">
        <div className="w-full max-w-sm rounded-[22px] border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-lg font-black">
            Oyun yüklenemedi
          </p>

          <p className="mt-2 text-sm text-red-200">
            {loadingError ||
              "Bugünün oyunu henüz hazırlanmadı."}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-white px-5 py-2.5 text-sm font-black text-[#07111f]"
          >
            Tekrar Dene
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-6">

        {/* ÜST BAR */}

        <header className="grid min-h-[68px] grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-white/10">

          <div className="flex justify-start">
            <Link
              href="/"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:border-green-400/40 hover:text-green-400"
            >
              ← Ana Sayfa
            </Link>
          </div>

          <div className="text-center">
            <p className="text-base font-black">
              FootBattle
            </p>

            <p className="text-[11px] text-slate-500">
              Günün Wordle&apos;ı
            </p>
          </div>

          <div className="flex justify-end">
            <div className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black">
              {evaluatedGuesses.length}/
              {dailyGame.maxAttempts}
            </div>
          </div>

        </header>

        {/* OYUN ALANI */}

        <div className="py-7 sm:py-8">
          <section className="mx-auto w-full max-w-[760px] rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-5 shadow-2xl shadow-black/20 sm:px-6 sm:py-6">

            {/* BAŞLIK */}

            <div className="text-center">
              <span className="inline-block rounded-full border border-green-500/30 bg-green-500/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-green-400">
                {dailyGame.dateKey}
              </span>

              <h1 className="mt-4 text-[30px] font-black leading-tight sm:text-[34px]">
                Futbolcuyu Bul
              </h1>

              <p className="mt-1.5 text-sm text-slate-400">
                Bugünün futbolcu soyadını{" "}
                {dailyGame.maxAttempts} tahminde bul.
              </p>

              <p className="mt-1.5 text-[11px] text-slate-600">
                Soyadı {dailyGame.letterCount} harften oluşuyor.
              </p>
            </div>

            {/* WORDLE BOARD */}

            <div className="mt-6 space-y-2">
              {Array.from({
                length: dailyGame.maxAttempts,
              }).map((_, rowIndex) => {
                const submittedGuess =
                  evaluatedGuesses[rowIndex];

                const activeRow =
                  rowIndex === evaluatedGuesses.length &&
                  gameStatus === "playing";

                return (
                  <div
                    key={rowIndex}
                    className="flex justify-center gap-1.5"
                  >
                    {Array.from({
                      length: dailyGame.letterCount,
                    }).map((_, letterIndex) => {
                      const evaluatedLetter =
                        submittedGuess?.evaluation[
                          letterIndex
                        ];

                      const activeLetter = activeRow
                        ? currentGuess[letterIndex] ?? ""
                        : "";

                      const displayedLetter =
                        evaluatedLetter?.letter ??
                        activeLetter;

                      const status: LetterStatus =
                        evaluatedLetter?.status ?? "empty";

                      return (
                        <div
                          key={letterIndex}
                          className={`flex h-[50px] w-[44px] items-center justify-center rounded-[10px] border text-lg font-black transition-all duration-300 sm:h-[52px] sm:w-[46px] sm:text-xl ${getTileClasses(
                            status,
                          )} ${
                            activeLetter
                              ? "scale-[1.04] border-green-400/50"
                              : ""
                          }`}
                        >
                          {displayedLetter}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* FOOTY MESAJ */}

            <div className="mt-5 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-center">
              <p className="text-sm leading-5 text-slate-300">
                {message}
              </p>
            </div>

            {/* KLAVYE */}

            <div className="mt-5 space-y-1.5">
              {KEYBOARD_ROWS.map(
                (row, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="flex justify-center gap-1"
                  >
                    {row.map((key) => {
                      const isSpecialKey =
                        key === "ENTER" ||
                        key === "DELETE";

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleKey(key)}
                          disabled={
                            gameStatus !== "playing" ||
                            submitting
                          }
                          className={`flex h-10 items-center justify-center rounded-lg border text-[11px] font-black transition sm:h-11 sm:text-xs ${
                            isSpecialKey
                              ? "min-w-[56px] px-2 sm:min-w-[70px]"
                              : "w-[30px] sm:w-9"
                          } ${getKeyboardClasses(
                            keyboardStatuses[key],
                          )} disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {key === "DELETE"
                            ? "⌫"
                            : key}
                        </button>
                      );
                    })}
                  </div>
                ),
              )}
            </div>

            {/* OYUN SONU */}

            {gameStatus !== "playing" && (
              <div className="mt-5 rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-center">

                <p className="text-lg font-black">
                  {gameStatus === "won"
                    ? "Tebrikler! 🎉"
                    : "Bugün olmadı 😏"}
                </p>

                <p className="mt-1.5 text-sm text-slate-400">
                  {gameStatus === "won"
                    ? `${evaluatedGuesses.length} tahminde bildin.`
                    : "Yarın yeni oyuncuyla tekrar dene."}
                </p>

                <p className="mt-2 text-2xl font-black text-green-400">
                  {score} puan
                </p>

                {resultSaveMessage && (
                  <p
                    className={`mt-2 text-sm font-semibold ${
                      resultSaveMessage.includes(
                        "hata",
                      ) ||
                      resultSaveMessage.includes(
                        "giriş",
                      )
                        ? "text-amber-300"
                        : "text-green-400"
                    }`}
                  >
                    {resultSaveMessage}
                  </p>
                )}

                <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">

                  <button
                    type="button"
                    onClick={shareResult}
                    className="rounded-xl bg-green-500 px-5 py-2.5 text-sm font-black text-[#07111f] transition hover:bg-green-400"
                  >
                    Sonucu Paylaş
                  </button>

                  <Link
                    href="/"
                    className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold transition hover:border-white/30 hover:bg-white/5"
                  >
                    Ana Sayfaya Dön
                  </Link>

                </div>

                {shareMessage && (
                  <p className="mt-3 text-sm font-semibold text-green-400">
                    {shareMessage}
                  </p>
                )}

              </div>
            )}

            {/* RENK AÇIKLAMALARI */}

            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px]">

              <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-2 py-2.5">
                <div className="mx-auto mb-1.5 h-3.5 w-3.5 rounded bg-green-500" />
                <p className="text-slate-400">
                  Doğru yer
                </p>
              </div>

              <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-2 py-2.5">
                <div className="mx-auto mb-1.5 h-3.5 w-3.5 rounded bg-amber-400" />
                <p className="text-slate-400">
                  Yanlış yer
                </p>
              </div>

              <div className="rounded-xl border border-slate-600/30 bg-slate-700/20 px-2 py-2.5">
                <div className="mx-auto mb-1.5 h-3.5 w-3.5 rounded bg-slate-700" />
                <p className="text-slate-400">
                  Yok
                </p>
              </div>

            </div>

            {/* TEST RESET */}

            <button
              type="button"
              onClick={resetGameForTesting}
              className="mx-auto mt-4 block rounded-lg border border-red-400/20 px-3 py-1.5 text-[11px] font-semibold text-red-300 transition hover:bg-red-500/10"
            >
              Test için bugünkü oyunu sıfırla
            </button>

          </section>
        </div>

      </div>
    </main>
  );
}