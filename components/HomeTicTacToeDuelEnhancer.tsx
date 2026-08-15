"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const DUEL_HREF = "/tic-tac-toe/duel";

export default function HomeTicTacToeDuelEnhancer() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;

    const enhance = () => {
      const playLinks = Array.from(
        document.querySelectorAll<HTMLAnchorElement>('a[href="/tic-tac-toe"]'),
      );

      for (const playLink of playLinks) {
        const actions = playLink.parentElement;
        if (!actions || actions.querySelector('[data-tic-tac-toe-duel="1"]')) continue;

        const duelLink = document.createElement("a");
        duelLink.href = DUEL_HREF;
        duelLink.dataset.ticTacToeDuel = "1";
        duelLink.textContent = "⚔️ Düello";
        duelLink.className =
          "rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2.5 text-sm font-black text-purple-300 transition hover:bg-purple-500/20";
        actions.appendChild(duelLink);
      }
    };

    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
