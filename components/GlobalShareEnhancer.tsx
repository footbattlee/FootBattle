"use client";

import { useEffect } from "react";

import { GAME_NAMES, trackShared, type GameCompletedDetail } from "@/lib/analytics/game-analytics";
import { createGlobalFootBattleShareCard } from "@/lib/global-share-card";

declare global {
  interface Window {
    __footbattleNativeShare?: (data: ShareData) => Promise<void>;
  }
}

const FOOTBATTLE_URL_PATTERN =
  /https?:\/\/(?:[^\s/]+\.)?(?:playfootbattle\.com|foot-battle\.vercel\.app)(?:\/[^\s]*)?/i;

const SOLO_GAME_PATH_PATTERN =
  /^\/(?:tr\/|en\/)?(?:wordle|guess-the-player(?:\/super-lig)?|career-path|tic-tac-toe|player-quiz|transfer-quiz|club-nation|club-clash)\/?$/i;

function isHalisahaShareFlow() {
  return (
    typeof window !== "undefined" &&
    window.location.pathname.includes("/halisaha-kadro")
  );
}

function isSoloGameShareFlow() {
  if (typeof window === "undefined") return false;
  if (/\/duel\//i.test(window.location.pathname)) return false;
  return SOLO_GAME_PATH_PATTERN.test(window.location.pathname);
}

function buildShareUrl(challengeId?: string | null) {
  if (typeof window === "undefined") return "";

  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set("utm_source", "share");
  url.searchParams.set("utm_medium", "organic");
  url.searchParams.set("utm_campaign", "footbattle_result_v2");
  if (challengeId && isSoloGameShareFlow()) url.searchParams.set("challenge", challengeId);
  return url.toString();
}

function shouldEnhanceText(text: unknown) {
  return typeof text === "string" && /footbattle/i.test(text);
}

function withFootBattleLink(text: string, challengeId?: string | null) {
  const shareUrl = buildShareUrl(challengeId);
  if (!shareUrl || FOOTBATTLE_URL_PATTERN.test(text)) return text;
  return `${text.trim()}\n\n⚽ Hemen oyna: ${shareUrl}`;
}

function withChallengeOnOwnUrl(rawUrl: string, challengeId?: string | null) {
  if (!challengeId || !isSoloGameShareFlow()) return rawUrl;
  try {
    const url = new URL(rawUrl, window.location.origin);
    if (!FOOTBATTLE_URL_PATTERN.test(url.toString())) return rawUrl;
    url.pathname = window.location.pathname;
    url.searchParams.set("challenge", challengeId);
    url.searchParams.set("utm_source", url.searchParams.get("utm_source") ?? "share");
    return url.toString();
  } catch {
    return rawUrl;
  }
}

function withChallengeInText(text: string, challengeId?: string | null) {
  if (!challengeId || !isSoloGameShareFlow()) return text;
  return text.replace(FOOTBATTLE_URL_PATTERN, (match) => withChallengeOnOwnUrl(match, challengeId));
}

function trackTicTacToeDuelResultShare(text: unknown) {
  if (typeof window === "undefined" || typeof text !== "string") return;
  if (!/^\/tic-tac-toe\/duel\/[^/]+/.test(window.location.pathname)) return;
  if (!/Tic Tac Toe düellosu:/i.test(text)) return;

  const token = window.location.pathname.match(/^\/tic-tac-toe\/duel\/([^/]+)/)?.[1] ?? null;
  void trackShared(GAME_NAMES.TIC_TAC_TOE, token ? `duel:${token}` : null);
}

export default function GlobalShareEnhancer() {
  useEffect(() => {
    if (typeof navigator === "undefined") return;

    let latestCompleted: Pick<GameCompletedDetail, "gameName" | "sessionId"> | null = null;
    const onCompleted = (event: Event) => {
      const detail = (event as CustomEvent<GameCompletedDetail>).detail;
      if (!detail?.gameName || !detail.sessionId) return;
      latestCompleted = { gameName: detail.gameName, sessionId: detail.sessionId };
    };
    window.addEventListener("footbattle:game-completed", onCompleted);

    const originalShare = navigator.share?.bind(navigator);
    const clipboard = navigator.clipboard;
    const originalWriteText = clipboard?.writeText?.bind(clipboard);

    if (originalShare) {
      window.__footbattleNativeShare = originalShare;

      try {
        navigator.share = async (data: ShareData) => {
          if (isHalisahaShareFlow()) return originalShare(data);

          const challengeId = latestCompleted?.sessionId ?? null;
          const nextData: ShareData = { ...data };

          if (typeof nextData.url === "string" && FOOTBATTLE_URL_PATTERN.test(nextData.url)) {
            nextData.url = withChallengeOnOwnUrl(nextData.url, challengeId);
          }
          if (typeof nextData.text === "string" && FOOTBATTLE_URL_PATTERN.test(nextData.text)) {
            nextData.text = withChallengeInText(nextData.text, challengeId);
          }

          const hasOwnLink =
            (typeof nextData.url === "string" && FOOTBATTLE_URL_PATTERN.test(nextData.url)) ||
            (typeof nextData.text === "string" && FOOTBATTLE_URL_PATTERN.test(nextData.text));
          const hasOwnFiles = Array.isArray(nextData.files) && nextData.files.length > 0;

          if (!hasOwnLink && !hasOwnFiles && shouldEnhanceText(nextData.text)) {
            nextData.text = withFootBattleLink(String(nextData.text), challengeId);
            nextData.url = buildShareUrl(challengeId);

            try {
              const card = await createGlobalFootBattleShareCard(nextData);
              if (card && navigator.canShare?.({ files: [card] })) nextData.files = [card];
            } catch {
              // Enhancement only.
            }
          }

          const result = await originalShare(nextData);
          trackTicTacToeDuelResultShare(data.text);
          return result;
        };
      } catch {
        // navigator.share can be read-only on some browsers.
      }
    }

    if (clipboard && originalWriteText) {
      try {
        clipboard.writeText = async (text: string) => {
          if (isHalisahaShareFlow()) return originalWriteText(text);

          const challengeId = latestCompleted?.sessionId ?? null;
          let nextText = text;
          if (FOOTBATTLE_URL_PATTERN.test(nextText)) nextText = withChallengeInText(nextText, challengeId);
          else if (shouldEnhanceText(nextText)) nextText = withFootBattleLink(nextText, challengeId);

          const result = await originalWriteText(nextText);
          trackTicTacToeDuelResultShare(text);
          return result;
        };
      } catch {
        // Clipboard method may be read-only.
      }
    }

    return () => {
      window.removeEventListener("footbattle:game-completed", onCompleted);
      if (originalShare) {
        try { navigator.share = originalShare; } catch { /* noop */ }
      }
      delete window.__footbattleNativeShare;
      if (clipboard && originalWriteText) {
        try { clipboard.writeText = originalWriteText; } catch { /* noop */ }
      }
    };
  }, []);

  return null;
}
