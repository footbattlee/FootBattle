"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function AuthButton() {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setDisplayName(null);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      setDisplayName(
        profile?.display_name ??
          user.user_metadata?.full_name ??
          user.email ??
          "Oyuncu",
      );

      setLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    const supabase = createClient();

    await supabase.auth.signOut();

    window.location.href = "/";
  }

  if (loading) {
    return (
      <div className="h-10 w-24 animate-pulse rounded-xl bg-white/5" />
    );
  }

  if (!displayName) {
    return (
      <Link
        href="/login"
        className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold transition hover:border-green-400 hover:text-green-400"
      >
        Giriş Yap
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="hidden rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm font-bold text-green-400 sm:block">
        {displayName}
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-red-400/50 hover:text-red-300"
      >
        Çıkış
      </button>
    </div>
  );
}