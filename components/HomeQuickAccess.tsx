"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function homeLocale(pathname: string) {
  if (pathname === "/en") return "en" as const;
  if (pathname === "/" || pathname === "/tr") return "tr" as const;
  return null;
}

export default function HomeQuickAccess() {
  const pathname = usePathname();
  const locale = homeLocale(pathname);
  const tr = locale !== "en";
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!locale) return;
    let cancelled = false;
    fetch("/api/admin/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => { if (!cancelled) setIsAdmin(Boolean(result?.ok && result?.authorized)); })
      .catch(() => { if (!cancelled) setIsAdmin(false); });
    return () => { cancelled = true; };
  }, [locale]);

  if (!locale) return null;

  return (
    <div className="fixed bottom-3 left-1/2 z-[70] w-[calc(100%-1rem)] max-w-[980px] -translate-x-1/2 sm:bottom-5 sm:left-5 sm:w-auto sm:max-w-[calc(100vw-2.5rem)] sm:translate-x-0">
      <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-[#081523]/95 p-2 shadow-2xl backdrop-blur-xl">
        <Link href={`/${locale}/rank`} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-3 text-xs font-black text-yellow-200 sm:px-4 sm:text-sm">🏆 {tr ? "Rank Arenası" : "Rank Arena"}</Link>
        <Link href={`/${locale}/daily-faceoff`} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-red-400/25 bg-red-400/10 px-3 text-xs font-black text-red-200 sm:px-4 sm:text-sm">🔥 {tr ? "Günün Kapışması" : "Daily Faceoff"}</Link>
        <Link href={`/${locale}/survivor`} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-yellow-300/25 bg-yellow-300/10 px-3 text-xs font-black text-yellow-100 sm:px-4 sm:text-sm">👑 Survivor</Link>
        <Link href="/halisaha-mac" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-green-400/20 bg-green-400/10 px-3 text-xs font-black text-green-300 sm:px-4 sm:text-sm">⚽ {tr ? "Halısaha" : "Pickup Match"}</Link>
        <Link href={`/${locale}/friends`} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 text-xs font-black text-cyan-200 sm:px-4 sm:text-sm">👥 {tr ? "Arkadaşlar" : "Friends"}</Link>
        <Link href="/tic-tac-toe/duel" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-3 text-xs font-black text-yellow-200 sm:px-4 sm:text-sm">⚔️ Tic Tac Toe {tr ? "Düello" : "Duel"}</Link>
        {isAdmin && <Link href="/admin" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-purple-400/20 bg-purple-400/10 px-3 text-xs font-black text-purple-200 sm:px-4 sm:text-sm">🛠️ Admin</Link>}
      </div>
    </div>
  );
}
