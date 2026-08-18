"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

function normalizeKey(value: string) {
  return value
    .toLocaleUpperCase("tr-TR")
    .replace(/İ/g, "I")
    .replace(/Ç/g, "C")
    .replace(/Ğ/g, "G")
    .replace(/Ö/g, "O")
    .replace(/Ş/g, "S")
    .replace(/Ü/g, "U");
}

function findKeyboardButton(label: string) {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
  return buttons.find((button) => !button.disabled && button.textContent?.trim() === label) ?? null;
}

export default function WordlePhysicalKeyboard() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname?.endsWith("/wordle")) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const normalized = normalizeKey(event.key);
      let button: HTMLButtonElement | null = null;

      if (normalized === "ENTER") {
        button = findKeyboardButton("✓");
      } else if (normalized === "BACKSPACE" || normalized === "DELETE") {
        button = findKeyboardButton("⌫");
      } else if (/^[A-Z]$/.test(normalized)) {
        button = findKeyboardButton(normalized);
      }

      if (!button) return;

      event.preventDefault();
      event.stopPropagation();
      button.click();
    }

    // Capture fazında dinliyoruz; sayfadaki eski bubble listener ile çift giriş oluşmasın.
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [pathname]);

  return null;
}
