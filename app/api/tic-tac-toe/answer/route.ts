import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

const SCORE_PER_CORRECT =
  10;

const FULL_GRID_BONUS =
  50;

type AnswerBody = {
  sessionId?: string;

  rowIndex?:
    | number
    | string;

  columnIndex?:
    | number
    | string;

  playerId?:
    | number
    | string;
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

type CellRow = {
  id: number;

  session_id: string;

  row_index: number;

  column_index: number;

  row_type: string;

  row_value: string;

  column_type: string;

  column_value: string;

  valid_player_ids:
    | number[]
    | string[]
    | null;

  answered: boolean;

  correct: boolean;

  player_id:
    | number
    | null;

  answered_at:
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
      ) as AnswerBody;

    const sessionId =
      String(
        body.sessionId ??
          "",
      ).trim();

    const rowIndex =
      Number(
        body.rowIndex,
      );

    const columnIndex =
      Number(
        body.columnIndex,
      );

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
        rowIndex,
      ) ||
      rowIndex <
        0 ||
      rowIndex >
        2
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Geçersiz satır.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isInteger(
        columnIndex,
      ) ||
      columnIndex <
        0 ||
      columnIndex >
        2
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Geçersiz sütun.",
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
            "Geçerli bir oyuncu seçmelisin.",
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

    if (
      session.completed
    ) {
      return NextResponse.json({
        ok: true,

        completed:
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
      });
    }

    /* =====================================================
       4. HÜCRE
    ===================================================== */

    const {
      data:
        cellData,

      error:
        cellError,
    } =
      await supabaseAdmin
        .from(
          "tic_tac_toe_cells",
        )
        .select(`
          id,
          session_id,
          row_index,
          column_index,
          row_type,
          row_value,
          column_type,
          column_value,
          valid_player_ids,
          answered,
          correct,
          player_id,
          answered_at
        `)
        .eq(
          "session_id",
          sessionId,
        )
        .eq(
          "row_index",
          rowIndex,
        )
        .eq(
          "column_index",
          columnIndex,
        )
        .maybeSingle();

    if (
      cellError
    ) {
      throw cellError;
    }

    if (
      !cellData
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Seçilen hücre bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    const cell =
      cellData as CellRow;

    /* =====================================================
       5. HÜCRE ZATEN DOLU MU?
    ===================================================== */

    if (
      cell.answered &&
      cell.correct
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Bu hücre zaten dolduruldu.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       6. OYUNCU DAHA ÖNCE KULLANILDI MI?
    ===================================================== */

    const {
      data:
        usedPlayerCell,

      error:
        usedPlayerError,
    } =
      await supabaseAdmin
        .from(
          "tic_tac_toe_cells",
        )
        .select(`
          id
        `)
        .eq(
          "session_id",
          sessionId,
        )
        .eq(
          "player_id",
          playerId,
        )
        .eq(
          "correct",
          true,
        )
        .limit(
          1,
        )
        .maybeSingle();

    if (
      usedPlayerError
    ) {
      throw usedPlayerError;
    }

    if (
      usedPlayerCell
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Bu oyuncuyu bu gridde daha önce kullandın.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       7. CEVAP KONTROL
    ===================================================== */

    const validPlayerIds =
      parsePlayerIds(
        cell.valid_player_ids,
      );

    const correct =
      validPlayerIds.includes(
        playerId,
      );

    const now =
      new Date()
        .toISOString();

    /* =====================================================
       8. YANLIŞ CEVAP
    ===================================================== */

    if (
      !correct
    ) {
      const newWrongCount =
        Number(
          session.wrong_count ??
            0,
        ) +
        1;

      const {
        error:
          sessionWrongError,
      } =
        await supabaseAdmin
          .from(
            "tic_tac_toe_sessions",
          )
          .update({
            wrong_count:
              newWrongCount,
          })
          .eq(
            "id",
            sessionId,
          );

      if (
        sessionWrongError
      ) {
        throw sessionWrongError;
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

        correctCount:
          Number(
            session.correct_count ??
              0,
          ),

        wrongCount:
          newWrongCount,

        remainingSeconds,

        cell: {
          rowIndex,
          columnIndex,

          answered:
            false,

          correct:
            false,

          player:
            null,
        },

        message:
          "Yanlış oyuncu. Hücre boş kaldı.",
      });
    }

    /* =====================================================
       9. OYUNCU BİLGİSİ
    ===================================================== */

    const {
      data:
        playerData,

      error:
        playerError,
    } =
      await supabaseAdmin
        .from(
          "guess_players",
        )
        .select(`
          player_id,
          name,
          nationality,
          current_club_name,
          image_url
        `)
        .eq(
          "player_id",
          playerId,
        )
        .maybeSingle();

    if (
      playerError
    ) {
      throw playerError;
    }

    if (
      !playerData
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Oyuncu bilgisi bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    /* =====================================================
       10. HÜCREYİ DOLDUR
    ===================================================== */

    const {
      error:
        cellUpdateError,
    } =
      await supabaseAdmin
        .from(
          "tic_tac_toe_cells",
        )
        .update({
          answered:
            true,

          correct:
            true,

          player_id:
            playerId,

          answered_at:
            now,
        })
        .eq(
          "id",
          cell.id,
        );

    if (
      cellUpdateError
    ) {
      throw cellUpdateError;
    }

    /* =====================================================
       11. YENİ SKOR
    ===================================================== */

    const newCorrectCount =
      Number(
        session.correct_count ??
          0,
      ) +
      1;

    let newScore =
      Number(
        session.score ??
          0,
      ) +
      SCORE_PER_CORRECT;

    let completed =
      false;

    let fullGridBonus =
      0;

    /* =====================================================
       12. 9/9 TAMAMLANDI MI?
    ===================================================== */

    if (
      newCorrectCount >=
      9
    ) {
      completed =
        true;

      fullGridBonus =
        FULL_GRID_BONUS;

      newScore +=
        FULL_GRID_BONUS;
    }

    /* =====================================================
       13. SESSION UPDATE
    ===================================================== */

    const sessionUpdate:
      Record<
        string,
        unknown
      > = {
        score:
          newScore,

        correct_count:
          newCorrectCount,
      };

    if (
      completed
    ) {
      sessionUpdate.completed =
        true;

      sessionUpdate.completed_at =
        now;
    }

    const {
      error:
        sessionUpdateError,
    } =
      await supabaseAdmin
        .from(
          "tic_tac_toe_sessions",
        )
        .update(
          sessionUpdate,
        )
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
       14. RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      correct:
        true,

      completed,

      reason:
        completed
          ? "grid_completed"
          : null,

      score:
        newScore,

      scoreDelta:
        SCORE_PER_CORRECT +
        fullGridBonus,

      fullGridBonus,

      correctCount:
        newCorrectCount,

      wrongCount:
        Number(
          session.wrong_count ??
            0,
        ),

      remainingSeconds,

      cell: {
        rowIndex,

        columnIndex,

        answered:
          true,

        correct:
          true,

        player: {
          id:
            Number(
              playerData.player_id,
            ),

          name:
            playerData.name,

          nationality:
            playerData.nationality ??
            null,

          currentClubName:
            playerData.current_club_name ??
            null,

          imageUrl:
            playerData.image_url ??
            null,
        },
      },

      message:
        completed
          ? `9/9 tamamlandı! +${FULL_GRID_BONUS} bonus.`
          : `Doğru! +${SCORE_PER_CORRECT} puan.`,
    });
  } catch (
    error
  ) {
    console.error(
      "TicTacToe solo answer endpoint hatası:",
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