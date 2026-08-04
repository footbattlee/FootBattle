"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const MAX_ATTEMPTS = 5;

const PLAYER_POOL = [
  "RONALDO",
  "MESSI",
  "NEYMAR",
  "HAALAND",
  "MBAPPE",
  "BENZEMA",
  "SALAH",
  "DROGBA",
  "SNEIJDER",
  "MODRIC",
  "INIESTA",
  "PIRLO",
  "RIBERY",
  "ROBBEN",
  "SUAREZ",
  "LEWANDOWSKI",
  "MARADONA",
  "RONALDINHO",
  "BECKHAM",
  "IBRAHIMOVIC",
];

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "DELETE"],
];

type LetterStatus = "correct" | "present" | "absent" | "empty";
type GameStatus = "playing" | "won" | "lost";

type EvaluatedLetter = {
  letter: string;
  status: LetterStatus;
};

type DailyGame = {
  dateKey: string;
  answer: string;
};

type SavedGame = {
  answer: string;
  guesses: string[];
  currentGuess: string;
  gameStatus: GameStatus;
  message: string;
};

function getDailyGame(): DailyGame {
  /*
   * UTC tarihi kullandığımız için bütün kullanıcılar,
   * dünyanın neresinde olursa olsun aynı günlük cevabı görür.
   */
  const now = new Date();
  const dateKey = now.toISOString().slice(0, 10);

  const startingDate = Date.UTC(2026, 7, 4);
  const currentDate = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  const elapsedDays = Math.floor(
    (currentDate - startingDate) / 86_400_000,
  );

  const playerIndex =
    ((elapsedDays % PLAYER_POOL.length) + PLAYER_POOL.length) %
    PLAYER_POOL.length;

  return {
    dateKey,
    answer: PLAYER_POOL[playerIndex],
  };
}

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

