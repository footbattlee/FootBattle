"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const DUEL_HREF = "/tic-tac-toe/duel";

function homeLocale(pathname: string) {
  if (pathname === "/en") return "en" as const;
  if (pathname === "/" || pathname === "/tr") return "tr" as const;
  return null;
}

export default function HomeTicTacToeDuelEnhancer() {
  const pathname = usePathname();
  const locale = homeLocale(pathname);

  useEffect(() => {
    if (!locale) return;

    const selectors = [
      'a[href="/tic-tac-toe"]',
      'a[href="/tr/tic-tac-toe"]',
      'a[href="/en/tic-tac-toe"]',
    ].join(",");

    const enhance = () => {
      const playLinks = Array.from(
        document.querySelectorAll<HTMLAnchorElement>(selectors),
      );

      for (const playLink of playLinks) {
        const actions = playLink.parentElement;
        if (!actions || actions.querySelector('[data-tic-tac-toe-duel="1"]')) continue;

        const duelLink = document.createElement("a");
        duelLink.href = DUEL_HREF;
        duelLink.dataset.ticTacToeDuel = "1";
        duelLink.textContent = locale === "en" ? "⚔️ Duel" : "⚔️ Düello";
        duelLink.className =
          "rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2.5 text-sm font-black text-purple-300 transition hover:bg-purple-500/20";
        actions.appendChild(duelLink);
      }
    };

    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [locale]);

  return null;
}
