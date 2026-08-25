import { NextResponse } from "next/server";

import { sendDailyTasksPushToAll } from "@/lib/server/push";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await sendDailyTasksPushToAll();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("One-off push test failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Push test failed" },
      { status: 500 },
    );
  }
}
