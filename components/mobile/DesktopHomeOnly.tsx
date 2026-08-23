"use client";

import { useEffect, useState } from "react";
import UnifiedHomePage from "@/components/UnifiedHomePage";
import type { Locale } from "@/lib/i18n/config";

export default function DesktopHomeOnly({ locale }: { locale: Locale }) {
  // Keep SSR/desktop content intact, then unmount the heavy desktop home on mobile.
  // This stops its hidden friends/daily polling while MobileHomeDashboard is visible.
  const [showDesktopHome, setShowDesktopHome] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setShowDesktopHome(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  if (!showDesktopHome) return null;
  return <UnifiedHomePage locale={locale} />;
}
