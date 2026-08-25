"use client";

import { useEffect } from "react";

export default function ClubClashResultFocus() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-game="club-clash"]');
    if (!root) return;

    let focused = false;

    const applyFinishedState = () => {
      const replayButton = Array.from(root.querySelectorAll("button")).find(
        (button) => button.textContent?.trim() === "Tekrar Oyna",
      );

      if (!replayButton) {
        root.classList.remove("club-clash-finished");
        focused = false;
        return;
      }

      let resultCard: HTMLElement | null = replayButton.parentElement;
      while (
        resultCard &&
        resultCard !== root &&
        !resultCard.textContent?.includes("Maç Bitti")
      ) {
        resultCard = resultCard.parentElement;
      }

      if (!resultCard || resultCard === root) return;

      root.classList.add("club-clash-finished");

      if (!focused) {
        focused = true;
        window.requestAnimationFrame(() => {
          resultCard?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    };

    applyFinishedState();

    const observer = new MutationObserver(applyFinishedState);
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      root.classList.remove("club-clash-finished");
    };
  }, []);

  return (
    <style>{`
      [data-game="club-clash"].club-clash-finished main > div > section {
        display: none;
      }
    `}</style>
  );
}
