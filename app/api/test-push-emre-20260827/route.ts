import { NextResponse } from "next/server";
import { sendPushToUser } from "@/lib/server/push";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await sendPushToUser("e60df5c5-994f-4263-ac4e-305fad6a0bc9", {
      title: "FootBattle bildirim testi",
      body: "FCM test bildirimi başarıyla gönderildi.",
      url: "/tr/profile",
      type: "duel_update",
      channelId: "footbattle_social",
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Push test failed." },
      { status: 500 },
    );
  }
}
