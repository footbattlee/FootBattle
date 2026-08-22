import { NextResponse } from "next/server";

import { footballLocaleFromRequest, localizeFootballAxisValue, nationalityToDisplayName } from "@/lib/football/localization";
import { runRankedTicTacToeBotTick, syncRankedMatchCompletion } from "@/lib/ranked/shared-engine";
import {
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
  turnRemainingSeconds,
} from "@/lib/tic-tac-toe/turn-duel";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const locale = footballLocaleFromRequest(request);
    const { token } = await context.params;
    const access = await requireTicTacToeParticipant(token);
    if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: access.status });

    let challenge = access.challenge;
    if (challenge.status !== "playing" && challenge.status !== "completed") {
      return NextResponse.json(
        { ok: false, error: "Düello henüz başlamadı.", challengeStatus: challenge.status },
        { status: 409 },
      );
    }

    if (challenge.status === "playing") {
      await runRankedTicTacToeBotTick(challenge);
    }

    const duel = await ensureTicTacToeDuel(challenge);
    const attempts = await getDuelAttempts(duel.id);

    if (challenge.status !== "completed") {
      const winner = getWinningSide(attempts);
      if (winner) {
        await finalizeTurnDuel(challenge, winner);
        await syncRankedMatchCompletion(challenge.invite_token, winner);
        challenge = { ...challenge, status: "completed", winner_side: winner };
      } else if (boardIsFull(attempts)) {
        await finalizeTurnDuel(challenge, "draw");
        await syncRankedMatchCompletion(challenge.invite_token, "draw");
        challenge = { ...challenge, status: "completed", winner_side: "draw" };
      }
    } else {
      await syncRankedMatchCompletion(challenge.invite_token, challenge.winner_side);
    }

    let turn = await ensureTurnState(duel.id);
    if (challenge.status !== "completed") turn = await normalizeExpiredTurn(duel.id, turn);

    const playerIds = Array.from(
      new Set(attempts.filter((attempt) => attempt.correct).map((attempt) => Number(attempt.player_id))),
    );
    const { data: playerRows, error: playerError } = playerIds.length
      ? await supabaseAdmin
          .from("guess_players")
          .select("player_id, name, nationality, current_club_name, image_url")
          .in("player_id", playerIds)
      : { data: [], error: null };
    if (playerError) throw playerError;

    const playerMap = new Map(
      (playerRows ?? []).map((player) => [
        Number(player.player_id),
        {
          id: Number(player.player_id),
          name: player.name,
          nationality: nationalityToDisplayName(player.nationality, locale),
          currentClubName: player.current_club_name ?? null,
          imageUrl: player.image_url ?? null,
        },
      ]),
    );

    const cells = attempts
      .filter((attempt) => attempt.correct)
      .map((attempt) => ({
        rowIndex: Number(attempt.row_index),
        columnIndex: Number(attempt.column_index),
        ownerSide: attempt.side as DuelSide,
        player: playerMap.get(Number(attempt.player_id)) ?? {
          id: Number(attempt.player_id),
          name: locale === "en" ? "Player" : "Oyuncu",
          nationality: null,
          currentClubName: null,
          imageUrl: null,
        },
      }));

    const mySide = access.role as DuelSide;
    const completed = challenge.status === "completed";
    const result = completed
      ? challenge.winner_side === "draw"
        ? "draw"
        : challenge.winner_side === mySide
          ? "win"
          : "loss"
      : null;

    return NextResponse.json({
      ok: true,
      role: mySide,
      completed,
      result,
      winnerSide: challenge.winner_side,
      currentTurn: completed ? null : turn.currentTurn,
      isMyTurn: !completed && turn.currentTurn === mySide,
      turnRemainingSeconds: completed ? 0 : turnRemainingSeconds(turn.turnStartedAt),
      drawOfferBy: completed ? null : turn.drawOfferBy,
      game: {
        code: "tic_tac_toe",
        label: locale === "en" ? "Football Tic Tac Toe Duel" : "Futbol Tic Tac Toe Düello",
        turnSeconds: 60,
        mode: "three_in_a_row",
      },
      challenge: {
        id: Number(challenge.id),
        token: challenge.invite_token,
        status: challenge.status,
        challenger: {
          name: challenge.challenger_name ?? (locale === "en" ? "FootBattle Player" : "FootBattle Oyuncusu"),
          score: challenge.winner_side === "challenger" ? 1 : 0,
        },
        opponent: {
          name: challenge.opponent_name ?? (locale === "en" ? "FootBattle Player" : "FootBattle Oyuncusu"),
          score: challenge.winner_side === "opponent" ? 1 : 0,
        },
      },
      grid: {
        rows: duel.rows.map((item, index) => ({
          index,
          type: item.type,
          value: localizeFootballAxisValue(item.type, item.value, locale),
        })),
        columns: duel.columns.map((item, index) => ({
          index,
          type: item.type,
          value: localizeFootballAxisValue(item.type, item.value, locale),
        })),
        cells,
      },
    });
  } catch (error) {
    console.error("Tic Tac Toe duel state error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Düello durumu okunamadı." },
      { status: 500 },
    );
  }
}
