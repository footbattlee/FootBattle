import { NextResponse } from "next/server";

import {
  createPublicMatchId,
  validateMatchCreate,
} from "@/lib/halisaha/match";
import {
  checkRateLimit,
  getRequestFingerprint,
} from "@/lib/server/simple-rate-limit";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const fingerprint = getRequestFingerprint(request);
    const rateLimit = checkRateLimit(`halisaha-match-create:${fingerprint}`, {
      limit: 8,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Çok fazla maç oluşturdun. Biraz sonra tekrar dene." },
        { status: 429 },
      );
    }

    const validation = validateMatchCreate(await request.json());
    if (!validation.ok) {
      return NextResponse.json(
        { ok: false, error: validation.error },
        { status: 400 },
      );
    }

    const id = createPublicMatchId();
    const data = validation.data;

    const { error } = await supabaseAdmin.from("halisaha_matches").insert({
      id,
      title: data.title,
      match_date: data.matchDate,
      match_time: data.matchTime,
      location: data.location,
      target_players: data.targetPlayers,
      note: data.note,
    });

    if (error) {
      console.error("Halısaha maçı oluşturulamadı:", error);
      return NextResponse.json(
        { ok: false, error: "Maç oluşturulamadı." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      id,
      matchPath: `/halisaha-mac/${id}`,
    });
  } catch (error) {
    console.error("Halisaha match create endpoint error:", error);
    return NextResponse.json(
      { ok: false, error: "Maç oluşturulurken bir hata oluştu." },
      { status: 500 },
    );
  }
}
