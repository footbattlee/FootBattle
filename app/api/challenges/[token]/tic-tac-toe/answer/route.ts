import { NextResponse } from "next/server";

import { matchesBothConstraints } from "@/lib/challenges/player-matcher";
import { footballLocaleFromRequest, nationalityToDisplayName } from "@/lib/football/localization";
import { recordGameSecurityEvent } from "@/lib/game-security/server";
import {
  duelSourceSessionId,
  ensureTicTacToeDuel,
  getDuelAttempts,
  requireTicTacToeParticipant,
  type DuelSide,
} from "@/lib/tic-tac-toe/duel-server";
import {
  boardIsFull,
  ensureTurnState,
  finalizeTurnDuel,
  getWinningSide,
  normalizeExpiredTurn,
  passTurn,
  turnRemainingSeconds,
} from "@/lib/tic-tac-toe/turn-duel";
import { supabaseAdmin } from "@/lib/supabase/server";

type AnswerBody = {
  rowIndex?: number | string;
  columnIndex?: number | string;
  playerId?: number | string;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const locale = footballLocaleFromRequest(request);
    const { token } = await context.params;
    const access = await requireTicTacToeParticipant(token);
    if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: access.status });

    if (access.challenge.status !== "playing") {
      return NextResponse.json(
        { ok: false, error: access.challenge.status === "completed" ? "Bu düello tamamlandı." : "Düello henüz başlamadı." },
        { status: 409 },
      );
    }

    const body = (await request.json()) as AnswerBody;
    const rowIndex = Number(body.rowIndex);
    const columnIndex = Number(body.columnIndex);
    const playerId = Number(body.playerId);

    if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex > 2) return NextResponse.json({ ok: false, error: "Geçersiz satır." }, { status: 400 });
    if (!Number.isInteger(columnIndex) || columnIndex < 0 || columnIndex > 2) return NextResponse.json({ ok: false, error: "Geçersiz sütun." }, { status: 400 });
    if (!Number.isInteger(playerId) || playerId <= 0) return NextResponse.json({ ok: false, error: "Geçerli bir oyuncu seçmelisin." }, { status: 400 });

    const duel = await ensureTicTacToeDuel(access.challenge);
    const side = access.role as DuelSide;
    let turn = await ensureTurnState(duel.id);
    turn = await normalizeExpiredTurn(duel.id, turn);

    if (turn.currentTurn !== side) {
      return NextResponse.json({
        ok: false,
        error: locale === "en" ? "It is not your turn." : "Sıra rakibinde.",
        currentTurn: turn.currentTurn,
        turnRemainingSeconds: turnRemainingSeconds(turn.turnStartedAt),
      }, { status: 409 });
    }

    let attempts = await getDuelAttempts(duel.id);
    const occupied = attempts.some(
      (attempt) => attempt.correct && Number(attempt.row_index) === rowIndex && Number(attempt.column_index) === columnIndex,
    );
    if (occupied) return NextResponse.json({ ok: false, error: "Bu hücre zaten dolu." }, { status: 409 });

    const security = await recordGameSecurityEvent({
      request,
      gameCode: "tic_tac_toe",
      sourceSessionId: duelSourceSessionId(duel.id, side),
      eventType: "duel_answer",
      payload: { rowIndex, columnIndex, playerId },
      maxPerMinute: 20,
    });
    if (!security.allowed) return NextResponse.json({ ok: false, error: "Çok hızlı cevap gönderiyorsun." }, { status: 429 });

    const cell = duel.grid_cells.find(
      (item) => Number(item.rowIndex) === rowIndex && Number(item.columnIndex) === columnIndex,
    );
    if (!cell) return NextResponse.json({ ok: false, error: "Seçilen hücre bulunamadı." }, { status: 404 });

    const match = await matchesBothConstraints(
      playerId,
      { type: cell.row.type === "nationality" ? "country" : "club", value: cell.row.value },
      { type: cell.column.type === "nationality" ? "country" : "club", value: cell.column.value },
    );
    const correct = match.matches;
    const now = new Date().toISOString();

    const { error: insertError } = await supabaseAdmin
      .from("tic_tac_toe_duel_attempts")
      .insert({ duel_id: duel.id, side, row_index: rowIndex, column_index: columnIndex, player_id: playerId, correct, answered_at: now });
    if (insertError) throw insertError;

    attempts = await getDuelAttempts(duel.id);

    if (correct) {
      const winner = getWinningSide(attempts);
      if (winner) {
        await finalizeTurnDuel(access.challenge, winner);
        return NextResponse.json({
          ok: true,
          correct: true,
          completed: true,
          winnerSide: winner,
          message: locale === "en" ? "Three in a row! You won." : "Üçlü tamamlandı! Kazandın.",
        });
      }

      if (boardIsFull(attempts)) {
        await finalizeTurnDuel(access.challenge, "draw");
        return NextResponse.json({
          ok: true,
          correct: true,
          completed: true,
          winnerSide: "draw",
          message: locale === "en" ? "Board is full. Draw." : "Tahta doldu. Berabere.",
        });
      }
    }

    const nextTurn = await passTurn(duel.id, side);

    const { data: player, error: playerError } = await supabaseAdmin
      .from("guess_players")
      .select("player_id, name, nationality, current_club_name, image_url")
      .eq("player_id", playerId)
      .maybeSingle();
    if (playerError) throw playerError;

    return NextResponse.json({
      ok: true,
      correct,
      completed: false,
      currentTurn: nextTurn.currentTurn,
      turnRemainingSeconds: 60,
      player: player
        ? {
            id: Number(player.player_id),
            name: player.name,
            nationality: nationalityToDisplayName(player.nationality, locale),
            currentClubName: player.current_club_name ?? null,
            imageUrl: player.image_url ?? null,
          }
        : null,
      message: correct
        ? (locale === "en" ? "Correct. The cell is yours; turn passed." : "Doğru. Hücre senin; sıra rakibe geçti.")
        : (locale === "en" ? "Wrong player. Cell stays empty; turn passed." : "Yanlış oyuncu. Hücre boş kaldı; sıra rakibe geçti."),
    });
  } catch (error) {
    console.error("Tic Tac Toe duel answer error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Cevap kontrol edilemedi." },
      { status: 500 },
    );
  }
}
