import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type SupportedGame =
  | "guess_the_player"
  | "super_lig_guess_the_player"
  | "player_quiz"
  | "tic_tac_toe"
  | "wordle";

type RequestBody = {
  gameName?: SupportedGame;
  sessionId?: string;
  metadata?: Record<string, unknown>;
};

const SUPPORTED_GAMES = new Set<SupportedGame>([
  "guess_the_player",
  "super_lig_guess_the_player",
  "player_quiz",
  "tic_tac_toe",
  "wordle",
]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const gameName = body.gameName;
    const sessionId = String(body.sessionId ?? "").trim();

    if (!gameName || !SUPPORTED_GAMES.has(gameName) || !sessionId) {
      return NextResponse.json(
        { ok: false, error: "Geçersiz analytics isteği." },
        { status: 400 },
      );
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("analytics_events")
      .select("id")
      .eq("event_name", "game_completed")
      .eq("game_name", gameName)
      .eq("session_id", sessionId)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing) {
      return NextResponse.json({ ok: true, alreadyRecorded: true });
    }

    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    const { error: insertError } = await supabaseAdmin
      .from("analytics_events")
      .insert({
        event_name: "game_completed",
        game_name: gameName,
        user_id: user?.id ?? null,
        session_id: sessionId,
        page_path: null,
        metadata: {
          ...(body.metadata ?? {}),
          surrendered: true,
        },
      });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ ok: true, alreadyRecorded: false });
  } catch (error) {
    console.error("Surrender completion analytics error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Analytics kaydı oluşturulamadı.",
      },
      { status: 500 },
    );
  }
}
