export const DAILY_GAME_TABLES = {
  guess_the_player:
    "daily_guess_player"

  player_quiz:
    "daily_player_quiz",

  wordle:
    "daily_wordle",
} as const;

export type DailyGameCode =
  keyof typeof DAILY_GAME_TABLES;

export type AdminDailyGameCode =
  | DailyGameCode
  | "tic_tac_toe";

export const DAILY_GAME_LABELS: Record<
  AdminDailyGameCode,
  string
> = {
  guess_the_player:
    "Guess The Player",

  player_quiz:
    "Player Quiz",

  tic_tac_toe:
    "Tic Tac Toe",

  wordle:
    "Wordle",
};

export function isDailyGameCode(
  value: unknown,
): value is DailyGameCode {
  return (
    typeof value ===
      "string" &&
    value in
      DAILY_GAME_TABLES
  );
}

export function isAdminDailyGameCode(
  value: unknown,
): value is AdminDailyGameCode {
  return (
    value ===
      "tic_tac_toe" ||
    isDailyGameCode(
      value,
    )
  );
}