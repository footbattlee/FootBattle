import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

type LetterStatus =
  | "correct"
  | "present"
  | "absent";

type GuessRequest = {
  sessionId?: string;
  guess?: string;
};

function normalizeGuess(
  value: string,
) {
  return value
    .trim()
    .toLocaleUpperCase(
      "tr-TR",
    )
    .replace(/İ/g, "I")
    .replace(/Ç/g, "C")
    .replace(/Ğ/g, "G")
    .replace(/Ö/g, "O")
    .replace(/Ş/g, "S")
    .replace(/Ü/g, "U");
}

function evaluateGuess(
  guess: string,
  answer: string,
) {
  const result =
    guess
      .split("")
      .map(
        (letter) => ({
          letter,

          status:
            "absent" as LetterStatus,
        }),
      );

  const remainingLetters =
    answer.split("");

  /* =====================================================
     DOĞRU POZİSYON
  ===================================================== */

  guess
    .split("")
    .forEach(
      (
        letter,
        index,
      ) => {
        if (
          letter ===
          answer[index]
        ) {
          result[
            index
          ].status =
            "correct";

          remainingLetters[
            index
          ] = "";
        }
      },
    );

  /* =====================================================
     VAR AMA YANLIŞ POZİSYON
  ===================================================== */

  guess
    .split("")
    .forEach(
      (
        letter,
        index,
      ) => {
        if (
          result[index]
            .status ===
          "correct"
        ) {
          return;
        }

        const remainingIndex =
          remainingLetters.indexOf(
            letter,
          );

        if (
          remainingIndex !==
          -1
        ) {
          result[
            index
          ].status =
            "present";

          remainingLetters[
            remainingIndex
          ] = "";
        }
      },
    );

  return result;
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      (await request.json()) as GuessRequest;

    const sessionId =
      body.sessionId?.trim();

    const guess =
      normalizeGuess(
        body.guess ??
          "",
      );

    if (!sessionId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Oyun oturumu bulunamadı.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       SESSION
    ===================================================== */

    const {
      data: session,
      error: sessionError,
    } = await supabaseAdmin
      .from(
        "wordle_sessions",
      )
      .select(`
        id,
        answer_normalized,
        letter_count,
        max_attempts,
        completed
      `)
      .eq(
        "id",
        sessionId,
      )
      .maybeSingle();

    if (
      sessionError
    ) {
      throw sessionError;
    }

    if (!session) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Wordle oyunu bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      session.completed
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu oyun zaten tamamlandı.",
        },
        {
          status: 409,
        },
      );
    }

    const answer =
      session.answer_normalized;

    if (
      guess.length !==
      answer.length
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            `${answer.length} harfli bir tahmin girmelisin.`,
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json({
      ok: true,

      guess,

      evaluation:
        evaluateGuess(
          guess,
          answer,
        ),

      won:
        guess ===
        answer,
    });
  } catch (error) {
    console.error(
      "Wordle guess endpoint error:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Tahmin kontrol edilirken hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}