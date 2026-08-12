import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

type FinishBody = {
  sessionId?: string;
};

type SessionRow = {
  id: string;

  score: number;

  correct_count: number;

  wrong_count: number;

  duration_seconds: number;

  completed: boolean;

  created_at: string;

  completed_at:
    | string
    | null;
};

function calculateRemainingSeconds(
  createdAt: string,
  durationSeconds: number,
) {
  const startedAt =
    new Date(
      createdAt,
    ).getTime();

  const elapsedSeconds =
    Math.floor(
      (
        Date.now() -
        startedAt
      ) /
        1000,
    );

  return Math.max(
    0,
    durationSeconds -
      elapsedSeconds,
  );
}

export async function POST(
  request: Request,
) {
  try {
    /* =====================================================
       1. BODY
    ===================================================== */

    const body =
      (
        await request.json()
      ) as FinishBody;

    const sessionId =
      String(
        body.sessionId ??
          "",
      ).trim();

    if (
      !sessionId
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Session bulunamadı.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       2. SESSION
    ===================================================== */

    const {
      data:
        sessionData,

      error:
        sessionError,
    } =
      await supabaseAdmin
        .from(
          "tic_tac_toe_sessions",
        )
        .select(`
          id,
          score,
          correct_count,
          wrong_count,
          duration_seconds,
          completed,
          created_at,
          completed_at
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

    if (
      !sessionData
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Oyun bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    const session =
      sessionData as SessionRow;

    /* =====================================================
       3. ZATEN TAMAMLANDIYSA
    ===================================================== */

    if (
      session.completed
    ) {
      return NextResponse.json({
        ok: true,

        completed:
          true,

        alreadyCompleted:
          true,

        score:
          Number(
            session.score ??
              0,
          ),

        correctCount:
          Number(
            session.correct_count ??
              0,
          ),

        wrongCount:
          Number(
            session.wrong_count ??
              0,
          ),

        remainingSeconds:
          0,

        message:
          "Oyun zaten tamamlanmış.",
      });
    }

    /* =====================================================
       4. KALAN SÜRE
    ===================================================== */

    const remainingSeconds =
      calculateRemainingSeconds(
        session.created_at,
        Number(
          session.duration_seconds ??
            120,
        ),
      );

    /*
     * Client yanlışlıkla erken finish
     * çağırırsa oyunu kapatmayalım.
     */
    if (
      remainingSeconds >
      0
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Oyun süresi henüz bitmedi.",

          completed:
            false,

          score:
            Number(
              session.score ??
                0,
            ),

          correctCount:
            Number(
              session.correct_count ??
                0,
            ),

          wrongCount:
            Number(
              session.wrong_count ??
                0,
            ),

          remainingSeconds,
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       5. SESSION'I KAPAT
    ===================================================== */

    const now =
      new Date()
        .toISOString();

    const {
      data:
        finishedSession,

      error:
        finishError,
    } =
      await supabaseAdmin
        .from(
          "tic_tac_toe_sessions",
        )
        .update({
          completed:
            true,

          completed_at:
            now,
        })
        .eq(
          "id",
          sessionId,
        )
        .eq(
          "completed",
          false,
        )
        .select(`
          id,
          score,
          correct_count,
          wrong_count,
          completed,
          completed_at
        `)
        .maybeSingle();

    if (
      finishError
    ) {
      throw finishError;
    }

    /*
     * Çok yakın iki request aynı anda
     * finish'e geldiyse biri update
     * yapamayabilir. Son state'i okuyalım.
     */
    if (
      !finishedSession
    ) {
      const {
        data:
          latestSession,

        error:
          latestError,
      } =
        await supabaseAdmin
          .from(
            "tic_tac_toe_sessions",
          )
          .select(`
            id,
            score,
            correct_count,
            wrong_count,
            completed,
            completed_at
          `)
          .eq(
            "id",
            sessionId,
          )
          .maybeSingle();

      if (
        latestError
      ) {
        throw latestError;
      }

      if (
        !latestSession
      ) {
        return NextResponse.json(
          {
            ok: false,

            error:
              "Oyun sonucu alınamadı.",
          },
          {
            status: 500,
          },
        );
      }

      return NextResponse.json({
        ok: true,

        completed:
          Boolean(
            latestSession.completed,
          ),

        alreadyCompleted:
          Boolean(
            latestSession.completed,
          ),

        score:
          Number(
            latestSession.score ??
              0,
          ),

        correctCount:
          Number(
            latestSession.correct_count ??
              0,
          ),

        wrongCount:
          Number(
            latestSession.wrong_count ??
              0,
          ),

        remainingSeconds:
          0,

        message:
          `Süre bitti! ${Number(
            latestSession.correct_count ??
              0,
          )}/9 hücre tamamladın ve ${Number(
            latestSession.score ??
              0,
          )} puan topladın.`,
      });
    }

    /* =====================================================
       6. RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      completed:
        true,

      alreadyCompleted:
        false,

      reason:
        "timeout",

      score:
        Number(
          finishedSession.score ??
            0,
        ),

      correctCount:
        Number(
          finishedSession.correct_count ??
            0,
        ),

      wrongCount:
        Number(
          finishedSession.wrong_count ??
            0,
        ),

      remainingSeconds:
        0,

      message:
        `Süre bitti! ${Number(
          finishedSession.correct_count ??
            0,
        )}/9 hücre tamamladın ve ${Number(
          finishedSession.score ??
            0,
        )} puan topladın.`,
    });
  } catch (
    error
  ) {
    console.error(
      "TicTacToe solo finish endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "TicTacToe tamamlanırken hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}