import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

type PassBody = {
  sessionId?: string;
};

type SessionRow = {
  id: string;

  score: number;

  pass_count: number;
  max_passes: number;

  duration_seconds: number;

  completed: boolean;

  created_at: string;

  completed_at:
    | string
    | null;
};

type RoundRow = {
  id: number;

  session_id: string;

  round_no: number;

  left_club: string;
  right_club: string;

  completed: boolean;
  passed: boolean;

  completed_at:
    | string
    | null;
};

function calculateRemainingSeconds(
  createdAt: string,
  durationSeconds: number,
) {
  const startedAtMs =
    new Date(
      createdAt,
    ).getTime();

  const elapsedSeconds =
    Math.floor(
      (
        Date.now() -
        startedAtMs
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
      ) as PassBody;

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
          "club_clash_sessions",
        )
        .select(`
          id,
          score,
          pass_count,
          max_passes,
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

    if (
      session.completed
    ) {
      return NextResponse.json({
        ok: true,

        completed: true,

        score:
          Number(
            session.score ??
              0,
          ),

        remainingSeconds:
          0,

        remainingPasses:
          0,

        error:
          "Bu oyun zaten tamamlandı.",
      });
    }

    /* =====================================================
       3. SÜRE
    ===================================================== */

    const remainingSeconds =
      calculateRemainingSeconds(
        session.created_at,
        Number(
          session.duration_seconds ??
            120,
        ),
      );

    if (
      remainingSeconds <=
      0
    ) {
      const now =
        new Date()
          .toISOString();

      await supabaseAdmin
        .from(
          "club_clash_sessions",
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
        );

      return NextResponse.json({
        ok: true,

        completed:
          true,

        reason:
          "timeout",

        score:
          Number(
            session.score ??
              0,
          ),

        remainingSeconds:
          0,

        remainingPasses:
          Math.max(
            0,
            Number(
              session.max_passes ??
                3,
            ) -
              Number(
                session.pass_count ??
                  0,
              ),
          ),
      });
    }

    /* =====================================================
       4. PAS HAKKI
    ===================================================== */

    const usedPasses =
      Number(
        session.pass_count ??
          0,
      );

    const maxPasses =
      Number(
        session.max_passes ??
          3,
      );

    if (
      usedPasses >=
      maxPasses
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Pas hakkın kalmadı.",

          score:
            Number(
              session.score ??
                0,
            ),

          remainingSeconds,

          usedPasses,

          remainingPasses:
            0,
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       5. AKTİF ROUND
    ===================================================== */

    const {
      data:
        roundData,

      error:
        roundError,
    } =
      await supabaseAdmin
        .from(
          "club_clash_rounds",
        )
        .select(`
          id,
          session_id,
          round_no,
          left_club,
          right_club,
          completed,
          passed,
          completed_at
        `)
        .eq(
          "session_id",
          sessionId,
        )
        .eq(
          "completed",
          false,
        )
        .order(
          "round_no",
          {
            ascending:
              true,
          },
        )
        .limit(
          1,
        )
        .maybeSingle();

    if (
      roundError
    ) {
      throw roundError;
    }

    if (
      !roundData
    ) {
      const now =
        new Date()
          .toISOString();

      await supabaseAdmin
        .from(
          "club_clash_sessions",
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
        );

      return NextResponse.json({
        ok: true,

        completed:
          true,

        reason:
          "rounds_finished",

        score:
          Number(
            session.score ??
              0,
          ),

        remainingSeconds,

        usedPasses,

        remainingPasses:
          Math.max(
            0,
            maxPasses -
              usedPasses,
          ),
      });
    }

    const round =
      roundData as RoundRow;

    /* =====================================================
       6. ROUND'U PASLA
    ===================================================== */

    const now =
      new Date()
        .toISOString();

    const nextPassCount =
      usedPasses +
      1;

    const {
      error:
        roundUpdateError,
    } =
      await supabaseAdmin
        .from(
          "club_clash_rounds",
        )
        .update({
          completed:
            true,

          passed:
            true,

          completed_at:
            now,
        })
        .eq(
          "id",
          round.id,
        );

    if (
      roundUpdateError
    ) {
      throw roundUpdateError;
    }

    const {
      error:
        sessionUpdateError,
    } =
      await supabaseAdmin
        .from(
          "club_clash_sessions",
        )
        .update({
          pass_count:
            nextPassCount,
        })
        .eq(
          "id",
          sessionId,
        );

    if (
      sessionUpdateError
    ) {
      throw sessionUpdateError;
    }

    /* =====================================================
       7. SONRAKİ ROUND
    ===================================================== */

    const {
      data:
        nextRoundData,

      error:
        nextRoundError,
    } =
      await supabaseAdmin
        .from(
          "club_clash_rounds",
        )
        .select(`
          id,
          round_no,
          left_club,
          right_club
        `)
        .eq(
          "session_id",
          sessionId,
        )
        .eq(
          "completed",
          false,
        )
        .order(
          "round_no",
          {
            ascending:
              true,
          },
        )
        .limit(
          1,
        )
        .maybeSingle();

    if (
      nextRoundError
    ) {
      throw nextRoundError;
    }

    /* =====================================================
       8. ROUND KALMADI
    ===================================================== */

    if (
      !nextRoundData
    ) {
      await supabaseAdmin
        .from(
          "club_clash_sessions",
        )
        .update({
          pass_count:
            nextPassCount,

          completed:
            true,

          completed_at:
            now,
        })
        .eq(
          "id",
          sessionId,
        );

      return NextResponse.json({
        ok: true,

        passed:
          true,

        completed:
          true,

        reason:
          "rounds_finished",

        score:
          Number(
            session.score ??
              0,
          ),

        remainingSeconds,

        usedPasses:
          nextPassCount,

        remainingPasses:
          Math.max(
            0,
            maxPasses -
              nextPassCount,
          ),

        nextRound:
          null,
      });
    }

    /* =====================================================
       9. RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      passed:
        true,

      completed:
        false,

      score:
        Number(
          session.score ??
            0,
        ),

      remainingSeconds,

      usedPasses:
        nextPassCount,

      remainingPasses:
        Math.max(
          0,
          maxPasses -
            nextPassCount,
        ),

      nextRound: {
        id:
          Number(
            nextRoundData.id,
          ),

        roundNo:
          Number(
            nextRoundData.round_no,
          ),

        leftClub:
          nextRoundData.left_club,

        rightClub:
          nextRoundData.right_club,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "Club Clash solo pass endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Pas işlemi sırasında hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}