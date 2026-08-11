import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

/* =========================================================
   TYPES
========================================================= */

type FinishBody = {
  sessionId?: string;
};

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: Request,
) {
  try {
    /* =====================================================
       BODY
    ===================================================== */

    const body =
      (await request.json()) as FinishBody;

    const sessionId =
      body.sessionId?.trim();

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
       AUTH
    ===================================================== */

    const authSupabase =
      await createAuthServerClient();

    const {
      data: {
        user,
      },
    } =
      await authSupabase
        .auth
        .getUser();

    /* =====================================================
       SESSION
    ===================================================== */

    const {
      data:
        session,
      error:
        sessionError,
    } =
      await supabaseAdmin
        .from(
          "one_club_one_country_sessions",
        )
        .select(`
          id,

          completed,
          score,
          attempt_count,

          correct_count,
          wrong_count,
          passes_left,
          question_no,

          user_id,

          started_at,
          expires_at,
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

    if (!session) {
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

    /* =====================================================
       OWNER CONTROL
    ===================================================== */

    if (
      session.user_id &&
      session.user_id !==
        user?.id
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Bu oyun oturumuna erişim yetkin yok.",
        },
        {
          status: 403,
        },
      );
    }

    /* =====================================================
       ALREADY COMPLETED
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

        attemptCount:
          Number(
            session.attempt_count ??
              0,
          ),

        passesLeft:
          Number(
            session.passes_left ??
              0,
          ),

        questionNo:
          Number(
            session.question_no ??
              1,
          ),

        startedAt:
          session.started_at,

        expiresAt:
          session.expires_at,

        completedAt:
          session.completed_at,
      });
    }

    /* =====================================================
       COMPLETE
    ===================================================== */

    const now =
      new Date();

    const {
      data:
        completedSession,
      error:
        completeError,
    } =
      await supabaseAdmin
        .from(
          "one_club_one_country_sessions",
        )
        .update({
          completed:
            true,

          completed_at:
            now.toISOString(),
        })
        .eq(
          "id",
          session.id,
        )
        .eq(
          "completed",
          false,
        )
        .select(`
          id,

          completed,
          score,
          attempt_count,

          correct_count,
          wrong_count,
          passes_left,
          question_no,

          started_at,
          expires_at,
          completed_at
        `)
        .maybeSingle();

    if (
      completeError
    ) {
      throw completeError;
    }

    /* =====================================================
       RACE CONDITION

       Answer/pass endpoint'i aynı anda session'ı kapatmış
       olabilir. Son halini tekrar oku.
    ===================================================== */

    if (
      !completedSession
    ) {
      const {
        data:
          latestSession,
        error:
          latestError,
      } =
        await supabaseAdmin
          .from(
            "one_club_one_country_sessions",
          )
          .select(`
            id,

            completed,
            score,
            attempt_count,

            correct_count,
            wrong_count,
            passes_left,
            question_no,

            started_at,
            expires_at,
            completed_at
          `)
          .eq(
            "id",
            session.id,
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
        throw new Error(
          "Oyun sonucu tekrar okunamadı.",
        );
      }

      return NextResponse.json({
        ok: true,

        completed:
          Boolean(
            latestSession.completed,
          ),

        alreadyCompleted:
          true,

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

        attemptCount:
          Number(
            latestSession.attempt_count ??
              0,
          ),

        passesLeft:
          Number(
            latestSession.passes_left ??
              0,
          ),

        questionNo:
          Number(
            latestSession.question_no ??
              1,
          ),

        startedAt:
          latestSession.started_at,

        expiresAt:
          latestSession.expires_at,

        completedAt:
          latestSession.completed_at,
      });
    }

    /* =====================================================
       RESULT
    ===================================================== */

    const finalScore =
      Number(
        completedSession.score ??
          0,
      );

    const finalCorrectCount =
      Number(
        completedSession.correct_count ??
          0,
      );

    const finalWrongCount =
      Number(
        completedSession.wrong_count ??
          0,
      );

    const finalAttemptCount =
      Number(
        completedSession.attempt_count ??
          0,
      );

    const finalPassesLeft =
      Number(
        completedSession.passes_left ??
          0,
      );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      completed:
        true,

      alreadyCompleted:
        false,

      score:
        finalScore,

      correctCount:
        finalCorrectCount,

      wrongCount:
        finalWrongCount,

      attemptCount:
        finalAttemptCount,

      passesLeft:
        finalPassesLeft,

      questionNo:
        Number(
          completedSession.question_no ??
            1,
        ),

      startedAt:
        completedSession.started_at,

      expiresAt:
        completedSession.expires_at,

      completedAt:
        completedSession.completed_at,

      message:
        finalCorrectCount > 0
          ? `Süre bitti! ${finalCorrectCount} doğru cevapla ${finalScore} puan topladın.`
          : "Süre bitti! Bu sefer puan çıkmadı.",
    });
  } catch (
    error
  ) {
    console.error(
      "1 Takım 1 Millet finish endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Oyun tamamlanamadı.",
      },
      {
        status: 500,
      },
    );
  }
}