"use client";

import Link from "next/link";
import { CalendarPlus2, Users, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const DISMISS_KEY = "footbattle-home-halisaha-promo-dismissed";

export default function HomeHalisahaPromo() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pathname !== "/") {
      setVisible(false);
      return;
    }

    setVisible(window.localStorage.getItem(DISMISS_KEY) !== "1");
  }, [pathname]);

  if (!visible || pathname !== "/") return null;

  return (
    <aside className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-3xl border border-yellow-400/30 bg-[#0d1828]/95 p-4 text-white shadow-2xl shadow-black/50 backdrop-blur-xl sm:left-auto sm:right-5 sm:w-[390px]">
      <button
        type="button"
        aria-label="Kapat"
        onClick={() => {
          window.localStorage.setItem(DISMISS_KEY, "1");
          setVisible(false);
        }}
        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-slate-400"
      >
        <X size={16} />
      </button>

      <div className="flex items-start gap-3 pr-9">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-yellow-400 text-[#07111f]">
          <CalendarPlus2 size={22} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-400">
            Yeni · Halısaha
          </p>
          <h2 className="mt-1 text-lg font-black">Kim geliyor derdini bitir.</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Maçı oluştur, WhatsApp grubuna tek link at, katılımı topla ve takımları otomatik dengele.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          href="/halisaha-mac"
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-3 text-sm font-black text-[#07111f]"
        >
          <Users size={16} /> Maç Oluştur
        </Link>
        <Link
          href="/halisaha-kadro"
          className="flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-3 text-sm font-black"
        >
          Kadro Kur
        </Link>
      </div>
    </aside>
  );
}
