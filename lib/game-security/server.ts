import "server-only";

import { checkRateLimit, getRequestFingerprint } from "@/lib/server/simple-rate-limit";
import { supabaseAdmin } from "@/lib/supabase/server";

export type GameCode =
  | "wordle"
  | "guess_the_player"
  | "player_quiz"
  | "transfer_quiz"
  | "career_path"
  | "tic_tac_toe"
  | "club_nation"
  | "club_clash";

type JsonObject = Record<string, unknown>;

type SecuritySessionRow = {
  id: string;
  game_code: GameCode;
  source_session_id: string;
  user_id: string | null;
  mode: string;
  status: "active" | "finished" | "abandoned" | "rejected";
  started_at: string;
  expires_at: string | null;
  finished_at: string | null;
  server_score: number | null;
  won: boolean | null;
  duration_ms: number | null;
  suspicion_score: number;
  suspicious: boolean;
  score_blocked: boolean;
  client_fingerprint: string | null;
  metadata: JsonObject | null;
};

export type FinishSecurityRules = {
  minScore?: number;
  maxScore?: number;
  expectedScore?: number;
  minDurationMs?: number;
  maxDurationMs?: number;
  clientDurationMs?: number | null;
  requireEvents?: boolean;
  extraFlags?: Array<{
    reason: string;
    points: number;
    details?: JsonObject;
  }>;
};

