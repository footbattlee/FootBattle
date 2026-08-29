import {
  trackEvent,
} from "@/lib/analytics/track-event";

export const GAME_NAMES = {
  WORDLE:
    "wordle",

  GUESS_THE_PLAYER:
    "guess_the_player",

  SUPER_LIG_GUESS_THE_PLAYER:
    "super_lig_guess_the_player",

  PLAYER_QUIZ:
    "player_quiz",

  TRANSFER_QUIZ:
    "transfer_quiz",

  TIC_TAC_TOE:
    "tic_tac_toe",

  CLUB_NATION:
    "club_nation",

  CLUB_CLASH:
    "club_clash",

  CAREER_PATH:
    "career_path",

  SHOOTER:
    "shooter",
} as const;

export type GameCompletedDetail = {
  gameName: string;
  sessionId: string | null;
  metadata: Record<string, unknown>;
};

function resolveGameName(gameName: string) {
  if (
    gameName === GAME_NAMES.GUESS_THE_PLAYER &&
    typeof window !== "undefined" &&
    window.location.pathname.includes("/guess-the-player/super-lig")
  ) {
    return GAME_NAMES.SUPER_LIG_GUESS_THE_PLAYER;
  }

  return gameName;
}

export async function trackGameStarted(
  gameName: string,
  sessionId?: string | null,
) {
  const resolvedGameName = resolveGameName(gameName);

  await trackEvent({
    eventName:
      "game_started",

    gameName: resolvedGameName,

    sessionId:
      sessionId ??
      null,
  });
}

export async function trackGameCompleted(
  gameName: string,
  sessionId?: string | null,
  metadata?: Record<
    string,
    unknown
  >,
) {
  const resolvedGameName = resolveGameName(gameName);

  const detail: GameCompletedDetail = {
    gameName: resolvedGameName,
    sessionId: sessionId ?? null,
    metadata: metadata ?? {},
  };

  await trackEvent({
    eventName:
      "game_completed",

    gameName: resolvedGameName,

    sessionId:
      sessionId ??
      null,

    metadata:
      metadata ??
      {},
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<GameCompletedDetail>("footbattle:game-completed", {
        detail,
      }),
    );
  }
}

export async function trackPlayAgain(
  gameName: string,
  sessionId?: string | null,
) {
  const resolvedGameName = resolveGameName(gameName);

  await trackEvent({
    eventName:
      "play_again",

    gameName: resolvedGameName,

    sessionId:
      sessionId ??
      null,
  });
}

export async function trackShared(
  gameName: string,
  sessionId?: string | null,
) {
  const resolvedGameName = resolveGameName(gameName);

  await trackEvent({
    eventName:
      "shared",

    gameName: resolvedGameName,

    sessionId:
      sessionId ??
      null,
  });
}
