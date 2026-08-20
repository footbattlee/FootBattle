"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";

type Locale = "tr" | "en";
type NavItem = { key: "home" | "daily" | "duels" | "rank" | "profile"; label: string; icon: string; href: string };

const MOBILE_GAME_PREFIXES = [
  "/tic-tac-toe", "/guess-the-player", "/club-clash", "/daily-faceoff", "/wordle",
  "/survivor", "/player-quiz", "/transfer-quiz", "/club-nation", "/halisaha-kadro",
];

function getLocale(pathname: string): Locale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "tr";
}

function stripLocale(pathname: string) {
  if (pathname === "/tr" || pathname === "/en") return "/";
  if (pathname.startsWith("/tr/") || pathname.startsWith("/en/")) return pathname.slice(3) || "/";
  return pathname;
}

function isGamePath(plain: string) {
  return MOBILE_GAME_PREFIXES.some((prefix) => plain === prefix || plain.startsWith(`${prefix}/`));
}

function shouldShowShell(pathname: string) {
  const plain = stripLocale(pathname);
  if (["/", "/daily", "/duels", "/rank", "/profile"].includes(plain)) return true;
  return isGamePath(plain);
}

function routeName(plain: string) {
  if (plain.startsWith("/tic-tac-toe/duel/")) return "tic-tac-toe-duel";
  if (plain === "/tic-tac-toe") return "tic-tac-toe-solo";
  if (plain === "/club-clash") return "club-clash";
  if (plain.startsWith("/guess-the-player")) return "guess-the-player";
  if (plain === "/daily") return "daily";
  if (plain === "/duels") return "duels";
  if (plain === "/rank") return "rank";
  if (plain === "/profile") return "profile";
  if (plain === "/") return "home";
  return "other";
}

export default function MobileAppShell() {
  const pathname = usePathname();
  const locale = getLocale(pathname);
  const plainPath = stripLocale(pathname);

  useEffect(() => {
    document.body.dataset.mobileRoute = routeName(plainPath);
    return () => { delete document.body.dataset.mobileRoute; };
  }, [plainPath]);

  const items = useMemo<NavItem[]>(() => {
    const tr = locale === "tr";
    return [
      { key: "home", label: tr ? "Ana Sayfa" : "Home", icon: "⌂", href: `/${locale}` },
      { key: "daily", label: tr ? "Günlük" : "Daily", icon: "🔥", href: `/${locale}/daily` },
      { key: "duels", label: tr ? "Düello" : "Duel", icon: "⚔", href: `/${locale}/duels` },
      { key: "rank", label: tr ? "Sıralama" : "Rank", icon: "♛", href: `/${locale}/rank` },
      { key: "profile", label: tr ? "Profil" : "Profile", icon: "●", href: `/${locale}/profile` },
    ];
  }, [locale]);

  if (!shouldShowShell(pathname)) return null;

  function isActive(item: NavItem) {
    if (item.key === "home") return plainPath === "/" || (isGamePath(plainPath) && !plainPath.startsWith("/tic-tac-toe/duel/"));
    if (item.key === "daily") return plainPath === "/daily";
    if (item.key === "duels") return plainPath === "/duels" || plainPath.startsWith("/tic-tac-toe/duel/");
    if (item.key === "rank") return plainPath === "/rank";
    if (item.key === "profile") return plainPath === "/profile";
    return false;
  }

  return (
    <>
      <div aria-hidden="true" className="h-[calc(74px+env(safe-area-inset-bottom))] md:hidden" />
      <nav aria-label={locale === "tr" ? "Mobil ana navigasyon" : "Mobile primary navigation"} className="fixed inset-x-0 bottom-0 z-[100] border-t border-white/10 bg-[#07111f]/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(0,0,0,0.28)] backdrop-blur-xl md:hidden">
        <div className="mx-auto grid h-[74px] max-w-[560px] grid-cols-5 items-stretch">
          {items.map((item) => {
            const active = isActive(item);
            const duel = item.key === "duels";
            return <Link key={item.key} href={item.href} aria-current={active ? "page" : undefined} className={`group relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-center transition active:scale-95 ${active ? "text-green-300" : "text-slate-500"}`}>
              {duel ? <span className={`flex h-10 w-10 -translate-y-1.5 items-center justify-center rounded-2xl border text-lg font-black shadow-lg ${active ? "border-green-200/40 bg-green-400 text-[#07111f] shadow-green-950/30" : "border-green-300/20 bg-green-500 text-[#07111f] shadow-green-950/20"}`}>{item.icon}</span> : <span className={`text-[20px] font-black leading-none ${active ? "text-green-300" : "text-slate-400"}`}>{item.icon}</span>}
              <span className={`truncate text-[11px] font-black ${duel ? "-mt-1.5" : ""}`}>{item.label}</span>
              {active && !duel ? <span className="absolute bottom-1.5 h-1 w-5 rounded-full bg-green-400" /> : null}
            </Link>;
          })}
        </div>
      </nav>
    </>
  );
}
