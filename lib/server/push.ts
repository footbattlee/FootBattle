import { createSign } from "node:crypto";

import { supabaseAdmin } from "@/lib/supabase/server";

type PushPayload = {
  title: string;
  body: string;
  url: string;
  type: "friend_request" | "duel_invite" | "duel_update";
};

type ServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function base64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function serviceAccount(): ServiceAccount | null {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (!projectId || !clientEmail || !rawPrivateKey) return null;
  return {
    projectId,
    clientEmail,
    privateKey: rawPrivateKey.replace(/\\n/g, "\n"),
  };
}

async function accessToken(account: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: account.clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = base64Url(signer.sign(account.privateKey));
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });
  const result = (await response.json()) as { access_token?: string; error_description?: string };
  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description ?? "Firebase access token alınamadı.");
  }
  return result.access_token;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const account = serviceAccount();
  if (!account) {
    console.warn("Push skipped: FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY missing.");
    return { sent: 0, skipped: true };
  }

  const { data: rows, error } = await supabaseAdmin
    .from("push_tokens")
    .select("token")
    .eq("user_id", userId);
  if (error) throw error;

  const tokens = Array.from(new Set((rows ?? []).map((row) => String(row.token ?? "").trim()).filter(Boolean)));
  if (!tokens.length) return { sent: 0, skipped: false };

  const bearer = await accessToken(account);
  let sent = 0;
  for (const token of tokens) {
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.projectId)}/messages:send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: payload.title, body: payload.body },
          data: { url: payload.url, type: payload.type },
          android: {
            priority: "high",
            notification: { channel_id: "footbattle_social" },
          },
        },
      }),
      cache: "no-store",
    });
    if (response.ok) {
      sent += 1;
    } else {
      const text = await response.text();
      console.error("FCM send failed", response.status, text);
    }
  }
  return { sent, skipped: false };
}
