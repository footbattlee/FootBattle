import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/server/push";

type RequestBody = { opponentId?: string; gameCode?: string };

const GAME_LABELS: Record<string, string> = {
  tic_tac_toe: "Futbol Tic Tac Toe",
  club_clash: "2 Takım 1 Oyuncu",
};

export async function POST(request: Request) {
  try {
    const auth = await createAuthServerClient();
    const { data: { user }, error: userError } = await auth.auth.getUser();
    if (userError || !user) return NextResponse.json({ ok: false, error: "Giriş yapmalısın." }, { status: 401 });

    const body = (await request.json()) as RequestBody;
    const opponentId = body.opponentId?.trim();
    const gameCode = body.gameCode?.trim().toLowerCase();
    if (!opponentId) return NextResponse.json({ ok: false, error: "Rakip kullanıcı seçilmedi." }, { status: 400 });
    if (!gameCode || !/^[a-z0-9_]{2,50}$/.test(gameCode)) return NextResponse.json({ ok: false, error: "Geçersiz oyun kodu." }, { status: 400 });
    if (!Object.hasOwn(GAME_LABELS, gameCode)) return NextResponse.json({ ok: false, error: "Bu oyun doğrudan düelloyu desteklemiyor." }, { status: 400 });
    if (opponentId === user.id) return NextResponse.json({ ok: false, error: "Kendine düello gönderemezsin." }, { status: 400 });

    const [{ data: opponent, error: opponentError }, { data: challenger }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,username,display_name,avatar_url").eq("id", opponentId).maybeSingle(),
      supabaseAdmin.from("profiles").select("username,display_name").eq("id", user.id).maybeSingle(),
    ]);
    if (opponentError) return NextResponse.json({ ok: false, error: "Rakip kullanıcı kontrol edilemedi." }, { status: 500 });
    if (!opponent) return NextResponse.json({ ok: false, error: "Rakip kullanıcı bulunamadı." }, { status: 404 });

    const { data: friendships, error: friendshipError } = await supabaseAdmin
      .from("friendships")
      .select("id")
      .eq("status", "accepted")
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${opponentId}),and(requester_id.eq.${opponentId},addressee_id.eq.${user.id})`)
      .limit(1);
    if (friendshipError) return NextResponse.json({ ok: false, error: "Arkadaşlık durumu kontrol edilemedi." }, { status: 500 });
    if (!friendships?.length) return NextResponse.json({ ok: false, error: "Sadece arkadaşlarına düello gönderebilirsin." }, { status: 403 });

    const now = new Date().toISOString();
    await supabaseAdmin.from("duels").update({ status: "cancelled", updated_at: now }).eq("status", "pending").lt("expires_at", now);

    const { data: existingDuels, error: existingError } = await supabaseAdmin
      .from("duels")
      .select("id,status")
      .eq("game_code", gameCode)
      .in("status", ["pending", "accepted", "active"])
      .or(`and(challenger_id.eq.${user.id},opponent_id.eq.${opponentId}),and(challenger_id.eq.${opponentId},opponent_id.eq.${user.id})`)
      .limit(1);
    if (existingError) return NextResponse.json({ ok: false, error: "Mevcut düellolar kontrol edilemedi." }, { status: 500 });
    if (existingDuels?.[0]) return NextResponse.json({ ok: false, error: "Bu oyuncuyla bu oyun için zaten açık bir düellon var.", duel: existingDuels[0] }, { status: 409 });

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const { data: duel, error: insertError } = await supabaseAdmin.from("duels").insert({
      challenger_id: user.id,
      opponent_id: opponentId,
      game_code: gameCode,
      status: "pending",
      challenger_score: 0,
      opponent_score: 0,
      invite_type: "friend",
      expires_at: expiresAt,
    }).select("*").single();
    if (insertError) return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });

    const challengerName = challenger?.display_name ?? challenger?.username ?? user.email?.split("@")[0] ?? "Bir oyuncu";
    void sendPushToUser(opponentId, {
      title: "Yeni düello daveti ⚔️",
      body: `${challengerName} seni ${GAME_LABELS[gameCode]} düellosuna davet etti.`,
      url: "/tr/duels",
      type: "duel_invite",
    }).catch((error) => console.error("Duel invite push failed", error));

    return NextResponse.json({
      ok: true,
      message: "Düello daveti gönderildi.",
      duel,
      opponent: {
        id: opponent.id,
        username: opponent.username,
        displayName: opponent.display_name ?? opponent.username ?? "FootBattle Oyuncusu",
        avatarUrl: opponent.avatar_url ?? null,
      },
    });
  } catch (error) {
    console.error("Duel request endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Düello daveti gönderilemedi." }, { status: 500 });
  }
}
