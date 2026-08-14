import { NextResponse } from "next/server";

import { validateRsvp } from "@/lib/halisaha/match";
import {
  checkRateLimit,
  getRequestFingerprint,
} from "@/lib/server/simple-rate-limit";
import { supabaseAdmin } from "@/lib/supabase/server";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, props: RouteProps) {
  try {
    const { id } = await props.params;
    const fingerprint = getRequestFingerprint(request);
    const rateLimit = checkRateLimit(`halisaha-rsvp:${id}:${fingerprint}`, {
      limit: 20,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Çok fazla katılım güncellemesi yaptın. Biraz sonra tekrar dene." },
        { status: 429 },
      );
    }

    const validation = validateRsvp(await request.json());
    if (!validation.ok) {
      return NextResponse.json(
        { ok: false, error: validation.error },
        { status: 400 },
      );
    }

    const { data: match, error: matchError } = await supabaseAdmin
      .from("halisaha_matches")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (matchError) {
      console.error("Halısaha RSVP maç kontrolü başarısız:", matchError);
      return NextResponse.json(
        { ok: false, error: "Maç kontrol edilemedi." },
        { status: 500 },
      );
    }

    if (!match) {
      return NextResponse.json(
        { ok: false, error: "Maç bulunamadı." },
        { status: 404 },
      );
    }

    const { participantToken, playerName, status } = validation.data;

    const { error } = await supabaseAdmin
      .from("halisaha_match_rsvps")
      .upsert(
        {
          match_id: id,
          participant_token: participantToken,
          player_name: playerName,
          status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "match_id,participant_token" },
      );

    if (error) {
      console.error("Halısaha RSVP kaydedilemedi:", error);
      return NextResponse.json(
        { ok: false, error: "Katılım durumu kaydedilemedi." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Halisaha RSVP endpoint error:", error);
    return NextResponse.json(
      { ok: false, error: "Katılım durumu güncellenirken hata oluştu." },
      { status: 500 },
    );
  }
}
