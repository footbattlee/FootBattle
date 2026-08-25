"use client";

import { useEffect } from "react";

import { GAME_NAMES, trackShared } from "@/lib/analytics/game-analytics";
import { createGlobalFootBattleShareCard } from "@/lib/global-share-card";

declare global {
  interface Window {
    __footbattleNativeShare?: (data: ShareData) => Promise<void>;
  }
}

const FOOTBATTLE_URL_PATTERN =
  /https?:\/\/(?:[^\s/]+\.)?(?:playfootbattle\.com|foot-battle\.vercel\.app)(?:\/[^\s]*)?/i;

function isHalisahaShareFlow() {
  return (
    typeof window !== "undefined" &&
    window.location.pathname.includes("/halisaha-kadro")
  );
}

function buildShareUrl() {
  if (typeof window === "undefined") return "";

  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set("utm_source", "share");
  url.searchParams.set("utm_medium", "organic");
  url.searchParams.set("utm_campaign", "footbattle_result_v2");
  return url.toString();
}

function shouldEnhanceText(text: unknown) {
  return typeof text === "string" && /footbattle/i.test(text);
}

function withFootBattleLink(text: string) {
  const shareUrl = buildShareUrl();
  if (!shareUrl || FOOTBATTLE_URL_PATTERN.test(text)) return text;
  return `${text.trim()}\n\n⚽ Hemen oyna: ${shareUrl}`;
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

    const originalShare = navigator.share?.bind(navigator);
    const clipboard = navigator.clipboard;
    const originalWriteText = clipboard?.writeText?.bind(clipboard);

    if (originalShare) {
      window.__footbattleNativeShare = originalShare;

      try {
        navigator.share = async (data: ShareData) => {
          if (isHalisahaShareFlow()) {
            return originalShare(data);
          }

          const nextData: ShareData = { ...data };
          const hasOwnLink =
            (typeof nextData.url === "string" && FOOTBATTLE_URL_PATTERN.test(nextData.url)) ||
            (typeof nextData.text === "string" && FOOTBATTLE_URL_PATTERN.test(nextData.text));
          const hasOwnFiles = Array.isArray(nextData.files) && nextData.files.length > 0;

          if (!hasOwnLink && !hasOwnFiles && shouldEnhanceText(nextData.text)) {
            nextData.text = withFootBattleLink(String(nextData.text));
            nextData.url = buildShareUrl();

            try {
              const card = await createGlobalFootBattleShareCard(nextData);
              if (card && navigator.canShare?.({ files: [card] })) {
                nextData.files = [card];
              }
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
          if (isHalisahaShareFlow() || FOOTBATTLE_URL_PATTERN.test(text)) {
            return originalWriteText(text);
          }

          const result = await originalWriteText(
            shouldEnhanceText(text) ? withFootBattleLink(text) : text,
          );
          trackTicTacToeDuelResultShare(text);
          return result;
        };
      } catch {
        // Clipboard method may be read-only.
      }
    }

    return () => {
      if (originalShare) {
        try {
          navigator.share = originalShare;
        } catch {
          // noop
        }
      }
      delete window.__footbattleNativeShare;

      if (clipboard && originalWriteText) {
        try {
          clipboard.writeText = originalWriteText;
        } catch {
          // noop
        }
      }
    };
  }, []);

  return null;
}
