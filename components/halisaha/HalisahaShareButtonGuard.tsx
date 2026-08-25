"use client";

import { useEffect } from "react";

export default function HalisahaShareButtonGuard() {
  useEffect(() => {
    if (window.location.pathname !== "/halisaha-kadro") return;

    const install = () => {
      if (window.innerWidth >= 1280) return;

      const actions = document.querySelector<HTMLElement>("[data-hal-mobile-actions='true']");
      const quickShare = actions?.querySelector<HTMLButtonElement>("button");
      if (!quickShare) return;

      const header = document.querySelector("main header");
      const headerShare = header
        ? Array.from(header.querySelectorAll<HTMLButtonElement>("button")).find(
            (button) => button.textContent?.trim() === "⚽ Paylaş",
          )
        : undefined;

      if (!headerShare || headerShare.dataset.shareGuard === "true") return;

      headerShare.dataset.shareGuard = "true";

      const guard = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        quickShare.click();
      };

      headerShare.addEventListener("click", guard, true);

      return () => {
        headerShare.removeEventListener("click", guard, true);
        delete headerShare.dataset.shareGuard;
      };
    };

    let cleanup = install();
    const timer = window.setInterval(() => {
      if (!cleanup) cleanup = install();
    }, 300);

    return () => {
      window.clearInterval(timer);
      cleanup?.();
    };
  }, []);

  return null;
}
