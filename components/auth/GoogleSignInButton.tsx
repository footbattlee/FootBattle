"use client";

import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";

import { createClient } from "@/lib/supabase/client";

export default function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function signInWithGoogle() {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      if (Capacitor.isNativePlatform()) {
        const result = await FirebaseAuthentication.signInWithGoogle({
          useCredentialManager: false,
        });

        const idToken = result.credential?.idToken;
        const nonce = result.credential?.nonce;

        if (!idToken) {
          throw new Error("Google kimlik doğrulama tokenı alınamadı.");
        }

        const { error: supabaseError } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: idToken,
          ...(nonce ? { nonce } : {}),
        });

        if (supabaseError) throw supabaseError;

        window.location.replace("/tr/profile");
        return;
      }

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/tr/profile`,
        },
      });

      if (oauthError) throw oauthError;
    } catch (err) {
      console.error("Google sign-in error:", err);
      const message = err instanceof Error ? err.message : "Google ile giriş yapılamadı.";
      setError(message.includes("28444") || message.includes("Developer console") || message === "10:" || message.includes("10:")
        ? "Google Android kimlik doğrulaması uygulama imzasını tanımıyor. Play Signing / OAuth yapılandırmasını kontrol ediyoruz."
        : message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">veya</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <button
        type="button"
        onClick={() => void signInWithGoogle()}
        disabled={loading}
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white px-4 font-black text-[#07111f] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-lg font-black">G</span>
        {loading ? "Google açılıyor..." : "Google ile devam et"}
      </button>

      {error ? (
        <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );

}
