import { cookies } from "next/headers";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { generateBalancedTicTacToeGrid } from "@/lib/tic-tac-toe/balanced-grid-generator";
import { type TicTacToeAxisItem } from "@/lib/tic-tac-toe/grid-generator";

export const TIC_TAC_TOE_DUEL_DURATION_SECONDS = 120;
export const TIC_TAC_TOE_SCORE_PER_CORRECT = 10;
export const TIC_TAC_TOE_FULL_GRID_BONUS = 50;

const GUEST_COOKIE_NAME = "footbattle_guest";

export type DuelSide = "challenger" | "opponent";

export type DuelChallenge = {
  id: number;
  invite_token: string;
  game_code: string;
  status: string;
  challenger_user_id: string | null;
  challenger_guest_id: string | null;
  challenger_name: string | null;
  opponent_user_id: string | null;
  opponent_guest_id: string | null;
  opponent_name: string | null;
  challenger_score: number;
  opponent_score: number;
  winner_side: DuelSide | "draw" | null;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string;
};

export type StoredAxis = {
  type: "club" | "nationality";
  value: string;
};

export type StoredGridCell = {
  rowIndex: number;
  columnIndex: number;
  row: StoredAxis;
  column: StoredAxis;
  validPlayerIds: number[];
};

export type DuelRow = {
  id: string;
  challenge_id: number;
  rows: StoredAxis[];
  columns: StoredAxis[];
  grid_cells: StoredGridCell[];
  duration_seconds: number;
  started_at: string;
  challenger_finished_at: string | null;
  opponent_finished_at: string | null;
  finalized_at: string | null;
};

export type DuelAttempt = {
  id: number;
  duel_id: string;
  side: DuelSide;
  row_index: number;
  column_index: number;
  player_id: number;
  correct: boolean;
  answered_at: string;
};

export function sanitizeDuelToken(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 64);
}

export function duelSourceSessionId(duelId: string, side: DuelSide) {
  return `duel:${duelId}:${side}`;
}

export function duelScore(correctCount: number) {
  return (
    correctCount * TIC_TAC_TOE_SCORE_PER_CORRECT +
    (correctCount >= 9 ? TIC_TAC_TOE_FULL_GRID_BONUS : 0)
  );
}

export function duelRemainingSeconds(duel: DuelRow) {
  const started = new Date(duel.started_at).getTime();
  if (Number.isNaN(started)) return TIC_TAC_TOE_DUEL_DURATION_SECONDS;
  const elapsed = Math.floor((Date.now() - started) / 1000);
  return Math.max(0, Number(duel.duration_seconds ?? TIC_TAC_TOE_DUEL_DURATION_SECONDS) - elapsed);
}

function axisFromGrid(item: TicTacToeAxisItem): StoredAxis {
  return { type: item.type, value: item.value };
}

export async function loadTicTacToeChallenge(token: string) {
  const { data, error } = await supabaseAdmin
    .from("guest_challenges")
    .select(`
      id,
      invite_token,
      game_code,
      status,
      challenger_user_id,
      challenger_guest_id,
      challenger_name,
      opponent_user_id,
      opponent_guest_id,
      opponent_name,
      challenger_score,
      opponent_score,
      winner_side,
      started_at,
      completed_at,
      expires_at
    `)
    .eq("invite_token", token)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return data as DuelChallenge;
}

export async function resolveDuelRole(challenge: DuelChallenge) {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const cookieStore = await cookies();
  const guestId = cookieStore.get(GUEST_COOKIE_NAME)?.value ?? null;

  let role: DuelSide | "visitor" = "visitor";
  if (user) {
    if (challenge.challenger_user_id === user.id) role = "challenger";
    else if (challenge.opponent_user_id === user.id) role = "opponent";
  } else if (guestId) {
    if (challenge.challenger_guest_id === guestId) role = "challenger";
    else if (challenge.opponent_guest_id === guestId) role = "opponent";
  }

  return { role, user, guestId };
}

