"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";

import { createClient } from "@/lib/supabase/client";

const BUTTON_ID = "footbattle-google-signin";

export default function AndroidGoogleSignInBridge() {
  useEffect(() => {
    if (!window.location.pathname.includes("/login")) return;
    if (document.getElementById(BUTTON_ID)) return;

    const form = document.querySelector("main form");
    if (!form || !form.parentElement) return;

    const wrapper = document.createElement("div");
    wrapper.id = BUTTON_ID;
    wrapper.className = "mt-5";

    const divider = document.createElement("div");
    divider.className = "mb-4 flex items-center gap-3 text-xs font-bold text-slate-600";
    divider.innerHTML = '<span class="h-px flex-1 bg-white/10"></span><span>veya</span><span class="h-px flex-1 bg-white/10"></span>';

    const button = document.createElement("button");
    button.type = "button";
    button.className = "flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white px-5 py-3.5 font-black text-slate-900 transition active:scale-[0.99]";
    button.innerHTML = '<span style="font-size:20px;font-weight:900;color:#4285F4">G</span><span>Google ile devam et</span>';

    const status = document.createElement("p");
    status.className = "mt-2 hidden text-center text-xs font-semibold";

    const setStatus = (message: string, isError = false) => {
      status.textContent = message;
      status.classList.remove("hidden", "text-red-400", "text-slate-500", "text-green-400");
      status.classList.add(isError ? "text-red-400" : "text-slate-500");
    };

    button.addEventListener("click", async () => {
      button.disabled = true;
      button.style.opacity = "0.6";
      setStatus("Google hesabı açılıyor...");

      const supabase = createClient();

      try {
        if (Capacitor.isNativePlatform()) {
          const result = await FirebaseAuthentication.signInWithGoogle({ useCredentialManager: false });
          const idToken = result.credential?.idToken;
          const nonce = result.credential?.nonce;

          if (!idToken) throw new Error("Google kimlik doğrulama tokenı alınamadı.");

          const { error } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token: idToken,
            ...(nonce ? { nonce } : {}),
          });
          if (error) throw error;
        } else {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/auth/callback` },
          });
          if (error) throw error;
          return;
        }

        setStatus("Giriş başarılı.");
        window.location.href = "/";
      } catch (error) {
        console.error("Google sign-in failed", error);
        setStatus(error instanceof Error ? error.message : "Google ile giriş başarısız oldu.", true);
        button.disabled = false;
        button.style.opacity = "1";
      }
    });

    wrapper.append(divider, button, status);
    form.parentElement.insertBefore(wrapper, form);
    return () => wrapper.remove();
  }, []);

  return null;
}
