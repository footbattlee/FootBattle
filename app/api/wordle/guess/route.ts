import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

type LetterStatus = "correct" | "present" | "absent";

type GuessRequest = {
  guess?: string;
};

function getTurkeyDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function normalizeGuess(value: string) {
  return value
    .trim()
    .toLocaleUpperCase("tr-TR")
    .replace(/İ/g, "I")
    .replace(/Ç/g, "C")
    .replace(/Ğ/g, "G")
    .replace(/Ö/g, "O")
    .replace(/Ş/g, "S")
    .replace(/Ü/g, "U");
}

function evaluateGuess(guess: string, answer: string) {
  const result = guess.split("").map((letter) => ({
    letter,
    status: "absent" as LetterStatus,
  }));

  const remainingLetters = answer.split("");

  guess.split("").forEach((letter, index) => {
    if (letter === answer[index]) {
      result[index].status = "correct";
      remainingLetters[index] = "";
    }
  });

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GuessRequest;
    const guess = normalizeGuess(body.guess ?? "");

    const playDate = getTurkeyDateKey();

    const { data, error } = await supabaseAdmin
      .from("daily_wordle")
      .select(`
        play_date,
        players!inner (
          normalized_last_name
        )
      `)
      .eq("play_date", playDate)
      .eq("is_published", true)
      .single();

    if (error || !data) {
      console.error("Günün Wordle kaydı okunamadı:", error);

      return NextResponse.json(
        {
          ok: false,
          error: "Bugünün oyunu bulunamadı.",
        },
        { status: 404 },
      );
    }

    const player = Array.isArray(data.players)
      ? data.players[0]
      : data.players;

    const answer = player?.normalized_last_name;

    if (!answer) {
      return NextResponse.json(
        {
          ok: false,
          error: "Oyuncu bilgisi bulunamadı.",
        },
        { status: 500 },
      );
    }

    if (guess.length !== answer.length) {
      return NextResponse.json(
        {
          ok: false,
          error: `${answer.length} harfli bir tahmin girmelisin.`,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      guess,
      evaluation: evaluateGuess(guess, answer),
      won: guess === answer,
    });
  } catch (error) {
    console.error("Wordle guess endpoint error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Tahmin kontrol edilirken hata oluştu.",
      },
      { status: 500 },
    );
  }
}