import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const BOT_FALLBACK_MS = 7000;
const VALID_GAMES = new Set(["tic_tac_toe", "club_clash"]);

async function getUserId() {
  const auth = await createAuthServerClient();
  const { data: { user } } = await auth.auth.getUser();
  return user?.id ?? null;
}

async function getExistingMatch(userId: string, gameCode: string) {
  const { data } = await supabaseAdmin
    .from("ranked_matches")
    .select("id,game_code,status,player_a_id,player_b_id,opponent_kind,bot_name,created_at")
    .eq("game_code", gameCode)
    .in("status", ["ready", "active"])
    .or(`player_a_id.eq.${userId},player_b_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ ok: false, error: "Giriş yapmalısın." }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const gameCode = typeof body?.gameCode === "string" ? body.gameCode : "";
    if (!VALID_GAMES.has(gameCode)) {
      return NextResponse.json({ ok: false, error: "Geçersiz ranked oyunu." }, { status: 400 });
    }

    const existing = await getExistingMatch(userId, gameCode);
    if (existing) return NextResponse.json({ ok: true, state: "matched", match: existing });

    const { data: mine } = await supabaseAdmin
      .from("ranked_match_queue")
      .select("user_id,game_code,created_at")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: candidate } = await supabaseAdmin
      .from("ranked_match_queue")
      .select("user_id,game_code,created_at")
      .eq("game_code", gameCode)
      .neq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (candidate?.user_id) {
      const { data: match, error: matchError } = await supabaseAdmin
        .from("ranked_matches")
        .insert({
          game_code: gameCode,
          status: "ready",
          player_a_id: candidate.user_id,
          player_b_id: userId,
          opponent_kind: "human",
        })
        .select("id,game_code,status,player_a_id,player_b_id,opponent_kind,bot_name,created_at")
        .single();
      if (matchError) throw matchError;

      await supabaseAdmin.from("ranked_match_queue").delete().in("user_id", [candidate.user_id, userId]);
      return NextResponse.json({ ok: true, state: "matched", match });
    }

    if (!mine) {
      const { error } = await supabaseAdmin.from("ranked_match_queue").insert({ user_id: userId, game_code: gameCode });
      if (error) throw error;
      return NextResponse.json({ ok: true, state: "searching", elapsedMs: 0, botInMs: BOT_FALLBACK_MS });
    }

    if (mine.game_code !== gameCode) {
      const { error } = await supabaseAdmin
        .from("ranked_match_queue")
        .update({ game_code: gameCode, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (error) throw error;
      return NextResponse.json({ ok: true, state: "searching", elapsedMs: 0, botInMs: BOT_FALLBACK_MS });
    }

    const elapsedMs = Math.max(0, Date.now() - new Date(mine.created_at).getTime());
    if (elapsedMs >= BOT_FALLBACK_MS) {
      const { data: match, error: matchError } = await supabaseAdmin
        .from("ranked_matches")
        .insert({
          game_code: gameCode,
          status: "ready",
          player_a_id: userId,
          player_b_id: null,
          opponent_kind: "bot",
          bot_name: "Mehmet",
        })
        .select("id,game_code,status,player_a_id,player_b_id,opponent_kind,bot_name,created_at")
        .single();
      if (matchError) throw matchError;

      await supabaseAdmin.from("ranked_match_queue").delete().eq("user_id", userId);
      return NextResponse.json({ ok: true, state: "matched", match });
    }

    return NextResponse.json({
      ok: true,
      state: "searching",
      elapsedMs,
      botInMs: Math.max(0, BOT_FALLBACK_MS - elapsedMs),
    });
  } catch (error) {
    console.error("Ranked matchmaking error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Rakip aranamadı." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ ok: false, error: "Giriş yapmalısın." }, { status: 401 });
    await supabaseAdmin.from("ranked_match_queue").delete().eq("user_id", userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Arama iptal edilemedi." }, { status: 500 });
  }
}
