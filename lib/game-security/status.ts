import "server-only";

import type { GameCode } from "@/lib/game-security/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function getGameSecurityStatus(
  gameCode: GameCode,
  sourceSessionId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("game_sessions")
    .select("id, status, suspicion_score, suspicious, score_blocked, server_score, duration_ms")
    .eq("game_code", gameCode)
    .eq("source_session_id", sourceSessionId)
    .maybeSingle();

  if (error) throw error;

  return data
    ? {
        id: String(data.id),
        status: String(data.status),
        suspicionScore: Number(data.suspicion_score ?? 0),
        suspicious: Boolean(data.suspicious),
        scoreBlocked: Boolean(data.score_blocked),
        serverScore: data.server_score === null ? null : Number(data.server_score),
        durationMs: data.duration_ms === null ? null : Number(data.duration_ms),
      }
    : null;
}
