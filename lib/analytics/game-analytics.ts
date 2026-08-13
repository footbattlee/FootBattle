import {
  trackEvent,
} from "@/lib/analytics/track-event";

export const GAME_NAMES = {
  WORDLE:
    "wordle",

  GUESS_THE_PLAYER:
    "guess_the_player",

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
} as const;

export async function trackGameStarted(
  gameName: string,
  sessionId?: string | null,
) {
  await trackEvent({
    eventName:
      "game_started",

    gameName,

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
  await trackEvent({
    eventName:
      "game_completed",

    gameName,

    sessionId:
      sessionId ??
      null,

    metadata:
      metadata ??
      {},
  });
}

export async function trackPlayAgain(
  gameName: string,
  sessionId?: string | null,
) {
  await trackEvent({
    eventName:
      "play_again",

    gameName,

    sessionId:
      sessionId ??
      null,
  });
}

export async function trackShared(
  gameName: string,
  sessionId?: string | null,
) {
  await trackEvent({
    eventName:
      "shared",

    gameName,

    sessionId:
      sessionId ??
      null,
  });
}