export async function requireTicTacToeParticipant(tokenValue: unknown) {
  const token = sanitizeDuelToken(tokenValue);
  if (!token) {
    return { ok: false as const, status: 400, error: "Geçerli düello bulunamadı." };
  }

  const challenge = await loadTicTacToeChallenge(token);
  if (!challenge) {
    return { ok: false as const, status: 404, error: "Düello bulunamadı." };
  }
  if (challenge.game_code !== "tic_tac_toe") {
    return { ok: false as const, status: 409, error: "Bu bağlantı Tic Tac Toe düellosu değil." };
  }

  const identity = await resolveDuelRole(challenge);
  if (identity.role !== "challenger" && identity.role !== "opponent") {
    return { ok: false as const, status: 403, error: "Bu düelloya erişim yetkin yok." };
  }

  return {
    ok: true as const,
    token,
    challenge,
    role: identity.role,
    user: identity.user,
  };
}

async function createSecuritySessions(duel: DuelRow, challenge: DuelChallenge) {
  const expiresAt = new Date(
    new Date(duel.started_at).getTime() + Number(duel.duration_seconds) * 1000,
  ).toISOString();

  const rows = (["challenger", "opponent"] as DuelSide[]).map((side) => ({
    game_code: "tic_tac_toe",
    source_session_id: duelSourceSessionId(duel.id, side),
    user_id:
      side === "challenger"
        ? challenge.challenger_user_id
        : challenge.opponent_user_id,
    mode: "duel",
    status: "active",
    started_at: duel.started_at,
    expires_at: expiresAt,
    metadata: {
      challenge_id: challenge.id,
      invite_token: challenge.invite_token,
      side,
    },
  }));

  const { error } = await supabaseAdmin
    .from("game_sessions")
    .upsert(rows, { onConflict: "game_code,source_session_id", ignoreDuplicates: true });

  if (error) {
    console.error("Tic Tac Toe duel security session create error:", error);
  }
}

export async function ensureTicTacToeDuel(challenge: DuelChallenge) {
  const existingResult = await supabaseAdmin
    .from("tic_tac_toe_duels")
    .select("id, challenge_id, rows, columns, grid_cells, duration_seconds, started_at, challenger_finished_at, opponent_finished_at, finalized_at")
    .eq("challenge_id", challenge.id)
    .maybeSingle();

  if (existingResult.error) throw existingResult.error;
  if (existingResult.data) {
    const duel = existingResult.data as DuelRow;
    await createSecuritySessions(duel, challenge);
    return duel;
  }

  const grid = await generateBalancedTicTacToeGrid();
  if (!grid || grid.rows.length !== 3 || grid.columns.length !== 3 || grid.cells.length !== 9) {
    throw new Error("Düello için geçerli Tic Tac Toe grid'i oluşturulamadı.");
  }

  const rows = grid.rows.map(axisFromGrid);
  const columns = grid.columns.map(axisFromGrid);
  const cells: StoredGridCell[] = grid.cells.map((cell) => ({
    rowIndex: cell.rowIndex,
    columnIndex: cell.columnIndex,
    row: axisFromGrid(cell.row),
    column: axisFromGrid(cell.column),
    validPlayerIds: cell.validPlayerIds.map(Number),
  }));

  const startedAt = challenge.started_at ?? new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("tic_tac_toe_duels")
    .insert({
      challenge_id: challenge.id,
      rows,
      columns,
      grid_cells: cells,
      duration_seconds: TIC_TAC_TOE_DUEL_DURATION_SECONDS,
      started_at: startedAt,
    })
    .select("id, challenge_id, rows, columns, grid_cells, duration_seconds, started_at, challenger_finished_at, opponent_finished_at, finalized_at")
    .maybeSingle();

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      const retry = await supabaseAdmin
        .from("tic_tac_toe_duels")
        .select("id, challenge_id, rows, columns, grid_cells, duration_seconds, started_at, challenger_finished_at, opponent_finished_at, finalized_at")
        .eq("challenge_id", challenge.id)
        .single();
      if (retry.error) throw retry.error;
      const duel = retry.data as DuelRow;
      await createSecuritySessions(duel, challenge);
      return duel;
    }
    throw error;
  }
  if (!data) throw new Error("Tic Tac Toe düello kaydı oluşturulamadı.");

  const duel = data as DuelRow;
  await createSecuritySessions(duel, challenge);
  return duel;
}

