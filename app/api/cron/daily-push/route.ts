import { NextResponse } from "next/server";

import { sendDailyTasksPushToAll } from "@/lib/server/push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("[daily-push] CRON_SECRET is missing");
    return NextResponse.json({ ok: false, error: "Cron is not configured." }, { status: 503 });
  }

  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendDailyTasksPushToAll();
    console.info("[daily-push] finished", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[daily-push] failed", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Daily push failed." }, { status: 500 });
  }
}
