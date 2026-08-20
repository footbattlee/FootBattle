import { NextResponse } from "next/server";

import { matchesBothConstraints } from "@/lib/challenges/player-matcher";
import { footballLocaleFromRequest, nationalityToDisplayName } from "@/lib/football/localization";
import { recordGameSecurityEvent } from "@/lib/game-security/server";
import {
  duelRemainingSeconds,
  duelSourceSessionId,
  ensureTicTacToeDuel,
  getDuelAttempts,
  maybeFinalizeDuel,
  requireTicTacToeParticipant,
  sideStats,
  type DuelSide,
} from "@/lib/tic-tac-toe/duel-server";
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
    if (!access.ok) {
      return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
    }

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

    if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex > 2) {
      return NextResponse.json({ ok: false, error: "Geçersiz satır." }, { status: 400 });
    }
    if (!Number.isInteger(columnIndex) || columnIndex < 0 || columnIndex > 2) {
      return NextResponse.json({ ok: false, error: "Geçersiz sütun." }, { status: 400 });
    }
    if (!Number.isInteger(playerId) || playerId <= 0) {
      return NextResponse.json({ ok: false, error: "Geçerli bir oyuncu seçmelisin." }, { status: 400 });
    }

    const duel = await ensureTicTacToeDuel(access.challenge);
    let attempts = await getDuelAttempts(duel.id);

    if (duelRemainingSeconds(duel) <= 0) {
      await maybeFinalizeDuel(duel, access.challenge, attempts);
      return NextResponse.json({ ok: false, completed: true, error: "Süre doldu." }, { status: 409 });
    }

    const side = access.role as DuelSide;
    const current = sideStats(attempts, side);
    if (current.correctCount >= 9) {
      return NextResponse.json({ ok: false, completed: true, error: "Gridini zaten tamamladın." }, { status: 409 });
    }

    const security = await recordGameSecurityEvent({
      request,
      gameCode: "tic_tac_toe",
      sourceSessionId: duelSourceSessionId(duel.id, side),
      eventType: "duel_answer",
      payload: { rowIndex, columnIndex, playerId },
      maxPerMinute: 45,
    });

    if (!security.allowed) {
      return NextResponse.json({ ok: false, error: "Çok hızlı cevap gönderiyorsun." }, { status: 429 });
    }

    const alreadySolved = current.correct.some(
      (attempt) => Number(attempt.row_index) === rowIndex && Number(attempt.column_index) === columnIndex,
    );
    if (alreadySolved) {
      return NextResponse.json({ ok: false, error: "Bu hücreyi zaten doldurdun." }, { status: 409 });
    }

    const alreadyUsedPlayer = current.correct.some((attempt) => Number(attempt.player_id) === playerId);
    if (alreadyUsedPlayer) {
      return NextResponse.json({ ok: false, error: "Bu oyuncuyu bu gridde daha önce kullandın." }, { status: 409 });
    }

    const cell = duel.grid_cells.find(
      (item) => Number(item.rowIndex) === rowIndex && Number(item.columnIndex) === columnIndex,
    );
    if (!cell) {
      return NextResponse.json({ ok: false, error: "Seçilen hücre bulunamadı." }, { status: 404 });
    }

    // validPlayerIds geçmişte popularity tabanlı üretildiği için eski gridlerde eksik olabilir.
    // Doğruluğu her zaman oyuncunun güncel kariyer/milliyet verisine göre kontrol et.
    const match = await matchesBothConstraints(
      playerId,
      {
        type: cell.row.type === "nationality" ? "country" : "club",
        value: cell.row.value,
      },
      {
        type: cell.column.type === "nationality" ? "country" : "club",
        value: cell.column.value,
      },
    );
    const correct = match.matches;
    const now = new Date().toISOString();

    const { error: insertError } = await supabaseAdmin
      .from("tic_tac_toe_duel_attempts")
      .insert({
        duel_id: duel.id,
        side,
        row_index: rowIndex,
        column_index: columnIndex,
        player_id: playerId,
        correct,
        answered_at: now,
      });

    if (insertError) {
      if ((insertError as { code?: string }).code === "23505") {
        return NextResponse.json(
          { ok: false, error: "Bu hücre veya oyuncu az önce kullanıldı." },
          { status: 409 },
        );
      }
      throw insertError;
    }

    if (!correct) {
      attempts = await getDuelAttempts(duel.id);
      const stats = sideStats(attempts, side);
      return NextResponse.json({
        ok: true,
        correct: false,
        completed: false,
        score: stats.score,
        correctCount: stats.correctCount,
        wrongCount: stats.wrongCount,
        remainingSeconds: duelRemainingSeconds(duel),
        message: locale === "en" ? "Wrong player. The cell stays empty." : "Yanlış oyuncu. Hücre boş kaldı.",
      });
    }

    const { data: player, error: playerError } = await supabaseAdmin
      .from("guess_players")
      .select("player_id, name, nationality, current_club_name, image_url")
      .eq("player_id", playerId)
      .maybeSingle();
    if (playerError) throw playerError;

    attempts = await getDuelAttempts(duel.id);
    const stats = sideStats(attempts, side);

    if (stats.correctCount >= 9) {
      const finishField = side === "challenger" ? "challenger_finished_at" : "opponent_finished_at";
      const updateData: Record<string, unknown> = { updated_at: now };
      updateData[finishField] = now;
      await supabaseAdmin
        .from("tic_tac_toe_duels")
        .update(updateData)
        .eq("id", duel.id)
        .is(finishField, null);
    }

    const { data: refreshedDuel } = await supabaseAdmin
      .from("tic_tac_toe_duels")
      .select("id, challenge_id, rows, columns, grid_cells, duration_seconds, started_at, challenger_finished_at, opponent_finished_at, finalized_at")
      .eq("id", duel.id)
      .single();

    const finalDuel = (refreshedDuel ?? duel) as typeof duel;
    const finalizedChallenge = await maybeFinalizeDuel(finalDuel, access.challenge, attempts);

    return NextResponse.json({
      ok: true,
      correct: true,
      completed: finalizedChallenge.status === "completed",
      score: stats.score,
      correctCount: stats.correctCount,
      wrongCount: stats.wrongCount,
      remainingSeconds: finalizedChallenge.status === "completed" ? 0 : duelRemainingSeconds(finalDuel),
      player: player
        ? {
            id: Number(player.player_id),
            name: player.name,
            nationality: nationalityToDisplayName(player.nationality, locale),
            currentClubName: player.current_club_name ?? null,
            imageUrl: player.image_url ?? null,
          }
        : { id: playerId, name: locale === "en" ? "Player" : "Oyuncu", nationality: null, currentClubName: null, imageUrl: null },
      message: stats.correctCount >= 9
        ? (locale === "en" ? "9/9! Grid complete." : "9/9! Grid tamamlandı.")
        : (locale === "en" ? "Correct! +10 points." : "Doğru! +10 puan."),
    });
  } catch (error) {
    console.error("Tic Tac Toe duel answer error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Cevap kontrol edilemedi." },
      { status: 500 },
    );
  }
}