function safeIso(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

async function findSecuritySession(gameCode: GameCode, sourceSessionId: string) {
  const { data, error } = await supabaseAdmin
    .from("game_sessions")
    .select(`
      id,
      game_code,
      source_session_id,
      user_id,
      mode,
      status,
      started_at,
      expires_at,
      finished_at,
      server_score,
      won,
      duration_ms,
      suspicion_score,
      suspicious,
      score_blocked,
      client_fingerprint,
      metadata
    `)
    .eq("game_code", gameCode)
    .eq("source_session_id", sourceSessionId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as SecuritySessionRow | null;
}

async function addSecurityFlags(
  session: SecuritySessionRow,
  flags: Array<{ reason: string; points: number; details?: JsonObject }>,
  userId?: string | null,
) {
  if (!flags.length) return;

  const rows = flags.map((flag) => ({
    game_session_id: session.id,
    game_code: session.game_code,
    source_session_id: session.source_session_id,
    user_id: userId ?? session.user_id ?? null,
    reason: flag.reason,
    points: Math.max(0, Math.floor(flag.points)),
    details: flag.details ?? {},
  }));

  const { error } = await supabaseAdmin.from("game_security_events").insert(rows);
  if (error) console.error("Game security flag insert error:", error);
}

export async function startGameSecuritySession(input: {
  request: Request;
  gameCode: GameCode;
  sourceSessionId: string;
  userId?: string | null;
  mode?: string;
  startedAt?: string | Date | null;
  expiresAt?: string | Date | null;
  metadata?: JsonObject;
}) {
  const sourceSessionId = input.sourceSessionId.trim();
  if (!sourceSessionId) throw new Error("Security source session id eksik.");

  const fingerprint = getRequestFingerprint(input.request);
  const startLimit = checkRateLimit(`game-start:${input.gameCode}:${fingerprint}`, {
    limit: 30,
    windowMs: 60_000,
  });

  if (!startLimit.allowed) {
    throw new Error("Çok hızlı yeni oyun başlatıyorsun. Biraz sonra tekrar dene.");
  }

  const row = {
    game_code: input.gameCode,
    source_session_id: sourceSessionId,
    user_id: input.userId ?? null,
    mode: input.mode ?? "solo",
    status: "active",
    started_at: safeIso(input.startedAt) ?? new Date().toISOString(),
    expires_at: safeIso(input.expiresAt),
    client_fingerprint: fingerprint,
    metadata: input.metadata ?? {},
  };

  const { data, error } = await supabaseAdmin
    .from("game_sessions")
    .insert(row)
    .select(`
      id,
      game_code,
      source_session_id,
      user_id,
      mode,
      status,
      started_at,
      expires_at,
      finished_at,
      server_score,
      won,
      duration_ms,
      suspicion_score,
      suspicious,
      score_blocked,
      client_fingerprint,
      metadata
    `)
    .maybeSingle();

  if (error) {
    // Retry-safe: the native game session can only have one universal ledger row.
    if (error.code === "23505") {
      const existing = await findSecuritySession(input.gameCode, sourceSessionId);
      if (existing) return existing;
    }
    throw error;
  }

  return data as SecuritySessionRow;
}

export async function recordGameSecurityEvent(input: {
  request: Request;
  gameCode: GameCode;
  sourceSessionId: string;
  eventType: string;
  payload?: JsonObject;
  maxPerMinute?: number;
}) {
  const session = await findSecuritySession(input.gameCode, input.sourceSessionId);
  if (!session) throw new Error("Security game session bulunamadı.");

  if (session.status !== "active") {
    return { allowed: false, session, reason: "session_finished" as const };
  }

  const fingerprint = getRequestFingerprint(input.request);
  const rate = checkRateLimit(
    `game-event:${session.id}:${fingerprint}`,
    { limit: input.maxPerMinute ?? 90, windowMs: 60_000 },
  );

  if (!rate.allowed) {
    const flags = [
      {
        reason: "event_rate_limit",
        points: 60,
        details: { eventType: input.eventType },
      },
    ];
    await addSecurityFlags(session, flags);
    await supabaseAdmin
      .from("game_sessions")
      .update({
        suspicion_score: Number(session.suspicion_score ?? 0) + 60,
        suspicious: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);
    return { allowed: false, session, reason: "rate_limit" as const };
  }

  const { error } = await supabaseAdmin.from("game_session_events").insert({
    game_session_id: session.id,
    event_type: input.eventType,
    payload: input.payload ?? {},
  });
  if (error) throw error;

  return { allowed: true, session, reason: null };
}

export async function getGameSecurityEvents(
  gameCode: GameCode,
  sourceSessionId: string,
  eventType?: string,
) {
  const session = await findSecuritySession(gameCode, sourceSessionId);
  if (!session) return { session: null, events: [] as Array<{ id: number; event_type: string; payload: JsonObject; created_at: string }> };

  let query = supabaseAdmin
    .from("game_session_events")
    .select("id, event_type, payload, created_at")
    .eq("game_session_id", session.id)
    .order("id", { ascending: true });

  if (eventType) query = query.eq("event_type", eventType);

  const { data, error } = await query;
  if (error) throw error;

  return {
    session,
    events: (data ?? []) as Array<{
      id: number;
      event_type: string;
      payload: JsonObject;
      created_at: string;
    }>,
  };
}

export async function finishGameSecuritySession(input: {
  request: Request;
  gameCode: GameCode;
  sourceSessionId: string;
  userId?: string | null;
  score: number;
  won?: boolean | null;
  metadata?: JsonObject;
  rules?: FinishSecurityRules;
}) {
  const session = await findSecuritySession(input.gameCode, input.sourceSessionId);
  if (!session) throw new Error("Security game session bulunamadı.");

  if (session.user_id && input.userId && session.user_id !== input.userId) {
    await addSecurityFlags(
      session,
      [{ reason: "user_mismatch", points: 100, details: { finishingUserId: input.userId } }],
      input.userId,
    );
    throw new Error("Bu oyun oturumu başka bir kullanıcıya ait.");
  }

  if (session.status === "finished") {
    return {
      session,
      alreadyFinished: true,
      suspicious: session.suspicious,
      suspicionScore: session.suspicion_score,
      scoreBlocked: session.score_blocked,
    };
  }

  const fingerprint = getRequestFingerprint(input.request);
  const finishRate = checkRateLimit(`game-finish:${session.id}:${fingerprint}`, {
    limit: 8,
    windowMs: 60_000,
  });

  const now = Date.now();
  const startedMs = new Date(session.started_at).getTime();
  const elapsedMs = Math.max(0, now - startedMs);
  const rules = input.rules ?? {};
  const flags: Array<{ reason: string; points: number; details?: JsonObject }> = [
    ...(rules.extraFlags ?? []),
  ];

  if (!finishRate.allowed) {
    flags.push({ reason: "finish_rate_limit", points: 80 });
  }

  if (!Number.isFinite(input.score)) {
    flags.push({ reason: "invalid_score", points: 100, details: { score: input.score } });
  } else {
    if (rules.minScore !== undefined && input.score < rules.minScore) {
      flags.push({ reason: "score_below_min", points: 100, details: { score: input.score, min: rules.minScore } });
    }
    if (rules.maxScore !== undefined && input.score > rules.maxScore) {
      flags.push({ reason: "score_above_max", points: 100, details: { score: input.score, max: rules.maxScore } });
    }
    if (rules.expectedScore !== undefined && input.score !== rules.expectedScore) {
      flags.push({ reason: "score_mismatch", points: 100, details: { score: input.score, expected: rules.expectedScore } });
    }
  }

  if (rules.minDurationMs !== undefined && elapsedMs < rules.minDurationMs) {
    flags.push({ reason: "duration_too_short", points: 50, details: { elapsedMs, minDurationMs: rules.minDurationMs } });
  }

  if (rules.maxDurationMs !== undefined && elapsedMs > rules.maxDurationMs) {
    flags.push({ reason: "duration_too_long", points: 25, details: { elapsedMs, maxDurationMs: rules.maxDurationMs } });
  }

  if (rules.clientDurationMs !== undefined && rules.clientDurationMs !== null) {
    const clientDurationMs = Math.max(0, Math.floor(rules.clientDurationMs));
    const toleranceMs = Math.max(10_000, Math.floor(elapsedMs * 0.35));
    if (Math.abs(clientDurationMs - elapsedMs) > toleranceMs) {
      flags.push({
        reason: "client_server_duration_mismatch",
        points: 25,
        details: { clientDurationMs, serverDurationMs: elapsedMs, toleranceMs },
      });
    }
  }

  if (rules.requireEvents) {
    const { count, error } = await supabaseAdmin
      .from("game_session_events")
      .select("id", { count: "exact", head: true })
      .eq("game_session_id", session.id);
    if (error) throw error;
    if (!count) flags.push({ reason: "missing_game_events", points: 80 });
  }

  const newPoints = flags.reduce((sum, flag) => sum + Math.max(0, Math.floor(flag.points)), 0);
  const suspicionScore = Number(session.suspicion_score ?? 0) + newPoints;
  const suspicious = suspicionScore > 0;
  const scoreBlocked = suspicionScore >= 100;
  const finishedAt = new Date(now).toISOString();

  const mergedMetadata = {
    ...(session.metadata ?? {}),
    ...(input.metadata ?? {}),
  };

  const { data: finished, error: finishError } = await supabaseAdmin
    .from("game_sessions")
    .update({
      user_id: session.user_id ?? input.userId ?? null,
      status: scoreBlocked ? "rejected" : "finished",
      finished_at: finishedAt,
      server_score: Number.isFinite(input.score) ? Math.floor(input.score) : null,
      won: input.won ?? null,
      duration_ms: elapsedMs,
      suspicion_score: suspicionScore,
      suspicious,
      score_blocked: scoreBlocked,
      metadata: mergedMetadata,
      updated_at: finishedAt,
    })
    .eq("id", session.id)
    .eq("status", "active")
    .select(`
      id,
      game_code,
      source_session_id,
      user_id,
      mode,
      status,
      started_at,
      expires_at,
      finished_at,
      server_score,
      won,
      duration_ms,
      suspicion_score,
      suspicious,
      score_blocked,
      client_fingerprint,
      metadata
    `)
    .maybeSingle();

  if (finishError) throw finishError;

  if (!finished) {
    const latest = await findSecuritySession(input.gameCode, input.sourceSessionId);
    if (!latest) throw new Error("Security session sonucu okunamadı.");
    return {
      session: latest,
      alreadyFinished: true,
      suspicious: latest.suspicious,
      suspicionScore: latest.suspicion_score,
      scoreBlocked: latest.score_blocked,
    };
  }

  await addSecurityFlags(finished as SecuritySessionRow, flags, input.userId);

  return {
    session: finished as SecuritySessionRow,
    alreadyFinished: false,
    suspicious,
    suspicionScore,
    scoreBlocked,
  };
}
