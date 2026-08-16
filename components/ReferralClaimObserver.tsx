"use client";

import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";

export default function ReferralClaimObserver() {
  useEffect(() => {
    const supabase = createClient();
    let stopped = false;

    async function claim() {
      if (stopped) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      try {
        await fetch("/api/referrals/claim", { method: "POST", cache: "no-store" });
      } catch {
        // Referral claiming is best-effort and must never block auth/navigation.
      }
    }

    void claim();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") void claim();
    });

    return () => {
      stopped = true;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
