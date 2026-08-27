"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

import { createClient } from "@/lib/supabase/client";

export const PUSH_TOKEN_STORAGE_KEY = "footbattle_push_token";

export default function PushTokenSync() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;

    const supabase = createClient();
    let active = true;
    let currentUserId: string | null = null;
    let lastSyncedKey = "";
    const listeners: Array<{ remove: () => Promise<void> }> = [];

    async function syncToken(token?: string) {
      if (!active) return;
      const value = (token ?? window.localStorage.getItem(PUSH_TOKEN_STORAGE_KEY) ?? "").trim();
      if (value.length < 20) return;

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      currentUserId = session?.user?.id ?? null;
      const accessToken = session?.access_token ?? "";
      if (!currentUserId || !accessToken) return;

      const syncKey = `${currentUserId}:${value}`;
      if (syncKey === lastSyncedKey) return;

      try {
        const response = await fetch("/api/push/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ token: value, platform: "android" }),
          cache: "no-store",
        });
        if (response.ok) {
          lastSyncedKey = syncKey;
        } else {
          console.warn("Push token sync rejected", response.status, await response.text().catch(() => ""));
        }
      } catch (error) {
        console.warn("Push token sync failed", error);
      }
    }

    async function configurePush() {
      const registrationListener = await PushNotifications.addListener("registration", (token) => {
        if (!active) return;
        const value = String(token.value ?? "").trim();
        if (value.length < 20) return;
        window.localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, value);
        lastSyncedKey = "";
        void syncToken(value);
      });
      listeners.push(registrationListener);

      const registrationErrorListener = await PushNotifications.addListener("registrationError", (error) => {
        console.warn("Push registration error", error);
      });
      listeners.push(registrationErrorListener);

      let permission = await PushNotifications.checkPermissions();
      if (permission.receive !== "granted" && permission.receive !== "denied") {
        permission = await PushNotifications.requestPermissions();
      }
      if (permission.receive === "granted") {
        await PushNotifications.register();
      }

      void syncToken();
    }

    const { data: authSubscription } = supabase.auth.onAuthStateChange((event, session) => {
      currentUserId = session?.user?.id ?? null;
      lastSyncedKey = "";
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        void syncToken();
      }
    });

    const retryOnForeground = () => {
      if (document.visibilityState === "visible") {
        lastSyncedKey = "";
        void syncToken();
      }
    };
    const retryOnOnline = () => {
      lastSyncedKey = "";
      void syncToken();
    };

    window.addEventListener("online", retryOnOnline);
    window.addEventListener("focus", retryOnForeground);
    document.addEventListener("visibilitychange", retryOnForeground);

    void configurePush().catch((error) => console.warn("Push setup failed", error));

    return () => {
      active = false;
      authSubscription.subscription.unsubscribe();
      window.removeEventListener("online", retryOnOnline);
      window.removeEventListener("focus", retryOnForeground);
      document.removeEventListener("visibilitychange", retryOnForeground);
      for (const listener of listeners) void listener.remove();
    };
  }, []);

  return null;
}
