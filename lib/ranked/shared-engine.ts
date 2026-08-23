import { supabaseAdmin } from "@/lib/supabase/server";
import {
  ensureTicTacToeDuel,
  getDuelAttempts,
  type DuelChallenge,
} from "@/lib/tic-tac-toe/duel-server";
import {
  boardIsFull,
  ensureTurnState,
  finalizeTurnDuel,
  getWinningSide,
} from "@/lib/tic-tac-toe/turn-duel";

function stableDelayMs(seed: string, min = 3500, spread = 4500) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return min + (hash % spread);
}

async function getBotRankedMatch(token: string) {
  const { data, error } = await supabaseAdmin
    .from("ranked_matches")
    .select("id,game_code,status,player_a_id,player_b_id,opponent_kind,challenge_token")
    .eq("challenge_token", token)
    .eq("opponent_kind", "bot")
    .in("status", ["ready", "active"])
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function syncRankedMatchCompletion(token: string, winnerSide: "challenger" | "opponent" | "draw" | null) {
  const { data: match, error } = await supabaseAdmin.from("ranked_matches").select("id,player_a_id,player_b_id,status").eq("challenge_token", token).maybeSingle();
  if (error || !match || match.status === "completed") return;
  const winnerUserId = winnerSide === "challenger" ? match.player_a_id : winnerSide === "opponent" ? match.player_b_id : null;
  const now = new Date().toISOString();
  await supabaseAdmin.from("ranked_matches").update({ status: "completed", winner_user_id: winnerUserId, completed_at: now, updated_at: now }).eq("id", match.id).neq("status", "completed");
}

export async function runRankedTicTacToeBotTick(challenge: DuelChallenge) {
  if (challenge.status !== "playing") return false;
  const match = await getBotRankedMatch(challenge.invite_token);
  if (!match || match.game_code !== "tic_tac_toe") return false;
  const duel = await ensureTicTacToeDuel(challenge);
  const turn = await ensureTurnState(duel.id);
  if (turn.currentTurn !== "opponent") return false;
  const elapsed = Date.now() - new Date(turn.turnStartedAt).getTime();
  if (elapsed < stableDelayMs(`${match.id}:${turn.turnStartedAt}`)) return false;
  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabaseAdmin.from("tic_tac_toe_duels").update({ current_turn: "challenger", turn_started_at: now, draw_offer_by: null, updated_at: now }).eq("id", duel.id).eq("current_turn", "opponent").eq("turn_started_at", turn.turnStartedAt).select("id").maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) return false;
  let attempts = await getDuelAttempts(duel.id);
  const occupied = new Set(attempts.filter((a) => a.correct).map((a) => `${Number(a.row_index)}:${Number(a.column_index)}`));
  const emptyCells = duel.grid_cells.filter((cell) => !occupied.has(`${Number(cell.rowIndex)}:${Number(cell.columnIndex)}`) && cell.validPlayerIds.length > 0);
  if (emptyCells.length === 0) {
    if (boardIsFull(attempts)) { await finalizeTurnDuel(challenge, "draw"); await syncRankedMatchCompletion(challenge.invite_token, "draw"); }
    return true;
  }
  const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const playerId = Number(cell.validPlayerIds[Math.floor(Math.random() * cell.validPlayerIds.length)]);
  const { error: insertError } = await supabaseAdmin.from("tic_tac_toe_duel_attempts").insert({ duel_id: duel.id, side: "opponent", row_index: Number(cell.rowIndex), column_index: Number(cell.columnIndex), player_id: playerId, correct: true, answered_at: now });
  if (insertError) throw insertError;
  attempts = await getDuelAttempts(duel.id);
  const winner = getWinningSide(attempts);
  if (winner) { await finalizeTurnDuel(challenge, winner); await syncRankedMatchCompletion(challenge.invite_token, winner); }
  else if (boardIsFull(attempts)) { await finalizeTurnDuel(challenge, "draw"); await syncRankedMatchCompletion(challenge.invite_token, "draw"); }
  return true;
}

export async function runRankedClubClashBotTick(token: string) {
  const match = await getBotRankedMatch(token);
  if (!match || match.game_code !== "club_clash") return false;
  const { data: challenge, error: challengeError } = await supabaseAdmin.from("guest_challenges").select("id,status,started_at,winner_side").eq("invite_token", token).maybeSingle();
  if (challengeError) throw challengeError;
  if (!challenge || challenge.status !== "playing") return false;
  const { data: rounds, error: roundsError } = await supabaseAdmin.from("challenge_rounds").select("id,round_no,left_type,left_value,right_type,right_value,winner_side,completed_at,created_at").eq("challenge_id", challenge.id).eq("game_code", "club_clash").order("round_no", { ascending: true });
  if (roundsError) throw roundsError;
  const allRounds = rounds ?? [];
  const current = allRounds.find((r) => !r.completed_at);
  if (!current || current.left_type !== "club" || current.right_type !== "club") return false;
  const previous = [...allRounds].reverse().find((r) => r.completed_at && Number(r.round_no) < Number(current.round_no));
  const roundStartedAt = previous?.completed_at ?? challenge.started_at ?? current.created_at;
  // Bot should feel human and give the player a real chance to search/select first.
  if (Date.now() - new Date(roundStartedAt).getTime() < stableDelayMs(`${match.id}:cc:${current.round_no}`, 9000, 7000)) return false;
  const [{ data: leftRows, error: leftError }, { data: rightRows, error: rightError }] = await Promise.all([
    supabaseAdmin.from("player_quiz_clubs").select("player_id").eq("club_name", current.left_value),
    supabaseAdmin.from("player_quiz_clubs").select("player_id").eq("club_name", current.right_value),
  ]);
  if (leftError) throw leftError;
  if (rightError) throw rightError;
  const rightIds = new Set((rightRows ?? []).map((r) => Number(r.player_id)));
  const sharedIds = (leftRows ?? []).map((r) => Number(r.player_id)).filter((id) => rightIds.has(id));
  if (sharedIds.length === 0) return false;
  const playerId = sharedIds[Math.floor(Math.random() * sharedIds.length)];
  const { data: player } = await supabaseAdmin.from("guess_players").select("name").eq("player_id", playerId).maybeSingle();
  const answer = String(player?.name ?? "Bot Mehmet'in cevabı");
  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabaseAdmin.from("challenge_rounds").update({ winner_side: "opponent", opponent_answer: answer, opponent_answer_player_id: playerId, opponent_answered_at: now, completed_at: now }).eq("id", current.id).is("completed_at", null).select("id").maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) return false;
  const opponentScore = allRounds.filter((r) => r.completed_at && r.winner_side === "opponent").length + 1;
  const challengerScore = allRounds.filter((r) => r.completed_at && r.winner_side === "challenger").length;
  if (opponentScore >= 3) {
    await supabaseAdmin.from("guest_challenges").update({ status: "completed", challenger_score: challengerScore, opponent_score: opponentScore, winner_side: "opponent", completed_at: now, updated_at: now }).eq("id", challenge.id).neq("status", "completed");
    await syncRankedMatchCompletion(token, "opponent");
  } else {
    await supabaseAdmin.from("guest_challenges").update({ challenger_score: challengerScore, opponent_score: opponentScore, updated_at: now }).eq("id", challenge.id).eq("status", "playing");
  }
  return true;
}
