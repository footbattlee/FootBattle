"use client";

import { useEffect } from "react";

function getGameRoot() {
  return document.querySelector<HTMLElement>(
    '[data-game="guess-the-player"], [data-game="guess-the-player-super-lig"]',
  );
}

function getSearchInput(root: HTMLElement) {
  const inputs = Array.from(root.querySelectorAll<HTMLInputElement>("input"));
  return inputs.find((input) => input.type === "text" || input.type === "search" || !input.type) ?? inputs[0] ?? null;
}

function getResultButtons(input: HTMLInputElement) {
  const wrapper = input.parentElement;
  if (!wrapper) return [];
  return Array.from(wrapper.querySelectorAll<HTMLButtonElement>("div.absolute button"));
}

function getSubmitButton(input: HTMLInputElement) {
  const section = input.closest("section");
  if (!section) return null;

  return (
    Array.from(section.querySelectorAll<HTMLButtonElement>("button")).find((button) => {
      if (button.disabled) return false;
      if (button.closest("div.absolute")) return false;
      const classes = button.className || "";
      return classes.includes("bg-green-500") && classes.includes("w-full");
    }) ?? null
  );
}

export default function GuessThePlayerSearchEnhancer() {
  useEffect(() => {
    if (!window.location.pathname.includes("/guess-the-player")) return;

    let autoSelecting = false;
    let scheduled = 0;

    const enhance = () => {
      window.clearTimeout(scheduled);
      scheduled = window.setTimeout(() => {
        const root = getGameRoot();
        if (!root) return;
        const input = getSearchInput(root);
        if (!input || input.value.trim().length < 3 || autoSelecting) return;

        const resultButtons = getResultButtons(input);
        if (resultButtons.length !== 1) return;

        autoSelecting = true;
        resultButtons[0].click();
        window.setTimeout(() => {
          autoSelecting = false;
        }, 120);
      }, 40);
    };

    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });

    const onInput = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      const root = getGameRoot();
      if (!root || !root.contains(target)) return;
      enhance();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;

      const root = getGameRoot();
      if (!root || !root.contains(target)) return;

      event.preventDefault();

      const resultButtons = getResultButtons(target);
      if (resultButtons.length === 1) {
        resultButtons[0].click();
        window.setTimeout(() => {
          getSubmitButton(target)?.click();
        }, 80);
        return;
      }

      getSubmitButton(target)?.click();
    };

    document.addEventListener("input", onInput, true);
    document.addEventListener("keydown", onKeyDown, true);
    enhance();

    return () => {
      observer.disconnect();
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.clearTimeout(scheduled);
    };
  }, []);

  return null;
}
