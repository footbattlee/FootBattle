import { NextResponse } from "next/server";

import { validateHalisahaSharePayload } from "@/lib/halisaha/validation";
import {
  checkRateLimit,
  getRequestFingerprint,
} from "@/lib/server/simple-rate-limit";
import { supabaseAdmin } from "@/lib/supabase/server";

function createShareId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}

export async function POST(request: Request) {
  try {
    const fingerprint = getRequestFingerprint(request);
    const rateLimit = checkRateLimit(`halisaha-share:${fingerprint}`, {
      limit: 20,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: "Çok fazla paylaşım isteği gönderdin. Biraz sonra tekrar dene.",
        },
        { status: 429 },
      );
    }

    const rawBody = await request.json();
    const validation = validateHalisahaSharePayload(rawBody);

    if (!validation.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: validation.error,
        },
        { status: 400 },
      );
    }

    const body = validation.data;
    const id = createShareId();

    const { error } = await supabaseAdmin.from("halisaha_shares").insert({
      id,
      squad_name: body.squadName,
      player_count: body.playerCount,
      players: body.players,
      body_color: body.bodyColor,
      sleeve_color: body.sleeveColor,
      tactic: body.tactic,
      positions: body.positions,
      drawings: body.drawings,
    });

    if (error) {
      console.error("Halısaha paylaşımı kaydedilemedi:", error);

      return NextResponse.json(
        {
          ok: false,
          error: "Paylaşım kaydedilemedi.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      id,
      sharePath: `/halisaha-kadro/share/${id}`,
    });
  } catch (error) {
    console.error("Halisaha share endpoint error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Paylaşım oluşturulurken hata oluştu.",
      },
      { status: 500 },
    );
  }
}
