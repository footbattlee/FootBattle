import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

const SCORE_PER_CORRECT =
  20;

type AnswerBody = {
  sessionId?: string;
  playerId?: number | string;
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

  answer_player_ids:
    | number[]
    | string[]
    | null;

  attempt_count: number;

  completed: boolean;
  passed: boolean;

  correct_player_id:
    | number
    | null;

  completed_at:
    | string
    | null;
};

function parsePlayerIds(
  value:
    | number[]
    | string[]
    | null
    | undefined,
) {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [] as number[];
  }

  return Array.from(
    new Set(
      value
        .map(
          Number,
        )
        .filter(
          (
            id,
          ) =>
            Number.isInteger(
              id,
            ) &&
            id >
              0,
        ),
    ),
  );
}

function calculateRemainingSeconds(
  createdAt: string,
  durationSeconds: number,
) {
  const startedAtMs =
    new Date(
      createdAt,
    ).getTime();

  const nowMs =
    Date.now();

  const elapsedSeconds =
    Math.floor(
      (
        nowMs -
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
      ) as AnswerBody;

    const sessionId =
      String(
        body.sessionId ??
          "",
      ).trim();

    const playerId =
      Number(
        body.playerId,
      );

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

    if (
      !Number.isInteger(
        playerId,
      ) ||
      playerId <=
        0
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Geçerli oyuncu seçmelisin.",
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

        correct:
          false,

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
       4. AKTİF ROUND

       İlk tamamlanmamış / pas geçilmemiş round.
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
          answer_player_ids,
          attempt_count,
          completed,
          passed,
          correct_player_id,
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

    const round =
      roundData as RoundRow;

    const validPlayerIds =
      parsePlayerIds(
        round.answer_player_ids,
      );

    /* =====================================================
       5. ATTEMPT SAYISI

       Doğru/yanlış fark etmeden tahmin yapıldı.
    ===================================================== */

    const nextAttemptCount =
      Number(
        round.attempt_count ??
          0,
      ) +
      1;

    /* =====================================================
       6. CEVAP KONTROL
    ===================================================== */

    const correct =
      validPlayerIds.includes(
        playerId,
      );

    /* =====================================================
       7. YANLIŞ CEVAP
    ===================================================== */

    if (
      !correct
    ) {
      const {
        error:
          attemptUpdateError,
      } =
        await supabaseAdmin
          .from(
            "club_clash_rounds",
          )
          .update({
            attempt_count:
              nextAttemptCount,
          })
          .eq(
            "id",
            round.id,
          );

      if (
        attemptUpdateError
      ) {
        throw attemptUpdateError;
      }

      return NextResponse.json({
        ok: true,

        correct:
          false,

        completed:
          false,

        score:
          Number(
            session.score ??
              0,
          ),

        scoreDelta:
          0,

        remainingSeconds,

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

        attemptCount:
          nextAttemptCount,

        round: {
          id:
            Number(
              round.id,
            ),

          roundNo:
            Number(
              round.round_no,
            ),

          leftClub:
            round.left_club,

          rightClub:
            round.right_club,
        },
      });
    }

    /* =====================================================
       8. DOĞRU CEVAP
    ===================================================== */

    const now =
      new Date()
        .toISOString();

    const newScore =
      Number(
        session.score ??
          0,
      ) +
      SCORE_PER_CORRECT;

    const {
      error:
        roundUpdateError,
    } =
      await supabaseAdmin
        .from(
          "club_clash_rounds",
        )
        .update({
          attempt_count:
            nextAttemptCount,

          completed:
            true,

          passed:
            false,

          correct_player_id:
            playerId,

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
        scoreUpdateError,
    } =
      await supabaseAdmin
        .from(
          "club_clash_sessions",
        )
        .update({
          score:
            newScore,
        })
        .eq(
          "id",
          sessionId,
        );

    if (
      scoreUpdateError
    ) {
      throw scoreUpdateError;
    }

    /* =====================================================
       9. OYUNCU ADI

       UI'da "+20 - Hazard" gibi istersek kullanabiliriz.
    ===================================================== */

    const {
      data:
        playerData,
    } =
      await supabaseAdmin
        .from(
          "guess_players",
        )
        .select(`
          player_id,
          name
        `)
        .eq(
          "player_id",
          playerId,
        )
        .maybeSingle();

    const correctPlayerName =
      playerData?.name ??
      null;

    /* =====================================================
       10. SONRAKİ ROUND
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
       11. ROUND KALMADI
    ===================================================== */

    if (
      !nextRoundData
    ) {
      await supabaseAdmin
        .from(
          "club_clash_sessions",
        )
        .update({
          score:
            newScore,

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

        correct:
          true,

        score:
          newScore,

        scoreDelta:
          SCORE_PER_CORRECT,

        correctPlayerId:
          playerId,

        correctPlayerName,

        completed:
          true,

        reason:
          "rounds_finished",

        remainingSeconds,

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

        nextRound:
          null,
      });
    }

    /* =====================================================
       12. RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      correct:
        true,

      completed:
        false,

      score:
        newScore,

      scoreDelta:
        SCORE_PER_CORRECT,

      correctPlayerId:
        playerId,

      correctPlayerName,

      remainingSeconds,

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

      attemptCount:
        nextAttemptCount,

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
      "Club Clash solo answer endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Cevap kontrol edilirken hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}