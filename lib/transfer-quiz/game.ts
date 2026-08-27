import { supabaseAdmin } from "@/lib/supabase/server";

export const TRANSFER_QUIZ_DURATION_SECONDS = 120;
export const TRANSFER_QUIZ_MAX_PASSES = 5;
export const TRANSFER_QUIZ_POINTS_PER_CORRECT = 20;
export const TRANSFER_QUIZ_MIN_SEARCH_LENGTH = 3;

export type TransferDifficulty = "easy" | "medium";

export type TransferQuestion = {
  transferId: number;
  fromClubName: string;
  toClubName: string;
  transferFee: number;
  transferSeason: string | null;
  difficulty: TransferDifficulty;
};

export function difficultyForElapsedSeconds(elapsedSeconds: number): TransferDifficulty {
  if (elapsedSeconds < 100) return "easy";
  return "medium";
}

export function elapsedSecondsFromStartedAt(startedAt: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
}

export function remainingSecondsFromStartedAt(startedAt: string) {
  return Math.max(0, TRANSFER_QUIZ_DURATION_SECONDS - elapsedSecondsFromStartedAt(startedAt));
}

export async function pickNextTransferQuestion(
  difficulty: TransferDifficulty,
  excludedPlayerIds: number[],
): Promise<{ question: TransferQuestion; sourcePlayerId: number } | null> {
  const { data, error } = await supabaseAdmin.rpc("pick_transfer_quiz_question", {
    p_difficulty: difficulty,
    p_excluded_player_ids: excludedPlayerIds,
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;

  return {
    sourcePlayerId: Number(row.source_player_id),
    question: {
      transferId: Number(row.transfer_id),
      fromClubName: String(row.from_club_name),
      toClubName: String(row.to_club_name),
      transferFee: Number(row.transfer_fee),
      transferSeason: row.transfer_season ? String(row.transfer_season) : null,
      difficulty,
    },
  };
}
