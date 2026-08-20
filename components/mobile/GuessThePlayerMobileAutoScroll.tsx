"use client";

import { useEffect } from "react";

const MOBILE_BREAKPOINT = 768;
const GUESS_ID_PREFIX = "mobile-guess-";

function guessNumber(element: Element) {
  const value = element.id.slice(GUESS_ID_PREFIX.length);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function GuessThePlayerMobileAutoScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let lastHandledGuess = 0;
    let scrollTimer: number | null = null;

    const scrollToLatestGuess = () => {
      if (window.innerWidth >= MOBILE_BREAKPOINT) return;

      const cards = Array.from(
        document.querySelectorAll<HTMLElement>(`[id^="${GUESS_ID_PREFIX}"]`),
      );
      if (cards.length === 0) return;

      const latest = cards.reduce((current, candidate) =>
        guessNumber(candidate) > guessNumber(current) ? candidate : current,
      );
      const latestNumber = guessNumber(latest);

      if (latestNumber <= lastHandledGuess) return;
      lastHandledGuess = latestNumber;

      if (scrollTimer !== null) window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        latest.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }, 80);
    };

    const observer = new MutationObserver((mutations) => {
      const hasNewGuessCard = mutations.some((mutation) =>
        Array.from(mutation.addedNodes).some((node) => {
          if (!(node instanceof Element)) return false;
          if (node.id.startsWith(GUESS_ID_PREFIX)) return true;
          return Boolean(node.querySelector(`[id^="${GUESS_ID_PREFIX}"]`));
        }),
      );

      if (hasNewGuessCard) scrollToLatestGuess();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (scrollTimer !== null) window.clearTimeout(scrollTimer);
    };
  }, []);

  return null;
}
