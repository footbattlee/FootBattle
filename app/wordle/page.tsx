"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const ANSWER = "RONALDO";
const MAX_ATTEMPTS = 5;

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

function evaluateGuess(guess: string, answer: string): EvaluatedLetter[] {
  const result: EvaluatedLetter[] = guess.split("").map((letter) => ({
    letter,
    status: "absent",
  }));

  const remainingLetters = answer.split("");

  // Önce doğru harf ve doğru pozisyonları işaretle.
  guess.split("").forEach((letter, index) => {
    if (letter === answer[index]) {
      result[index].status = "correct";
      remainingLetters[index] = "";
    }
  });

  // Sonra doğru harf ama yanlış pozisyonları işaretle.
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

export default function WordlePage() {
  const [currentGuess, setCurrentGuess] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [message, setMessage] = useState(
    "😏 Footy: İlk tahminini görelim bakalım.",
  );
  const [gameStatus, setGameStatus] = useState<GameStatus>("playing");

  const evaluatedGuesses = useMemo(
    () => guesses.map((guess) => evaluateGuess(guess, ANSWER)),
    [guesses],
  );

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

  const submitGuess = useCallback(() => {
    if (gameStatus !== "playing") {
      return;
    }

    if (currentGuess.length !== ANSWER.length) {
      setMessage(
        `😏 Footy: ${ANSWER.length} harf lazım. Daha saymayı öğrenemedik mi?`,
      );
      return;
    }

    const nextGuesses = [...guesses, currentGuess];
    setGuesses(nextGuesses);

    if (currentGuess === ANSWER) {
      setGameStatus("won");

      if (nextGuesses.length === 1) {
        setMessage("🤯 Footy: İlk tahminde mi? Tamam, buna saygı duydum.");
      } else if (nextGuesses.length <= 3) {
        setMessage("😎 Footy: Fena değilsin. Çok da havaya girme.");
      } else {
        setMessage("😏 Footy: Son anda kurtardın. Yine de sayıyorum.");
      }

      setCurrentGuess("");
      return;
    }

    if (nextGuesses.length >= MAX_ATTEMPTS) {
      setGameStatus("lost");
      setMessage(`😂 Footy: Cevap ${ANSWER} idi. Kol bozuk deme.`);
      setCurrentGuess("");
      return;
    }

    const remainingAttempts = MAX_ATTEMPTS - nextGuesses.length;

    setMessage(
      `👀 Footy: Olmadı. ${remainingAttempts} hakkın kaldı, toparlan.`,
    );
    setCurrentGuess("");
  }, [currentGuess, gameStatus, guesses]);

  const handleKey = useCallback(
    (key: string) => {
      if (gameStatus !== "playing") {
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
          if (previous.length >= ANSWER.length) {
            return previous;
          }

          return previous + key;
        });
      }
    },
    [gameStatus, submitGuess],
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
      window.removeEventListener("keydown", handlePhysicalKeyboard);
    };
  }, [handleKey]);

  function restartGame() {
    setCurrentGuess("");
    setGuesses([]);
    setGameStatus("playing");
    setMessage("😏 Footy: Rövanş istedin demek. Bu kez bahanen hazır mı?");
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
            <p className="text-xs text-slate-500">Günün Wordle&apos;ı</p>
          </div>

          <div className="rounded-xl border border-white/10 px-4 py-2 text-sm">
            {guesses.length}/{MAX_ATTEMPTS}
          </div>
        </header>

        <section className="mt-7 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/30 sm:p-7">
          <div className="text-center">
            <span className="inline-block rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-green-400">
              Günlük oyun
            </span>

            <h1 className="mt-5 text-3xl font-black sm:text-4xl">
              Futbolcuyu Bul
            </h1>

            <p className="mt-2 text-sm text-slate-400 sm:text-base">
              Bugünün futbolcu soyadını 5 tahminde bul.
            </p>

            <p className="mt-2 text-xs text-slate-600">
              Soyadı {ANSWER.length} harften oluşuyor.
            </p>
          </div>

          <div className="mt-8 space-y-2.5">
            {Array.from({ length: MAX_ATTEMPTS }).map((_, rowIndex) => {
              const submittedGuess = evaluatedGuesses[rowIndex];

              const activeRow =
                rowIndex === guesses.length && gameStatus === "playing";

              return (
                <div
                  key={rowIndex}
                  className="flex justify-center gap-1.5 sm:gap-2"
                >
                  {Array.from({ length: ANSWER.length }).map(
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
            })}
          </div>

          <div className="mt-7 rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
            <p className="text-sm leading-6 text-slate-300">{message}</p>
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
                  : `Doğru cevap: ${ANSWER}`}
              </p>

              <button
                type="button"
                onClick={restartGame}
                className="mt-5 rounded-xl bg-green-500 px-5 py-3 font-black text-[#07111f] transition hover:bg-green-400"
              >
                Tekrar Dene
              </button>
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
        </section>
      </div>
    </main>
  );
}