"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

import { createClient } from "@/lib/supabase/client";

const MOBILE_REDIRECT = "footbattle://auth/callback";

type FootBattleAndroidBridge = {
  openExternal: (url: string) => void;
  consumePendingAuthUrl: () => string | null;
};

declare global {
  interface Window {
    FootBattleAndroid?: FootBattleAndroidBridge;
  }
}

function authErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Google ile giriş yapılamadı.";
}

export default function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function finishMobileOAuth(callbackUrl: string) {
    const supabase = createClient();
    const url = new URL(callbackUrl);
    const providerError = url.searchParams.get("error_description") || url.searchParams.get("error");
    if (providerError) throw new Error(providerError);

    const code = url.searchParams.get("code");
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;
    } else {
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (!accessToken || !refreshToken) {
        throw new Error("Google dönüşünde oturum bilgisi bulunamadı.");
      }
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) throw sessionError;
    }

    window.location.replace("/tr/profile");
  }

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;
    const onCallback = (event: Event) => {
      const custom = event as CustomEvent<{ url?: string }>;
      const callbackUrl = custom.detail?.url;
      if (!active || !callbackUrl) return;
      setLoading(true);
      setError("");
      void finishMobileOAuth(callbackUrl).catch((err) => {
        if (!active) return;
        console.error("Mobile Google OAuth callback failed", err);
        setError(authErrorMessage(err));
        setLoading(false);
      });
    };

    window.addEventListener("footbattle:auth-callback", onCallback);

    const pending = window.FootBattleAndroid?.consumePendingAuthUrl?.();
    if (pending) {
      onCallback(new CustomEvent("footbattle:auth-callback", { detail: { url: pending } }));
    }

    return () => {
      active = false;
      window.removeEventListener("footbattle:auth-callback", onCallback);
    };
  }, []);

  async function signInWithGoogle() {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      if (Capacitor.isNativePlatform()) {
        const bridge = window.FootBattleAndroid;
        if (!bridge?.openExternal) {
          throw new Error("Android tarayıcı köprüsü hazır değil. Uygulamayı kapatıp tekrar aç.");
        }

        const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: MOBILE_REDIRECT,
            skipBrowserRedirect: true,
          },
        });
        if (oauthError) throw oauthError;
        if (!data.url) throw new Error("Google giriş adresi oluşturulamadı.");

        bridge.openExternal(data.url);
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
      setError(authErrorMessage(err));
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
        {loading ? "Google girişi bekleniyor..." : "Google ile devam et"}
      </button>

      {error ? (
        <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
