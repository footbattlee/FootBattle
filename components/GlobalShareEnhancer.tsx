"use client";

import { useEffect } from "react";

import { createGlobalFootBattleShareCard } from "@/lib/global-share-card";

const FOOTBATTLE_URL_PATTERN =
  /https?:\/\/(?:[^\s/]+\.)?(?:playfootbattle\.com|foot-battle\.vercel\.app)(?:\/[^\s]*)?/i;

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

export default function GlobalShareEnhancer() {
  useEffect(() => {
    if (typeof navigator === "undefined") return;

    const originalShare = navigator.share?.bind(navigator);
    const clipboard = navigator.clipboard;
    const originalWriteText = clipboard?.writeText?.bind(clipboard);

    if (originalShare) {
      try {
        navigator.share = async (data: ShareData) => {
          const nextData: ShareData = { ...data };
          if (shouldEnhanceText(nextData.text)) {
            // Direct share flows (for example duel/challenge invites) already provide
            // the exact destination in `url`. Do not prepend a generic UTM link and
            // accidentally create two competing URLs in WhatsApp/iMessage.
            if (!nextData.url) {
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
          return originalShare(nextData);
        };
      } catch {
        // Some browsers expose navigator.share as read-only.
      }
    }

    if (clipboard && originalWriteText) {
      try {
        clipboard.writeText = async (text: string) => {
          return originalWriteText(shouldEnhanceText(text) ? withFootBattleLink(text) : text);
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
