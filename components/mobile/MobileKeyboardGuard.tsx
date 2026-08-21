"use client";

import { useEffect } from "react";

const MOBILE_BREAKPOINT = 768;

function isEditable(element: Element | null): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return Boolean(element && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement));
}

export default function MobileKeyboardGuard() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const viewport = window.visualViewport;
    let focusTimer: number | null = null;

    const updateKeyboardState = () => {
      if (window.innerWidth >= MOBILE_BREAKPOINT) {
        delete document.body.dataset.keyboardOpen;
        return;
      }

      const visibleHeight = viewport?.height ?? window.innerHeight;
      const keyboardOpen = window.innerHeight - visibleHeight > 120;
      document.body.dataset.keyboardOpen = keyboardOpen ? "true" : "false";

      if (keyboardOpen && isEditable(document.activeElement)) {
        if (focusTimer !== null) window.clearTimeout(focusTimer);
        focusTimer = window.setTimeout(() => {
          (document.activeElement as HTMLElement | null)?.scrollIntoView({
            block: "center",
            inline: "nearest",
            behavior: "smooth",
          });
        }, 120);
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      if (window.innerWidth >= MOBILE_BREAKPOINT || !isEditable(event.target as Element | null)) return;
      if (focusTimer !== null) window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(() => {
        (event.target as HTMLElement).scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      }, 180);
    };

    const onFocusOut = () => {
      window.setTimeout(updateKeyboardState, 120);
    };

    viewport?.addEventListener("resize", updateKeyboardState);
    viewport?.addEventListener("scroll", updateKeyboardState);
    window.addEventListener("resize", updateKeyboardState);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    updateKeyboardState();

    return () => {
      viewport?.removeEventListener("resize", updateKeyboardState);
      viewport?.removeEventListener("scroll", updateKeyboardState);
      window.removeEventListener("resize", updateKeyboardState);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      if (focusTimer !== null) window.clearTimeout(focusTimer);
      delete document.body.dataset.keyboardOpen;
    };
  }, []);

  return null;
}
