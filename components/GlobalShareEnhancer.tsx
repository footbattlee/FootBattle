"use client";

import { useEffect } from "react";

import { GAME_NAMES, trackShared } from "@/lib/analytics/game-analytics";
import { createGlobalFootBattleShareCard } from "@/lib/global-share-card";

const FOOTBATTLE_URL_PATTERN =
  /https?:\/\/(?:[^\s/]+\.)?(?:playfootbattle\.com|foot-battle\.vercel\.app)(?:\/[^\s]*)?/i;

function isHalisahaShareFlow() {
  return (
    typeof window !== "undefined" &&
    window.location.pathname.includes("/halisaha-kadro")
  );
}

function hasExplicitFootBattleLink(data: ShareData) {
  return (
    typeof data.url === "string" && FOOTBATTLE_URL_PATTERN.test(data.url)
  ) || (
    typeof data.text === "string" && FOOTBATTLE_URL_PATTERN.test(data.text)
  );
}

function hasExplicitFiles(data: ShareData) {
  return Array.isArray(data.files) && data.files.length > 0;
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
      try {
        navigator.share = async (data: ShareData) => {
          // Feature-specific share flows that already provide their own destination
          // and/or image are authoritative. Never inject a second UTM URL and never
          // replace an existing image with the generic FootBattle social card.
          if (
            isHalisahaShareFlow() ||
            hasExplicitFootBattleLink(data) ||
            hasExplicitFiles(data)
          ) {
            const result = await originalShare(data);
            trackTicTacToeDuelResultShare(data.text);
            return result;
          }

          const nextData: ShareData = { ...data };
          if (shouldEnhanceText(nextData.text)) {
            if (!nextData.url && !FOOTBATTLE_URL_PATTERN.test(String(nextData.text ?? ""))) {
              nextData.text = withFootBattleLink(String(nextData.text));
              nextData.url = buildShareUrl();
            }

            try {
              const card = await createGlobalFootBattleShareCard(nextData);
              if (card && navigator.canShare?.({ files: [card] })) {
                nextData.files = [card];
              }
            } catch {
              // PNG card is enhancement-only. Text/link sharing remains available.
            }
          }

          const result = await originalShare(nextData);
          trackTicTacToeDuelResultShare(data.text);
          return result;
        };
      } catch {
        // Some browsers expose navigator.share as read-only.
      }
    }

    if (clipboard && originalWriteText) {
      try {
        clipboard.writeText = async (text: string) => {
          if (isHalisahaShareFlow() || FOOTBATTLE_URL_PATTERN.test(text)) {
            return originalWriteText(text);
          }

          const result = await originalWriteText(shouldEnhanceText(text) ? withFootBattleLink(text) : text);
          trackTicTacToeDuelResultShare(text);
          return result;
        };
      } catch {
        // Clipboard method may be read-only.
      }
    }

    return () => {
      if (originalShare) {
        try { navigator.share = originalShare; } catch { /* noop */ }
      }
      if (clipboard && originalWriteText) {
        try { clipboard.writeText = originalWriteText; } catch { /* noop */ }
      }
    };
  }, []);

  return null;
}
