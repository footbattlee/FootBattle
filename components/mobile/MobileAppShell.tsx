"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

type Locale = "tr" | "en";
type NavItem = { key: "home" | "daily" | "ranked" | "duels" | "leaderboard" | "profile"; label: string; icon: string; href: string };

function getLocale(pathname: string): Locale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "tr";
}

function stripLocale(pathname: string) {
  if (pathname === "/tr" || pathname === "/en") return "/";
  if (pathname.startsWith("/tr/") || pathname.startsWith("/en/")) return pathname.slice(3) || "/";
  return pathname;
}

function shouldShowShell(pathname: string) {
  return ["/", "/daily", "/duels", "/rank", "/profile"].includes(stripLocale(pathname));
}

function routeName(plain: string) {
  if (plain.startsWith("/tic-tac-toe/duel/")) return "tic-tac-toe-duel";
  if (plain === "/tic-tac-toe") return "tic-tac-toe-solo";
  if (plain === "/wordle") return "wordle";
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
  const [incomingCount, setIncomingCount] = useState(0);

  useEffect(() => {
    document.body.dataset.mobileRoute = routeName(plainPath);
    return () => { delete document.body.dataset.mobileRoute; };
  }, [plainPath]);

  useEffect(() => {
    let cancelled = false;

    async function loadBadge() {
      try {
        const [duelResponse, friendResponse] = await Promise.all([
          fetch("/api/duels", { cache: "no-store" }),
          fetch("/api/friends", { cache: "no-store" }),
        ]);
        let count = 0;
        if (duelResponse.ok) {
          const body = await duelResponse.json();
          count += Number(body?.summary?.incomingCount ?? body?.incoming?.length ?? 0);
        }
        if (friendResponse.ok) {
          const body = await friendResponse.json();
          count += Number(body?.summary?.incomingRequestCount ?? body?.incomingRequests?.length ?? 0);
        }
        if (!cancelled) setIncomingCount(count);
      } catch {
        if (!cancelled) setIncomingCount(0);
      }
    }

    void loadBadge();
    const timer = window.setInterval(loadBadge, 15000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [pathname]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;
    const listeners: Array<{ remove: () => Promise<void> }> = [];

    void (async () => {
      try {
        const current = await PushNotifications.checkPermissions();
        let receive = current.receive;
        if (receive === "prompt") {
          const requested = await PushNotifications.requestPermissions();
          receive = requested.receive;
        }
        if (receive !== "granted") return;

        if (Capacitor.getPlatform() === "android") {
          try {
            await PushNotifications.createChannel({
              id: "footbattle_social",
              name: "FootBattle",
              description: "Arkadaşlık ve düello bildirimleri",
              importance: 5,
            });
          } catch (error) {
            console.warn("Push channel creation failed", error);
          }
        }

        listeners.push(await PushNotifications.addListener("registration", (token) => {
          if (!active) return;
          void fetch("/api/push/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: token.value, platform: Capacitor.getPlatform() }),
          }).catch(() => undefined);
        }));

        listeners.push(await PushNotifications.addListener("registrationError", (error) => {
          console.error("Push registration failed", error);
        }));

        listeners.push(await PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
          const target = String(event.notification.data?.url ?? "").trim();
          if (!target) return;
          if (target.startsWith("https://playfootbattle.com")) {
            window.location.href = target.replace("https://playfootbattle.com", "") || `/${locale}`;
            return;
          }
          if (target.startsWith("/")) window.location.href = target;
        }));

        await PushNotifications.register();
      } catch (error) {
        console.error("Push setup failed", error);
      }
    })();

    return () => {
      active = false;
      for (const listener of listeners) void listener.remove();
    };
  }, [locale]);

  const items = useMemo<NavItem[]>(() => {
    const tr = locale === "tr";
    return [
      { key: "home", label: tr ? "Ana Sayfa" : "Home", icon: "⌂", href: `/${locale}` },
      { key: "daily", label: tr ? "Günlük" : "Daily", icon: "🔥", href: `/${locale}/daily` },
      { key: "ranked", label: "Ranked", icon: "🏆", href: `/${locale}/rank` },
      { key: "duels", label: tr ? "Düello" : "Duel", icon: "⚔", href: `/${locale}/duels` },
      { key: "leaderboard", label: tr ? "Sıralama" : "Ranks", icon: "♛", href: `/${locale}/rank#leaderboard` },
      { key: "profile", label: tr ? "Profil" : "Profile", icon: "●", href: `/${locale}/profile` },
    ];
  }, [locale]);

  if (!shouldShowShell(pathname)) return null;

  function isActive(item: NavItem) {
    if (item.key === "home") return plainPath === "/";
    if (item.key === "daily") return plainPath === "/daily";
    if (item.key === "ranked") return plainPath === "/rank" && !window.location.hash;
    if (item.key === "duels") return plainPath === "/duels";
    if (item.key === "leaderboard") return plainPath === "/rank" && window.location.hash === "#leaderboard";
    if (item.key === "profile") return plainPath === "/profile";
    return false;
  }

  const navLayer = plainPath === "/duels" ? "z-[60]" : "z-[100]";

  return (
    <>
      <div aria-hidden="true" className="h-[calc(74px+env(safe-area-inset-bottom))] md:hidden" />
      <nav aria-label={locale === "tr" ? "Mobil ana navigasyon" : "Mobile primary navigation"} className={`fixed inset-x-0 bottom-0 ${navLayer} border-t border-white/10 bg-[#07111f]/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(0,0,0,0.28)] backdrop-blur-xl md:hidden`}>
        <div className="mx-auto grid h-[74px] max-w-[620px] grid-cols-6 items-stretch">
          {items.map((item) => {
            const active = isActive(item);
            const duel = item.key === "duels";
            return (
              <Link key={item.key} href={item.href} aria-current={active ? "page" : undefined} className={`group relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 text-center transition active:scale-95 ${active ? "text-green-300" : "text-slate-500"}`}>
                {duel ? (
                  <span className={`relative flex h-9 w-9 -translate-y-1 items-center justify-center rounded-2xl border text-base font-black shadow-lg ${active ? "border-green-200/40 bg-green-400 text-[#07111f] shadow-green-950/30" : "border-green-300/20 bg-green-500 text-[#07111f] shadow-green-950/20"}`}>
                    {item.icon}
                    {incomingCount > 0 ? <span className="absolute -right-2 -top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#07111f] bg-red-500 px-1 text-[9px] font-black leading-none text-white">{incomingCount > 9 ? "9+" : incomingCount}</span> : null}
                  </span>
                ) : <span className={`text-[18px] font-black leading-none ${active ? "text-green-300" : "text-slate-400"}`}>{item.icon}</span>}
                <span className={`truncate text-[9px] font-black sm:text-[10px] ${duel ? "-mt-1" : ""}`}>{item.label}</span>
                {active && !duel ? <span className="absolute bottom-1.5 h-1 w-4 rounded-full bg-green-400" /> : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
