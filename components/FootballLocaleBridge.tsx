"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const COOKIE_NAME = "footbattle_locale";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export default function FootballLocaleBridge() {
  const pathname = usePathname();

  useEffect(() => {
    let locale: "tr" | "en" | null = null;

    if (pathname === "/en" || pathname.startsWith("/en/")) {
      locale = "en";
    } else if (pathname === "/" || pathname === "/tr" || pathname.startsWith("/tr/")) {
      locale = "tr";
    }

    if (!locale) return;

    document.cookie = `${COOKIE_NAME}=${locale}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
    window.localStorage.setItem(COOKIE_NAME, locale);
  }, [pathname]);

  return null;
}
