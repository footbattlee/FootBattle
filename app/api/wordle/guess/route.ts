import { NextResponse } from "next/server";

import {
  getGameSecurityEvents,
  recordGameSecurityEvent,
} from "@/lib/game-security/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type LetterStatus = "correct" | "present" | "absent";
type GuessRequest = { sessionId?: string; guess?: string };

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
  const result = guess.split("").map((letter) => ({ letter, status: "absent" as LetterStatus }));
  const remainingLetters = answer.split("");

  guess.split("").forEach((letter, index) => {
    if (letter === answer[index]) {
      result[index].status = "correct";
      remainingLetters[index] = "";
    }
  });

  guess.split("").forEach((letter, index) => {
    if (result[index].status === "correct") return;
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
    const sessionId = body.sessionId?.trim();
    const guess = normalizeGuess(body.guess ?? "");

    if (!sessionId) return NextResponse.json({ ok: false, error: "Oyun oturumu bulunamadı." }, { status: 400 });

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("wordle_sessions")
      .select("id, answer_normalized, letter_count, max_attempts, completed")
      .eq("id", sessionId)
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (!session) return NextResponse.json({ ok: false, error: "Wordle oyunu bulunamadı." }, { status: 404 });
    if (session.completed) return NextResponse.json({ ok: false, error: "Bu oyun zaten tamamlandı." }, { status: 409 });

    const answer = String(session.answer_normalized ?? "");
    if (guess.length !== answer.length) {
      return NextResponse.json({ ok: false, error: `${answer.length} harfli bir tahmin girmelisin.` }, { status: 400 });
    }

    const { events } = await getGameSecurityEvents("wordle", sessionId, "guess");
    const maxAttempts = Number(session.max_attempts ?? 5);
    if (events.length >= maxAttempts) return NextResponse.json({ ok: false, error: "Tahmin hakkın kalmadı." }, { status: 409 });

    const eventResult = await recordGameSecurityEvent({
      request,
      gameCode: "wordle",
      sourceSessionId: sessionId,
      eventType: "guess",
      payload: { guess, attemptNumber: events.length + 1 },
      maxPerMinute: 35,
    });
    if (!eventResult.allowed) return NextResponse.json({ ok: false, error: "Çok hızlı tahmin gönderiyorsun." }, { status: 429 });

    return NextResponse.json({
      ok: true,
      guess,
      evaluation: evaluateGuess(guess, answer),
      won: guess === answer,
    });
  } catch (error) {
    console.error("Wordle guess endpoint error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Tahmin kontrol edilirken hata oluştu." }, { status: 500 });
  }
}