export async function getDuelAttempts(duelId: string) {
  const { data, error } = await supabaseAdmin
    .from("tic_tac_toe_duel_attempts")
    .select("id, duel_id, side, row_index, column_index, player_id, correct, answered_at")
    .eq("duel_id", duelId)
    .order("answered_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DuelAttempt[];
}

export function sideStats(attempts: DuelAttempt[], side: DuelSide) {
  const mine = attempts.filter((attempt) => attempt.side === side);
  const correct = mine.filter((attempt) => attempt.correct);
  return {
    correctCount: correct.length,
    wrongCount: mine.length - correct.length,
    score: duelScore(correct.length),
    correct,
  };
}

function completionMs(duel: DuelRow, side: DuelSide) {
  const finish =
    side === "challenger" ? duel.challenger_finished_at : duel.opponent_finished_at;
  if (!finish) return Number.POSITIVE_INFINITY;
  return Math.max(0, new Date(finish).getTime() - new Date(duel.started_at).getTime());
}

export async function maybeFinalizeDuel(
  duel: DuelRow,
  challenge: DuelChallenge,
  attempts?: DuelAttempt[],
) {
  if (duel.finalized_at || challenge.status === "completed") return challenge;

  const allAttempts = attempts ?? (await getDuelAttempts(duel.id));
  const challenger = sideStats(allAttempts, "challenger");
  const opponent = sideStats(allAttempts, "opponent");
  const timedOut = duelRemainingSeconds(duel) <= 0;
  const bothFinished = challenger.correctCount >= 9 && opponent.correctCount >= 9;

  if (!timedOut && !bothFinished) return challenge;

  let winner: DuelSide | "draw" = "draw";
  if (challenger.score !== opponent.score) {
    winner = challenger.score > opponent.score ? "challenger" : "opponent";
  } else if (challenger.wrongCount !== opponent.wrongCount) {
    winner = challenger.wrongCount < opponent.wrongCount ? "challenger" : "opponent";
  } else {
    const challengerMs = completionMs(duel, "challenger");
    const opponentMs = completionMs(duel, "opponent");
    if (challengerMs !== opponentMs) {
      winner = challengerMs < opponentMs ? "challenger" : "opponent";
    }
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await supabaseAdmin
    .from("guest_challenges")
    .update({
      status: "completed",
      challenger_score: challenger.score,
      opponent_score: opponent.score,
      winner_side: winner,
      completed_at: now,
      updated_at: now,
    })
    .eq("id", challenge.id)
    .neq("status", "completed")
    .select(`
      id, invite_token, game_code, status,
      challenger_user_id, challenger_guest_id, challenger_name,
      opponent_user_id, opponent_guest_id, opponent_name,
      challenger_score, opponent_score, winner_side,
      started_at, completed_at, expires_at
    `)
    .maybeSingle();

  if (error) throw error;

  await supabaseAdmin
    .from("tic_tac_toe_duels")
    .update({ finalized_at: now, updated_at: now })
    .eq("id", duel.id)
    .is("finalized_at", null);

  const elapsedMs = Math.max(0, Math.min(
    Number(duel.duration_seconds) * 1000,
    Date.now() - new Date(duel.started_at).getTime(),
  ));

  for (const side of ["challenger", "opponent"] as DuelSide[]) {
    const stats = side === "challenger" ? challenger : opponent;
    const won = winner === side;
    await supabaseAdmin
      .from("game_sessions")
      .update({
        status: "finished",
        finished_at: now,
        server_score: stats.score,
        won,
        duration_ms: elapsedMs,
        updated_at: now,
      })
      .eq("game_code", "tic_tac_toe")
      .eq("source_session_id", duelSourceSessionId(duel.id, side))
      .eq("status", "active");
  }

  return (updated ?? {
    ...challenge,
    status: "completed",
    challenger_score: challenger.score,
    opponent_score: opponent.score,
    winner_side: winner,
    completed_at: now,
  }) as DuelChallenge;
}
