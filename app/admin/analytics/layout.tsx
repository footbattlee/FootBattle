import Link from "next/link";
import type { ReactNode } from "react";

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Link
        href="/admin/analytics/survivor"
        className="fixed bottom-5 right-5 z-50 rounded-2xl border border-green-400/30 bg-[#0d1b2b]/95 px-4 py-3 text-xs font-black text-green-300 shadow-2xl backdrop-blur hover:bg-[#13263a]"
      >
        🏆 Survivor Oyları
      </Link>
    </>
  );
}
