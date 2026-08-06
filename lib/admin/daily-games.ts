export const DAILY_GAME_TABLES = {
  wordle: "daily_wordle",
  guess_the_player: "daily_guess_player",
  player_quiz: "daily_player_quiz",
  career_path: "daily_career_path",
} as const;

export type DailyGameCode = keyof typeof DAILY_GAME_TABLES;

export const DAILY_GAME_LABELS: Record<DailyGameCode, string> = {
  wordle: "Wordle",
  guess_the_player: "Guess the Player",
  player_quiz: "Player Quiz",
  career_path: "Career Path",
};

export function isDailyGameCode(value: unknown): value is DailyGameCode {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(DAILY_GAME_TABLES, value)
  );
}
