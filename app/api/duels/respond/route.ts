import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/server/push";

type RespondBody = { duelId?: number; action?: "accept" | "reject" };

function inviteToken() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

export async function POST(request: Request) {
  try {
    const auth = await createAuthServerClient();
    const { data: { user }, error: userError } = await auth.auth.getUser();
    if (userError || !user) return NextResponse.json({ ok: false, error: "Giriş yapmalısın." }, { status: 401 });

    const body = (await request.json()) as RespondBody;
    const duelId = Number(body.duelId);
    const action = body.action;
    if (!Number.isInteger(duelId) || duelId <= 0) return NextResponse.json({ ok: false, error: "Geçerli düello seçilmedi." }, { status: 400 });
    if (action !== "accept" && action !== "reject") return NextResponse.json({ ok: false, error: "Geçersiz işlem." }, { status: 400 });

    const { data: duel, error: duelError } = await supabaseAdmin
      .from("duels")
      .select("id,challenger_id,opponent_id,game_code,status,challenge_token")
      .eq("id", duelId)
      .maybeSingle();
    if (duelError) return NextResponse.json({ ok: false, error: "Düello okunamadı." }, { status: 500 });
    if (!duel) return NextResponse.json({ ok: false, error: "Düello bulunamadı." }, { status: 404 });
    if (duel.opponent_id !== user.id) return NextResponse.json({ ok: false, error: "Bu düello davetine cevap veremezsin." }, { status: 403 });
    if (duel.status !== "pending") return NextResponse.json({ ok: false, error: "Bu düello daveti artık beklemede değil." }, { status: 409 });

    const now = new Date().toISOString();

    if (action === "reject") {
      const { data: updated, error } = await supabaseAdmin
        .from("duels")
        .update({ status: "rejected", updated_at: now })
        .eq("id", duelId)
        .eq("status", "pending")
        .select("id,status,game_code")
        .maybeSingle();
      if (error || !updated) return NextResponse.json({ ok: false, error: "Düello reddedilemedi." }, { status: 409 });

      const { data: profile } = await supabaseAdmin.from("profiles").select("display_name,username").eq("id", user.id).maybeSingle();
      const name = profile?.display_name ?? profile?.username ?? "Rakibin";
      void sendPushToUser(duel.challenger_id, {
        title: "Düello reddedildi",
        body: `${name} düello davetini reddetti.`,
        url: "/tr/duels",
        type: "duel_update",
      }).catch(() => undefined);

      return NextResponse.json({ ok: true, message: "Düello daveti reddedildi.", duel: updated });
    }

    let token: string | null = duel.challenge_token ?? null;

    if (duel.game_code === "tic_tac_toe" && !token) {
      const { data: profiles, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id,display_name,username")
        .in("id", [duel.challenger_id, duel.opponent_id]);
      if (profileError) return NextResponse.json({ ok: false, error: "Oyuncular hazırlanamadı." }, { status: 500 });
      const challenger = profiles?.find((item) => item.id === duel.challenger_id);
      const opponent = profiles?.find((item) => item.id === duel.opponent_id);
      token = inviteToken();
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

      const { error: challengeError } = await supabaseAdmin.from("guest_challenges").insert({
        invite_token: token,
        game_code: "tic_tac_toe",
        status: "ready",
        challenger_user_id: duel.challenger_id,
        challenger_guest_id: null,
        challenger_name: challenger?.display_name ?? challenger?.username ?? "FootBattle Oyuncusu",
        opponent_user_id: duel.opponent_id,
        opponent_guest_id: null,
        opponent_name: opponent?.display_name ?? opponent?.username ?? "FootBattle Oyuncusu",
        challenger_score: 0,
        opponent_score: 0,
        winner_side: null,
        joined_at: now,
        expires_at: expiresAt,
      });
      if (challengeError) {
        console.error("Tic Tac Toe direct challenge creation failed", challengeError);
        return NextResponse.json({ ok: false, error: "Tic Tac Toe düellosu hazırlanamadı." }, { status: 500 });
      }
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("duels")
      .update({
        status: "accepted",
        accepted_at: now,
        updated_at: now,
        challenge_token: token,
      })
      .eq("id", duelId)
      .eq("status", "pending")
      .select("id,challenger_id,opponent_id,game_code,status,challenge_token,accepted_at")
      .maybeSingle();
    if (updateError || !updated) return NextResponse.json({ ok: false, error: "Düello kabul edilemedi." }, { status: 409 });

    const { data: profile } = await supabaseAdmin.from("profiles").select("display_name,username").eq("id", user.id).maybeSingle();
    const name = profile?.display_name ?? profile?.username ?? "Rakibin";
    void sendPushToUser(duel.challenger_id, {
      title: "Düello kabul edildi ⚔️",
      body: `${name} davetini kabul etti. Maç hazırlanıyor.`,
      url: "/tr/duels",
      type: "duel_update",
    }).catch(() => undefined);

    return NextResponse.json({
      ok: true,
      message: "Düello kabul edildi. Maç hazırlanıyor...",
      duel: updated,
      game: token && duel.game_code === "tic_tac_toe" ? { url: `/tic-tac-toe/duel/${token}` } : { url: `/duels/${duelId}` },
    });
  } catch (error) {
    console.error("Duel respond endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Düello daveti cevaplanamadı." }, { status: 500 });
  }
}
