"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function RankedMatchChromeFix() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const ranked = searchParams.get("ranked") === "1";
    const isMatch = pathname.startsWith("/tic-tac-toe/duel/") || pathname.startsWith("/challenge/");
    if (!ranked || !isMatch) return;

    document.body.classList.add("ranked-match-active");
    if (pathname.startsWith("/challenge/")) document.body.classList.add("ranked-club-clash-active");

    const hideLegacyBack = () => {
      for (const anchor of Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href$="/rank"]'))) {
        const text = anchor.textContent?.trim() ?? "";
        if (text.includes("Ranked") && text.includes("Dön")) anchor.style.display = "none";
      }
    };

    hideLegacyBack();
    const observer = new MutationObserver(hideLegacyBack);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      document.body.classList.remove("ranked-match-active", "ranked-club-clash-active");
    };
  }, [pathname, searchParams]);

  return null;
}