function evaluateGuess(
  guess: string,
  answer: string,
): EvaluatedLetter[] {
  const result: EvaluatedLetter[] = guess.split("").map((letter) => ({
    letter,
    status: "absent",
  }));

  const remainingLetters = answer.split("");

  /*
   * Önce doğru harf ve doğru pozisyonlar kontrol edilir.
   * Bu işlem tekrar eden harflerin yanlış değerlendirilmesini önler.
   */
  guess.split("").forEach((letter, index) => {
    if (letter === answer[index]) {
      result[index].status = "correct";
      remainingLetters[index] = "";
    }
  });

  /*
   * Daha sonra doğru harf fakat yanlış pozisyonlar bulunur.
   */
  guess.split("").forEach((letter, index) => {
    if (result[index].status === "correct") {
      return;
    }

    const remainingIndex = remainingLetters.indexOf(letter);

    if (remainingIndex !== -1) {
      result[index].status = "present";
      remainingLetters[remainingIndex] = "";
    }
  });

  return result;
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

export default function WordlePage() {
  const [dailyGame, setDailyGame] = useState<DailyGame | null>(null);
  const [currentGuess, setCurrentGuess] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [message, setMessage] = useState(
    "😏 Footy: İlk tahminini görelim bakalım.",
  );
  const [gameStatus, setGameStatus] =
    useState<GameStatus>("playing");
  const [hydrated, setHydrated] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  const answer = dailyGame?.answer ?? "";

  /*
   * Sayfa ilk açıldığında günün cevabı belirlenir ve daha önce
   * kaydedilmiş bir oyun varsa localStorage içerisinden yüklenir.
   */
  useEffect(() => {
    const game = getDailyGame();
    setDailyGame(game);

    const savedValue = localStorage.getItem(
      getStorageKey(game.dateKey),
    );

    if (savedValue) {
      try {
        const savedGame = JSON.parse(savedValue) as SavedGame;

        if (savedGame.answer === game.answer) {
          setGuesses(savedGame.guesses ?? []);
          setCurrentGuess(savedGame.currentGuess ?? "");
          setGameStatus(savedGame.gameStatus ?? "playing");
          setMessage(
            savedGame.message ??
              "😏 Footy: Kaldığın yerden devam et bakalım.",
          );
        }
      } catch {
        localStorage.removeItem(getStorageKey(game.dateKey));
      }
    }

    setHydrated(true);
  }, []);

  /*
   * Tahmin, mesaj veya oyun durumu değiştiğinde oyun tarayıcıya
   * otomatik olarak kaydedilir.
   */
  useEffect(() => {
    if (!hydrated || !dailyGame) {
      return;
    }

    const savedGame: SavedGame = {
      answer: dailyGame.answer,
      guesses,
      currentGuess,
      gameStatus,
      message,
    };

    localStorage.setItem(
      getStorageKey(dailyGame.dateKey),
      JSON.stringify(savedGame),
    );
  }, [
    currentGuess,
    dailyGame,
    gameStatus,
    guesses,
    hydrated,
    message,
  ]);

  const evaluatedGuesses = useMemo(() => {
    if (!answer) {
      return [];
    }

    return guesses.map((guess) => evaluateGuess(guess, answer));
  }, [answer, guesses]);

  const keyboardStatuses = useMemo(() => {
    const statusMap: Record<string, LetterStatus> = {};

    evaluatedGuesses.flat().forEach(({ letter, status }) => {
      const oldStatus = statusMap[letter];

      if (status === "correct") {
        statusMap[letter] = "correct";
        return;
      }

      if (status === "present" && oldStatus !== "correct") {
        statusMap[letter] = "present";
        return;
      }

      if (!oldStatus) {
        statusMap[letter] = "absent";
      }
    });

    return statusMap;
  }, [evaluatedGuesses]);

  const score = calculateScore(
    guesses.length,
    gameStatus === "won",
  );

  const submitGuess = useCallback(() => {
    if (!dailyGame || gameStatus !== "playing") {
      return;
    }

    if (currentGuess.length !== dailyGame.answer.length) {
      setMessage(
        `😏 Footy: ${dailyGame.answer.length} harf lazım. Saymayı tekrar mı çalışsak?`,
      );
      return;
    }

    const nextGuesses = [...guesses, currentGuess];
    setGuesses(nextGuesses);

    if (currentGuess === dailyGame.answer) {
      setGameStatus("won");

      if (nextGuesses.length === 1) {
        setMessage(
          "🤯 Footy: İlk tahminde mi? Tamam, buna saygı duydum.",
        );
      } else if (nextGuesses.length <= 3) {
        setMessage(
          "😎 Footy: Fena değilsin. Çok da havaya girme.",
        );
      } else {
        setMessage(
          "😏 Footy: Son anda kurtardın. Yine de sayıyorum.",
        );
      }

      setCurrentGuess("");
      return;
    }

    if (nextGuesses.length >= MAX_ATTEMPTS) {
      setGameStatus("lost");
      setMessage(
        `😂 Footy: Cevap ${dailyGame.answer} idi. Kol bozuk deme.`,
      );
      setCurrentGuess("");
      return;
    }

    const remainingAttempts =
      MAX_ATTEMPTS - nextGuesses.length;

    setMessage(
      `👀 Footy: Olmadı. ${remainingAttempts} hakkın kaldı, toparlan.`,
    );

    setCurrentGuess("");
  }, [currentGuess, dailyGame, gameStatus, guesses]);

  const handleKey = useCallback(
    (key: string) => {
      if (!dailyGame || gameStatus !== "playing") {
        return;
      }

      if (key === "ENTER") {
        submitGuess();
        return;
      }

      if (key === "DELETE" || key === "BACKSPACE") {
        setCurrentGuess((previous) => previous.slice(0, -1));
        return;
      }

      if (/^[A-Z]$/.test(key)) {
        setCurrentGuess((previous) => {
          if (previous.length >= dailyGame.answer.length) {
            return previous;
          }

          return previous + key;
        });
      }
    },
    [dailyGame, gameStatus, submitGuess],
  );

  useEffect(() => {
    function handlePhysicalKeyboard(event: KeyboardEvent) {
      const key = event.key.toUpperCase();

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

    window.addEventListener("keydown", handlePhysicalKeyboard);

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
        row.map(({ status }) => getShareSymbol(status)).join(""),
      )
      .join("\n");

    const resultText = [
      `FootBattle Wordle`,
      dailyGame.dateKey,
      gameStatus === "won"
        ? `${guesses.length}/${MAX_ATTEMPTS} — ${score} puan`
        : `X/${MAX_ATTEMPTS} — 0 puan`,
      "",
      resultRows,
      "",
      "Futbol bilgini konuşma, göster.",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(resultText);
      setShareMessage("Sonuç panoya kopyalandı! ✅");
    } catch {
      setShareMessage(
        "Sonuç kopyalanamadı. Tarayıcı iznini kontrol et.",
      );
    }

    window.setTimeout(() => {
      setShareMessage("");
    }, 3000);
  }

  /*
   * Bu buton yalnız geliştirme ve test aşamasında kullanılacak.
   * Canlı sürümden önce kaldıracağız.
   */
  function resetGameForTesting() {
    if (!dailyGame) {
      return;
    }

    localStorage.removeItem(getStorageKey(dailyGame.dateKey));

    setCurrentGuess("");
    setGuesses([]);
    setGameStatus("playing");
    setMessage(
      "😏 Footy: Test için sıfırladın. Bu kez bahane yok.",
    );
    setShareMessage("");
  }

  if (!dailyGame || !hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07111f] text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-green-500" />
          <p className="mt-4 text-sm text-slate-400">
            Günün oyunu hazırlanıyor...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <Link
            href="/"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:border-green-400/40 hover:text-green-400"
          >
            ← Ana Sayfa
          </Link>

          <div className="text-center">
            <p className="font-black">FootBattle</p>
            <p className="text-xs text-slate-500">
              Günün Wordle&apos;ı
            </p>
          </div>

          <div className="rounded-xl border border-white/10 px-4 py-2 text-sm">
            {guesses.length}/{MAX_ATTEMPTS}
          </div>
        </header>

        <section className="mt-7 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/30 sm:p-7">
          <div className="text-center">
            <span className="inline-block rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-green-400">
              {dailyGame.dateKey}
            </span>

            <h1 className="mt-5 text-3xl font-black sm:text-4xl">
              Futbolcuyu Bul
            </h1>

            <p className="mt-2 text-sm text-slate-400 sm:text-base">
              Bugünün futbolcu soyadını 5 tahminde bul.
            </p>

            <p className="mt-2 text-xs text-slate-600">
              Soyadı {answer.length} harften oluşuyor.
            </p>
          </div>

          <div className="mt-8 space-y-2.5">
            {Array.from({ length: MAX_ATTEMPTS }).map(
              (_, rowIndex) => {
                const submittedGuess =
                  evaluatedGuesses[rowIndex];

                const activeRow =
                  rowIndex === guesses.length &&
                  gameStatus === "playing";

                return (
                  <div
                    key={rowIndex}
                    className="flex justify-center gap-1.5 sm:gap-2"
                  >
                    {Array.from({ length: answer.length }).map(
                      (_, letterIndex) => {
                        const evaluatedLetter =
                          submittedGuess?.[letterIndex];

                        const activeLetter = activeRow
                          ? currentGuess[letterIndex] ?? ""
                          : "";

                        const displayedLetter =
                          evaluatedLetter?.letter ?? activeLetter;

                        const status =
                          evaluatedLetter?.status ?? "empty";

                        return (
                          <div
                            key={letterIndex}
                            className={`flex h-11 w-10 items-center justify-center rounded-lg border text-lg font-black transition-all duration-300 sm:h-14 sm:w-12 sm:rounded-xl sm:text-xl ${getTileClasses(
                              status,
                            )} ${
                              activeLetter
                                ? "scale-105 border-green-400/50"
                                : ""
                            }`}
                          >
                            {displayedLetter}
                          </div>
                        );
                      },
                    )}
                  </div>
                );
              },
            )}
          </div>

          <div className="mt-7 rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
            <p className="text-sm leading-6 text-slate-300">
              {message}
            </p>
          </div>

          <div className="mt-6 space-y-2">
            {KEYBOARD_ROWS.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className="flex justify-center gap-1 sm:gap-1.5"
              >
                {row.map((key) => {
                  const isSpecialKey =
                    key === "ENTER" || key === "DELETE";

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleKey(key)}
                      disabled={gameStatus !== "playing"}
                      className={`flex h-11 items-center justify-center rounded-lg border text-xs font-black transition sm:h-12 sm:text-sm ${
                        isSpecialKey
                          ? "min-w-[58px] px-2 sm:min-w-[76px]"
                          : "w-8 sm:w-10"
                      } ${getKeyboardClasses(
                        keyboardStatuses[key],
                      )} disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {key === "DELETE" ? "⌫" : key}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {gameStatus !== "playing" && (
            <div className="mt-7 rounded-2xl border border-green-500/20 bg-green-500/10 p-5 text-center">
              <p className="text-xl font-black">
                {gameStatus === "won"
                  ? "Tebrikler! 🎉"
                  : "Bugün olmadı 😏"}
              </p>

              <p className="mt-2 text-sm text-slate-400">
                {gameStatus === "won"
                  ? `${guesses.length} tahminde bildin.`
                  : `Doğru cevap: ${answer}`}
              </p>

              <p className="mt-3 text-3xl font-black text-green-400">
                {score} puan
              </p>

              <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={shareResult}
                  className="rounded-xl bg-green-500 px-5 py-3 font-black text-[#07111f] transition hover:bg-green-400"
                >
                  Sonucu Paylaş
                </button>

                <Link
                  href="/"
                  className="rounded-xl border border-white/15 px-5 py-3 font-semibold transition hover:border-white/30 hover:bg-white/5"
                >
                  Ana Sayfaya Dön
                </Link>
              </div>

              {shareMessage && (
                <p className="mt-4 text-sm font-semibold text-green-400">
                  {shareMessage}
                </p>
              )}
            </div>
          )}

          <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3">
              <div className="mx-auto mb-2 h-4 w-4 rounded bg-green-500" />
              <p className="text-slate-400">Doğru yer</p>
            </div>

            <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3">
              <div className="mx-auto mb-2 h-4 w-4 rounded bg-amber-400" />
              <p className="text-slate-400">Yanlış yer</p>
            </div>

            <div className="rounded-xl border border-slate-600/30 bg-slate-700/20 p-3">
              <div className="mx-auto mb-2 h-4 w-4 rounded bg-slate-700" />
              <p className="text-slate-400">Yok</p>
            </div>
          </div>

          <button
            type="button"
            onClick={resetGameForTesting}
            className="mx-auto mt-5 block text-xs text-slate-700 transition hover:text-red-400"
          >
            Test için bugünkü oyunu sıfırla
          </button>
        </section>
      </div>
    </main>
  );
}