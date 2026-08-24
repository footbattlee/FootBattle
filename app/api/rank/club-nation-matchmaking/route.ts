import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const BOT_FALLBACK_MS = 7000;
const FRESH_MS = 30000;

async function userId() {
  const auth = await createAuthServerClient();
  const { data: { user } } = await auth.auth.getUser();
  return user?.id ?? null;
}

async function name(id: string) {
  const { data } = await supabaseAdmin.from("profiles").select("display_name,username").eq("id", id).maybeSingle();
  return String(data?.display_name ?? data?.username ?? "FootBattle Oyuncusu");
}

async function createChallenge(a: string, b: string | null, bot: boolean) {
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from("guest_challenges").insert({
    invite_token: token,
    game_code: "club_nation",
    status: "playing",
    challenger_user_id: a,
    challenger_name: await name(a),
    challenger_guest_id: null,
    opponent_user_id: bot ? null : b,
    opponent_name: bot ? "Bot Eren :)" : b ? await name(b) : "Rakip",
    opponent_guest_id: bot ? crypto.randomUUID() : null,
    challenger_score: 0,
    opponent_score: 0,
    winner_side: null,
    joined_at: now,
    started_at: now,
    expires_at: new Date(Date.now() + 6 * 3600000).toISOString(),
    updated_at: now,
  });
  if (error) throw error;
  return token;
}

async function existing(id: string) {
  const { data } = await supabaseAdmin.from("ranked_matches")
    .select("id,game_code,status,player_a_id,player_b_id,opponent_kind,bot_name,challenge_token")
    .eq("game_code", "club_nation")
    .in("status", ["ready", "active"])
    .or(`player_a_id.eq.${id},player_b_id.eq.${id}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function createMatch(a: string, b: string | null, bot: boolean) {
  const token = await createChallenge(a, b, bot);
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin.from("ranked_matches").insert({
    game_code: "club_nation",
    status: "active",
    player_a_id: a,
    player_b_id: bot ? null : b,
    opponent_kind: bot ? "bot" : "human",
    bot_name: bot ? "Bot Eren :)" : null,
    challenge_token: token,
    started_at: now,
    updated_at: now,
  }).select("id,game_code,status,player_a_id,player_b_id,opponent_kind,bot_name,challenge_token").single();

  if (error) {
    await supabaseAdmin.from("guest_challenges").delete().eq("invite_token", token);
    throw error;
  }
  return data;
}

export async function POST() {
  try {
    const id = await userId();
    if (!id) return NextResponse.json({ ok: false, error: "Giriş yapmalısın." }, { status: 401 });

    const active = await existing(id);
    if (active) return NextResponse.json({ ok: true, state: "matched", match: active, resumed: true });

    // Kuyruğa ilk giriş zamanını bir kez oluştur. Sonraki poll'larda created_at'i asla yenileme;
    // Bot fallback süresi bu timestamp üzerinden deterministik hesaplanır.
    let { data: mine } = await supabaseAdmin.from("ranked_match_queue")
      .select("user_id,game_code,created_at")
      .eq("user_id", id)
      .maybeSingle();

    if (!mine || mine.game_code !== "club_nation") {
      const now = new Date().toISOString();
      const { data: queued, error: queueError } = await supabaseAdmin.from("ranked_match_queue")
        .upsert({ user_id: id, game_code: "club_nation", created_at: now, updated_at: now }, { onConflict: "user_id" })
        .select("user_id,game_code,created_at")
        .single();
      if (queueError) throw queueError;
      mine = queued;
    }

    const age = Math.max(0, Date.now() - new Date(mine.created_at).getTime());

    // 7 saniye dolduysa başka bir istemcinin koordinasyonuna bağımlı kalma.
    // Aktif maç yoksa Bot Eren :) kesin olarak devreye girer.
    if (age >= BOT_FALLBACK_MS) {
      const again = await existing(id);
      if (again) return NextResponse.json({ ok: true, state: "matched", match: again, resumed: true });

      const match = await createMatch(id, null, true);
      await supabaseAdmin.from("ranked_match_queue").delete().eq("user_id", id);
      return NextResponse.json({ ok: true, state: "matched", match });
    }

    // İlk 7 saniye boyunca gerçek oyuncuya öncelik ver.
    const since = new Date(Date.now() - FRESH_MS).toISOString();
    const { data: candidate } = await supabaseAdmin.from("ranked_match_queue")
      .select("user_id,created_at")
      .eq("game_code", "club_nation")
      .neq("user_id", id)
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (candidate?.user_id) {
      const coordinator = [id, candidate.user_id].sort()[0];
      if (coordinator === id) {
        const beforeCreate = await existing(id);
        if (beforeCreate) return NextResponse.json({ ok: true, state: "matched", match: beforeCreate, resumed: true });

        const match = await createMatch(id, candidate.user_id, false);
        await supabaseAdmin.from("ranked_match_queue").delete().in("user_id", [id, candidate.user_id]);
        return NextResponse.json({ ok: true, state: "matched", match });
      }
    }

    return NextResponse.json({
      ok: true,
      state: "searching",
      elapsedMs: age,
      botInMs: Math.max(0, BOT_FALLBACK_MS - age),
    });
  } catch (error) {
    console.error("Club Nation ranked matchmaking error", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Rakip aranamadı." }, { status: 500 });
  }
}

export async function DELETE() {
  const id = await userId();
  if (!id) return NextResponse.json({ ok: false }, { status: 401 });
  await supabaseAdmin.from("ranked_match_queue").delete().eq("user_id", id).eq("game_code", "club_nation");
  return NextResponse.json({ ok: true });
}
