import { NextResponse } from "next/server";

import { footballLocaleFromRequest, localizeFootballAxisValue, nationalityToDisplayName } from "@/lib/football/localization";
import {
  ensureTicTacToeDuel,
  getDuelAttempts,
  maybeFinalizeDuel,
  requireTicTacToeParticipant,
  sideStats,
  duelRemainingSeconds,
  type DuelSide,
} from "@/lib/tic-tac-toe/duel-server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(
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

    let challenge = access.challenge;
    if (challenge.status !== "playing" && challenge.status !== "completed") {
      return NextResponse.json(
        { ok: false, error: "Düello henüz başlamadı.", challengeStatus: challenge.status },
        { status: 409 },
      );
    }

    const duel = await ensureTicTacToeDuel(challenge);
    const attempts = await getDuelAttempts(duel.id);
    challenge = await maybeFinalizeDuel(duel, challenge, attempts);

    const mySide = access.role as DuelSide;
    const opponentSide: DuelSide = mySide === "challenger" ? "opponent" : "challenger";
    const me = sideStats(attempts, mySide);
    const opponent = sideStats(attempts, opponentSide);

    const playerIds = Array.from(new Set(me.correct.map((attempt) => Number(attempt.player_id))));
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

    const myCells = me.correct.map((attempt) => ({
      rowIndex: Number(attempt.row_index),
      columnIndex: Number(attempt.column_index),
      player: playerMap.get(Number(attempt.player_id)) ?? {
        id: Number(attempt.player_id),
        name: locale === "en" ? "Player" : "Oyuncu",
        nationality: null,
        currentClubName: null,
        imageUrl: null,
      },
    }));

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
      remainingSeconds: completed ? 0 : duelRemainingSeconds(duel),
      game: {
        code: "tic_tac_toe",
        label: locale === "en" ? "Football Tic Tac Toe Duel" : "Futbol Tic Tac Toe Düello",
        durationSeconds: Number(duel.duration_seconds),
        scorePerCorrect: 10,
        fullGridBonus: 50,
      },
      challenge: {
        id: Number(challenge.id),
        token: challenge.invite_token,
        status: challenge.status,
        challenger: {
          name: challenge.challenger_name ?? (locale === "en" ? "FootBattle Player" : "FootBattle Oyuncusu"),
          score: Number(challenge.challenger_score ?? 0),
        },
        opponent: {
          name: challenge.opponent_name ?? (locale === "en" ? "FootBattle Player" : "FootBattle Oyuncusu"),
          score: Number(challenge.opponent_score ?? 0),
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
        cells: myCells,
      },
      me: {
        side: mySide,
        score: me.score,
        correctCount: me.correctCount,
        wrongCount: me.wrongCount,
      },
      opponent: {
        side: opponentSide,
        score: opponent.score,
        correctCount: opponent.correctCount,
        wrongCount: opponent.wrongCount,
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
