import { NextResponse } from "next/server";

import { matchesBothConstraints } from "@/lib/challenges/player-matcher";
import { nationalityToDisplayName } from "@/lib/football/localization";
import { recordGameSecurityEvent } from "@/lib/game-security/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const SCORE_PER_CORRECT = 10;
const FULL_GRID_BONUS = 50;

type AnswerBody = { sessionId?: string; rowIndex?: number | string; columnIndex?: number | string; playerId?: number | string };

type SessionRow = {
  id: string;
  score: number;
  correct_count: number;
  wrong_count: number;
  duration_seconds: number;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
};

type CellRow = {
  id: number;
  session_id: string;
  row_index: number;
  column_index: number;
  row_type: "club" | "nationality";
  row_value: string;
  column_type: "club" | "nationality";
  column_value: string;
  valid_player_ids: number[] | string[] | null;
  answered: boolean;
  correct: boolean;
  player_id: number | null;
};

function remainingSeconds(createdAt: string, durationSeconds: number) {
  const elapsedSeconds = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  return Math.max(0, durationSeconds - elapsedSeconds);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnswerBody;
    const sessionId = String(body.sessionId ?? "").trim();
    const rowIndex = Number(body.rowIndex);
    const columnIndex = Number(body.columnIndex);
    const playerId = Number(body.playerId);

    if (!sessionId) return NextResponse.json({ ok: false, error: "Session bulunamadı." }, { status: 400 });
    if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex > 2) return NextResponse.json({ ok: false, error: "Geçersiz satır." }, { status: 400 });
    if (!Number.isInteger(columnIndex) || columnIndex < 0 || columnIndex > 2) return NextResponse.json({ ok: false, error: "Geçersiz sütun." }, { status: 400 });
    if (!Number.isInteger(playerId) || playerId <= 0) return NextResponse.json({ ok: false, error: "Geçerli bir oyuncu seçmelisin." }, { status: 400 });

    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from("tic_tac_toe_sessions")
      .select("id, score, correct_count, wrong_count, duration_seconds, completed, created_at, completed_at")
      .eq("id", sessionId)
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (!sessionData) return NextResponse.json({ ok: false, error: "Oyun bulunamadı." }, { status: 404 });
    const session = sessionData as SessionRow;
    if (session.completed) return NextResponse.json({ ok: true, completed: true, score: Number(session.score ?? 0), correctCount: Number(session.correct_count ?? 0), wrongCount: Number(session.wrong_count ?? 0), remainingSeconds: 0, error: "Bu oyun zaten tamamlandı." });

    const secondsLeft = remainingSeconds(session.created_at, Number(session.duration_seconds ?? 120));
    if (secondsLeft <= 0) {
      await supabaseAdmin.from("tic_tac_toe_sessions").update({ completed: true, completed_at: new Date().toISOString() }).eq("id", sessionId).eq("completed", false);
      return NextResponse.json({ ok: true, completed: true, reason: "timeout", score: Number(session.score ?? 0), correctCount: Number(session.correct_count ?? 0), wrongCount: Number(session.wrong_count ?? 0), remainingSeconds: 0 });
    }

    const eventResult = await recordGameSecurityEvent({
      request,
      gameCode: "tic_tac_toe",
      sourceSessionId: sessionId,
      eventType: "answer",
      payload: { rowIndex, columnIndex, playerId },
      maxPerMinute: 50,
    });
    if (!eventResult.allowed) return NextResponse.json({ ok: false, error: "Çok hızlı cevap gönderiyorsun." }, { status: 429 });

    const { data: cellData, error: cellError } = await supabaseAdmin
      .from("tic_tac_toe_cells")
      .select("id, session_id, row_index, column_index, row_type, row_value, column_type, column_value, valid_player_ids, answered, correct, player_id")
      .eq("session_id", sessionId)
      .eq("row_index", rowIndex)
      .eq("column_index", columnIndex)
      .maybeSingle();
    if (cellError) throw cellError;
    if (!cellData) return NextResponse.json({ ok: false, error: "Seçilen hücre bulunamadı." }, { status: 404 });
    const cell = cellData as CellRow;
    if (cell.answered && cell.correct) return NextResponse.json({ ok: false, error: "Bu hücre zaten dolduruldu." }, { status: 409 });

    const { data: usedPlayerCell, error: usedPlayerError } = await supabaseAdmin
      .from("tic_tac_toe_cells")
      .select("id")
      .eq("session_id", sessionId)
      .eq("player_id", playerId)
      .eq("correct", true)
      .limit(1)
      .maybeSingle();
    if (usedPlayerError) throw usedPlayerError;
    if (usedPlayerCell) return NextResponse.json({ ok: false, error: "Bu oyuncuyu bu gridde daha önce kullandın." }, { status: 409 });

    // valid_player_ids artık sadece üretim kalite snapshot'ı olarak kullanılabilir.
    // Doğruluk, oyuncunun gerçek kariyer/milliyet verisinden dinamik kontrol edilir.
    const match = await matchesBothConstraints(
      playerId,
      { type: cell.row_type === "nationality" ? "country" : "club", value: cell.row_value },
      { type: cell.column_type === "nationality" ? "country" : "club", value: cell.column_value },
    );
    const correct = match.matches;
    const now = new Date().toISOString();

    if (!correct) {
      const newWrongCount = Number(session.wrong_count ?? 0) + 1;
      const { error } = await supabaseAdmin.from("tic_tac_toe_sessions").update({ wrong_count: newWrongCount }).eq("id", sessionId).eq("completed", false);
      if (error) throw error;
      return NextResponse.json({
        ok: true,
        correct: false,
        completed: false,
        score: Number(session.score ?? 0),
        scoreDelta: 0,
        correctCount: Number(session.correct_count ?? 0),
        wrongCount: newWrongCount,
        remainingSeconds: secondsLeft,
        cell: { rowIndex, columnIndex, answered: false, correct: false, player: null },
        message: "Yanlış oyuncu. Hücre boş kaldı.",
      });
    }

    const { data: playerData, error: playerError } = await supabaseAdmin
      .from("guess_players")
      .select("player_id, name, nationality, current_club_name, image_url")
      .eq("player_id", playerId)
      .maybeSingle();
    if (playerError) throw playerError;
    if (!playerData) return NextResponse.json({ ok: false, error: "Oyuncu bilgisi bulunamadı." }, { status: 404 });

    const { data: updatedCell, error: cellUpdateError } = await supabaseAdmin
      .from("tic_tac_toe_cells")
      .update({ answered: true, correct: true, player_id: playerId, answered_at: now })
      .eq("id", cell.id)
      .eq("answered", false)
      .select("id")
      .maybeSingle();
    if (cellUpdateError) throw cellUpdateError;
    if (!updatedCell) return NextResponse.json({ ok: false, error: "Bu hücre az önce başka bir cevapla dolduruldu." }, { status: 409 });

    const newCorrectCount = Number(session.correct_count ?? 0) + 1;
    const completed = newCorrectCount >= 9;
    const fullGridBonus = completed ? FULL_GRID_BONUS : 0;
    const newScore = Number(session.score ?? 0) + SCORE_PER_CORRECT + fullGridBonus;
    const sessionUpdate: Record<string, unknown> = { score: newScore, correct_count: newCorrectCount };
    if (completed) Object.assign(sessionUpdate, { completed: true, completed_at: now });

    const { error: sessionUpdateError } = await supabaseAdmin.from("tic_tac_toe_sessions").update(sessionUpdate).eq("id", sessionId).eq("completed", false);
    if (sessionUpdateError) throw sessionUpdateError;

    return NextResponse.json({
      ok: true,
      correct: true,
      completed,
      reason: completed ? "grid_completed" : null,
      score: newScore,
      scoreDelta: SCORE_PER_CORRECT + fullGridBonus,
      fullGridBonus,
      correctCount: newCorrectCount,
      wrongCount: Number(session.wrong_count ?? 0),
      remainingSeconds: secondsLeft,
      cell: {
        rowIndex,
        columnIndex,
        answered: true,
        correct: true,
        player: {
          id: Number(playerData.player_id),
          name: playerData.name,
          nationality: nationalityToDisplayName(playerData.nationality),
          currentClubName: playerData.current_club_name ?? null,
          imageUrl: playerData.image_url ?? null,
        },
      },
      message: completed ? `9/9 tamamlandı! +${FULL_GRID_BONUS} bonus.` : `Doğru! +${SCORE_PER_CORRECT} puan.`,
    });
  } catch (error) {
    console.error("TicTacToe solo answer endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Cevap kontrol edilirken hata oluştu." }, { status: 500 });
  }
}
