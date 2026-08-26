"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

const STORAGE_KEY = "footbattle_push_token";
const RETRY_MS = 15_000;

export default function PushTokenSync() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;

    let active = true;
    let timer: number | null = null;
    let syncing = false;
    let synced = false;
    let registrationListener: { remove: () => Promise<void> } | null = null;

    async function syncToken(token?: string) {
      if (!active || syncing || synced) return;
      const value = (token ?? window.localStorage.getItem(STORAGE_KEY) ?? "").trim();
      if (value.length < 20) return;
      syncing = true;
      try {
        const response = await fetch("/api/push/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: value, platform: "android" }),
          cache: "no-store",
        });
        if (response.ok) {
          synced = true;
          if (timer !== null) {
            window.clearInterval(timer);
            timer = null;
          }
        }
      } catch {
        // Network/auth may not be ready yet; the retry loop will try again.
      } finally {
        syncing = false;
      }
    }

    void (async () => {
      try {
        registrationListener = await PushNotifications.addListener("registration", (token) => {
          if (!active) return;
          const value = String(token.value ?? "").trim();
          if (value.length < 20) return;
          window.localStorage.setItem(STORAGE_KEY, value);
          synced = false;
          void syncToken(value);
        });

        const permission = await PushNotifications.checkPermissions();
        if (permission.receive === "granted") {
          await PushNotifications.register();
        }

        void syncToken();
        timer = window.setInterval(() => void syncToken(), RETRY_MS);
      } catch (error) {
        console.warn("Push token sync setup failed", error);
      }
    })();

    const retryNow = () => {
      synced = false;
      void syncToken();
    };
    window.addEventListener("focus", retryNow);
    document.addEventListener("visibilitychange", retryNow);

    return () => {
      active = false;
      if (timer !== null) window.clearInterval(timer);
      window.removeEventListener("focus", retryNow);
      document.removeEventListener("visibilitychange", retryNow);
      if (registrationListener) void registrationListener.remove();
    };
  }, []);

  return null;
}
