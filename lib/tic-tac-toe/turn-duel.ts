import { supabaseAdmin } from "@/lib/supabase/server";
import type { DuelChallenge, DuelSide, DuelAttempt } from "@/lib/tic-tac-toe/duel-server";

export const TIC_TAC_TOE_TURN_SECONDS = 60;

export type TurnDuelState = {
  currentTurn: DuelSide;
  turnStartedAt: string;
  drawOfferBy: DuelSide | null;
};

export function otherSide(side: DuelSide): DuelSide {
  return side === "challenger" ? "opponent" : "challenger";
}

export function getWinningSide(attempts: DuelAttempt[]): DuelSide | null {
  const winningLines = [
    [[0, 0], [0, 1], [0, 2]],
    [[1, 0], [1, 1], [1, 2]],
    [[2, 0], [2, 1], [2, 2]],
    [[0, 0], [1, 0], [2, 0]],
    [[0, 1], [1, 1], [2, 1]],
    [[0, 2], [1, 2], [2, 2]],
    [[0, 0], [1, 1], [2, 2]],
    [[0, 2], [1, 1], [2, 0]],
  ];

  for (const side of ["challenger", "opponent"] as DuelSide[]) {
    const occupied = new Set(
      attempts
        .filter((attempt) => attempt.correct && attempt.side === side)
        .map((attempt) => `${attempt.row_index}:${attempt.column_index}`),
    );
    if (winningLines.some((line) => line.every(([r, c]) => occupied.has(`${r}:${c}`)))) return side;
  }
  return null;
}

export function boardIsFull(attempts: DuelAttempt[]) {
  const occupied = new Set(
    attempts.filter((attempt) => attempt.correct).map((attempt) => `${attempt.row_index}:${attempt.column_index}`),
  );
  return occupied.size >= 9;
}

export async function ensureTurnState(duelId: string): Promise<TurnDuelState> {
  const { data, error } = await supabaseAdmin
    .from("tic_tac_toe_duels")
    .select("current_turn, turn_started_at, draw_offer_by")
    .eq("id", duelId)
    .single();
  if (error) throw error;

  if (data.current_turn && data.turn_started_at) {
    return {
      currentTurn: data.current_turn as DuelSide,
      turnStartedAt: data.turn_started_at,
      drawOfferBy: (data.draw_offer_by as DuelSide | null) ?? null,
    };
  }

  const currentTurn: DuelSide = Math.random() < 0.5 ? "challenger" : "opponent";
  const turnStartedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("tic_tac_toe_duels")
    .update({ current_turn: currentTurn, turn_started_at: turnStartedAt, draw_offer_by: null, updated_at: turnStartedAt })
    .eq("id", duelId)
    .is("current_turn", null)
    .select("current_turn, turn_started_at, draw_offer_by")
    .maybeSingle();
  if (updateError) throw updateError;

  if (updated?.current_turn && updated?.turn_started_at) {
    return {
      currentTurn: updated.current_turn as DuelSide,
      turnStartedAt: updated.turn_started_at,
      drawOfferBy: (updated.draw_offer_by as DuelSide | null) ?? null,
    };
  }

  return ensureTurnState(duelId);
}

export async function normalizeExpiredTurn(duelId: string, state: TurnDuelState): Promise<TurnDuelState> {
  const elapsed = Math.floor((Date.now() - new Date(state.turnStartedAt).getTime()) / 1000);
  if (elapsed < TIC_TAC_TOE_TURN_SECONDS) return state;

  const next = otherSide(state.currentTurn);
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("tic_tac_toe_duels")
    .update({ current_turn: next, turn_started_at: now, draw_offer_by: null, updated_at: now })
    .eq("id", duelId)
    .eq("current_turn", state.currentTurn)
    .eq("turn_started_at", state.turnStartedAt)
    .select("current_turn, turn_started_at, draw_offer_by")
    .maybeSingle();
  if (error) throw error;

  if (!data) return ensureTurnState(duelId);
  return {
    currentTurn: data.current_turn as DuelSide,
    turnStartedAt: data.turn_started_at,
    drawOfferBy: (data.draw_offer_by as DuelSide | null) ?? null,
  };
}

export function turnRemainingSeconds(turnStartedAt: string) {
  const elapsed = Math.floor((Date.now() - new Date(turnStartedAt).getTime()) / 1000);
  return Math.max(0, TIC_TAC_TOE_TURN_SECONDS - elapsed);
}

export async function passTurn(duelId: string, from: DuelSide) {
  const next = otherSide(from);
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("tic_tac_toe_duels")
    .update({ current_turn: next, turn_started_at: now, draw_offer_by: null, updated_at: now })
    .eq("id", duelId)
    .eq("current_turn", from);
  if (error) throw error;
  return { currentTurn: next, turnStartedAt: now };
}

export async function finalizeTurnDuel(challenge: DuelChallenge, winner: DuelSide | "draw") {
  const now = new Date().toISOString();
  const challengerScore = winner === "challenger" ? 1 : 0;
  const opponentScore = winner === "opponent" ? 1 : 0;

  const { error } = await supabaseAdmin
    .from("guest_challenges")
    .update({
      status: "completed",
      challenger_score: challengerScore,
      opponent_score: opponentScore,
      winner_side: winner,
      completed_at: now,
      updated_at: now,
    })
    .eq("id", challenge.id)
    .neq("status", "completed");
  if (error) throw error;

  await supabaseAdmin
    .from("tic_tac_toe_duels")
    .update({ finalized_at: now, updated_at: now })
    .eq("challenge_id", challenge.id)
    .is("finalized_at", null);
}
