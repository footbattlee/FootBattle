"use client";

import { useEffect } from "react";

const SEARCH_GAME_PATHS = [
  "/guess-the-player",
  "/player-quiz",
  "/career-path",
  "/club-clash",
  "/club-nation",
  "/transfer-quiz",
  "/tic-tac-toe",
];

function isSupportedGamePage() {
  return SEARCH_GAME_PATHS.some((path) => window.location.pathname.includes(path));
}

function isTextInput(element: EventTarget | null): element is HTMLInputElement {
  if (!(element instanceof HTMLInputElement)) return false;
  const type = (element.type || "text").toLowerCase();
  return type === "text" || type === "search" || type === "number";
}

function normalize(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/\s+/g, " ");
}

function isVisible(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
}

function getSearchArea(input: HTMLInputElement) {
  return (
    input.closest<HTMLElement>("form") ??
    input.closest<HTMLElement>("section") ??
    input.closest<HTMLElement>("article") ??
    input.parentElement
  );
}

function getResultButtons(input: HTMLInputElement) {
  const parent = input.parentElement;
  const area = getSearchArea(input);
  const roots = [parent, area].filter(Boolean) as HTMLElement[];
  const seen = new Set<HTMLButtonElement>();
  const buttons: HTMLButtonElement[] = [];

  for (const root of roots) {
    const candidates = root.querySelectorAll<HTMLButtonElement>(
      "div.absolute button, div[role='listbox'] button, [role='option'], ul button, [data-search-results] button",
    );
    for (const candidate of Array.from(candidates)) {
      if (!(candidate instanceof HTMLButtonElement)) continue;
      if (candidate.disabled || !isVisible(candidate) || seen.has(candidate)) continue;
      seen.add(candidate);
      buttons.push(candidate);
    }
  }

  return buttons;
}

function getExactResult(input: HTMLInputElement, buttons: HTMLButtonElement[]) {
  const typed = normalize(input.value);
  if (!typed) return null;

  return (
    buttons.find((button) => {
      const text = normalize(button.textContent ?? "");
      return text === typed || text.startsWith(`${typed} `) || text.startsWith(`${typed}\n`);
    }) ?? null
  );
}

function getSubmitButton(input: HTMLInputElement) {
  const area = getSearchArea(input);
  if (!area) return null;

  const candidates = Array.from(area.querySelectorAll<HTMLButtonElement>("button"));

  const explicitSubmit = candidates.find(
    (button) => !button.disabled && button.type === "submit" && !button.closest("div.absolute"),
  );
  if (explicitSubmit) return explicitSubmit;

  const primary = candidates.find((button) => {
    if (button.disabled || !isVisible(button) || button.closest("div.absolute")) return false;
    const text = normalize(button.textContent ?? "");
    if (/pas|pass|vazgeç|cancel|geri|back|yenile|refresh|tekrar/.test(text)) return false;
    const classes = button.className || "";
    const likelyPrimary =
      classes.includes("bg-green") ||
      classes.includes("bg-yellow") ||
      classes.includes("bg-blue") ||
      classes.includes("w-full");
    const likelyAction = /tahmin|guess|kontrol|check|gönder|submit|cevap|answer|seç|select|onay|confirm/.test(text);
    return likelyPrimary && likelyAction;
  });

  return primary ?? null;
}

function setHighlighted(buttons: HTMLButtonElement[], index: number) {
  buttons.forEach((button, buttonIndex) => {
    if (buttonIndex === index) {
      button.dataset.keyboardActive = "1";
      button.style.outline = "2px solid rgba(74, 222, 128, .8)";
      button.style.outlineOffset = "-2px";
      button.scrollIntoView({ block: "nearest" });
    } else {
      delete button.dataset.keyboardActive;
      button.style.outline = "";
      button.style.outlineOffset = "";
    }
  });
}

function clearHighlight(buttons: HTMLButtonElement[]) {
  buttons.forEach((button) => {
    delete button.dataset.keyboardActive;
    button.style.outline = "";
    button.style.outlineOffset = "";
  });
}

export default function GuessThePlayerSearchEnhancer() {
  useEffect(() => {
    if (!isSupportedGamePage()) return;

    let scheduled = 0;
    let autoSelecting = false;

    const autoSelectSingleResult = (input?: HTMLInputElement | null) => {
      window.clearTimeout(scheduled);
      scheduled = window.setTimeout(() => {
        const activeInput = input ?? (document.activeElement instanceof HTMLInputElement ? document.activeElement : null);
        if (!activeInput || !isTextInput(activeInput) || activeInput.value.trim().length < 2 || autoSelecting) return;

        const resultButtons = getResultButtons(activeInput);
        if (resultButtons.length !== 1) return;

        autoSelecting = true;
        resultButtons[0].click();
        window.setTimeout(() => {
          autoSelecting = false;
        }, 120);
      }, 45);
    };

    const observer = new MutationObserver(() => autoSelectSingleResult());
    observer.observe(document.body, { childList: true, subtree: true });

    const onInput = (event: Event) => {
      if (!isTextInput(event.target)) return;
      autoSelectSingleResult(event.target);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTextInput(event.target)) return;
      const input = event.target;
      const resultButtons = getResultButtons(input);

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (!resultButtons.length) return;
        event.preventDefault();
        const current = resultButtons.findIndex((button) => button.dataset.keyboardActive === "1");
        let next = 0;
        if (event.key === "ArrowDown") next = current < 0 ? 0 : (current + 1) % resultButtons.length;
        else next = current < 0 ? resultButtons.length - 1 : (current - 1 + resultButtons.length) % resultButtons.length;
        setHighlighted(resultButtons, next);
        return;
      }

      if (event.key === "Escape") {
        clearHighlight(resultButtons);
        return;
      }

      if (event.key !== "Enter") return;

      event.preventDefault();

      const highlighted = resultButtons.find((button) => button.dataset.keyboardActive === "1");
      const exact = getExactResult(input, resultButtons);
      const selectable = highlighted ?? exact ?? (resultButtons.length === 1 ? resultButtons[0] : null);

      if (selectable) {
        selectable.click();
        clearHighlight(resultButtons);
        window.setTimeout(() => {
          getSubmitButton(input)?.click();
        }, 90);
        return;
      }

      // If the game has already selected a value, its main action button is enabled.
      // Enter should submit directly without forcing the user to touch the dropdown again.
      getSubmitButton(input)?.click();
    };

    document.addEventListener("input", onInput, true);
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.clearTimeout(scheduled);
    };
  }, []);

  return null;
}
