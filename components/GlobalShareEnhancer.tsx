"use client";

import { useEffect } from "react";

const FOOTBATTLE_URL_PATTERN = /https?:\/\/[^\s]*foot-battle\.vercel\.app|https?:\/\/footbattle[^\s]*/i;

function buildShareUrl() {
  if (typeof window === "undefined") return "";

  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set("utm_source", "share");
  url.searchParams.set("utm_medium", "organic");
  url.searchParams.set("utm_campaign", "footbattle_result");
  return url.toString();
}

function shouldEnhanceText(text: unknown) {
  return (
    typeof text === "string" &&
    /footbattle/i.test(text) &&
    !FOOTBATTLE_URL_PATTERN.test(text)
  );
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
            nextData.text = withFootBattleLink(String(nextData.text));
            if (!nextData.url) nextData.url = buildShareUrl();
          }

          return originalShare(nextData);
        };
      } catch {
        // Bazı tarayıcılarda navigator.share salt okunur olabilir.
      }
    }

    if (clipboard && originalWriteText) {
      try {
        clipboard.writeText = async (text: string) => {
          return originalWriteText(
            shouldEnhanceText(text) ? withFootBattleLink(text) : text,
          );
        };
      } catch {
        // Clipboard metodu salt okunursa mevcut davranışı koru.
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
