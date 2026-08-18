"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminBackButton() {
  const pathname = usePathname();

  if (!pathname?.startsWith("/admin/") || pathname === "/admin") {
    return null;
  }

  return (
    <Link
      href="/admin"
      aria-label="Admin paneline dön"
      className="fixed bottom-5 right-5 z-[100] inline-flex items-center gap-2 rounded-2xl border border-green-400/25 bg-[#0b1726]/95 px-4 py-3 text-sm font-black text-green-300 shadow-2xl shadow-black/40 backdrop-blur transition hover:border-green-400/45 hover:bg-[#102033] active:scale-[0.98] sm:bottom-6 sm:right-6"
    >
      <span aria-hidden="true">←</span>
      <span>Admin Paneli</span>
    </Link>
  );
}
