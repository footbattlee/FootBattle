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
  return type === "text" || type === "search";
}

function normalize(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/đ/g, "d")
    .replace(/ð/g, "d")
    .replace(/ł/g, "l")
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9\s'-]/g, "")
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

function isExactNameOrToken(button: HTMLButtonElement, typed: string) {
  const text = normalize(button.textContent ?? "");
  if (!text || !typed) return false;
  if (text === typed) return true;

  const tokens = text.split(" ").filter(Boolean);
  if (tokens.includes(typed)) return true;

  // Çok kelimeli girişlerde de kelime sınırlarına göre tam eşleşmeyi kabul et.
  return (` ${text} `).includes(` ${typed} `);
}

function getUniqueExactResult(input: HTMLInputElement, buttons: HTMLButtonElement[]) {
  const typed = normalize(input.value);
  if (!typed) return null;
  const matches = buttons.filter((button) => isExactNameOrToken(button, typed));
  return matches.length === 1 ? matches[0] : null;
}

function getSubmitButton(input: HTMLInputElement) {
  const area = getSearchArea(input);
  if (!area) return null;

  const candidates = Array.from(area.querySelectorAll<HTMLButtonElement>("button"));

  const explicitSubmit = candidates.find(
    (button) => !button.disabled && button.type === "submit" && !button.closest("div.absolute"),
  );
  if (explicitSubmit) return explicitSubmit;

  return (
    candidates.find((button) => {
      if (button.disabled || !isVisible(button) || button.closest("div.absolute")) return false;
      const text = normalize(button.textContent ?? "");
      if (/pas|pass|vazgec|cancel|geri|back|yenile|refresh|tekrar/.test(text)) return false;
      const classes = button.className || "";
      const likelyPrimary =
        classes.includes("bg-green") ||
        classes.includes("bg-yellow") ||
        classes.includes("bg-blue") ||
        classes.includes("w-full");
      const likelyAction = /tahmin|guess|kontrol|check|gonder|submit|cevap|answer|sec|select|onay|confirm/.test(text);
      return likelyPrimary && likelyAction;
    }) ?? null
  );
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

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTextInput(event.target)) return;
      const input = event.target;
      const resultButtons = getResultButtons(input);

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (!resultButtons.length) return;
        event.preventDefault();
        const current = resultButtons.findIndex((button) => button.dataset.keyboardActive === "1");
        const next = event.key === "ArrowDown"
          ? (current < 0 ? 0 : (current + 1) % resultButtons.length)
          : (current < 0 ? resultButtons.length - 1 : (current - 1 + resultButtons.length) % resultButtons.length);
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
      const exact = getUniqueExactResult(input, resultButtons);
      const selectable = highlighted ?? exact;

      // Kısmi metin (örn. "osi") hiçbir zaman otomatik seçim yapmaz.
      // Tam ad veya tam ad/soyad kelimesi eşleşirse ("Icardi", "Dzeko") ve bu eşleşme
      // dropdown içinde tekse Enter seçer ve tahmini yollar.
      if (selectable) {
        selectable.click();
        clearHighlight(resultButtons);
        window.setTimeout(() => {
          getSubmitButton(input)?.click();
        }, 90);
        return;
      }

      // Kullanıcı daha önce dropdown'dan bir değer seçmişse, sonuç listesi kapanır ve
      // ana buton aktif olur. Bu durumda Enter doğrudan tahmini gönderir.
      if (resultButtons.length === 0) {
        getSubmitButton(input)?.click();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, []);

  return null;
}
