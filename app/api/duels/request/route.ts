import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type RequestBody = { opponentId?: string; gameCode?: string };

export async function POST(request: Request) {
  try {
    const authSupabase = await createAuthServerClient();
    const { data: { user }, error: userError } = await authSupabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ ok: false, error: "Giriş yapmalısın." }, { status: 401 });

    const body = (await request.json()) as RequestBody;
    const opponentId = body.opponentId?.trim();
    const gameCode = body.gameCode?.trim().toLowerCase();
    if (!opponentId) return NextResponse.json({ ok: false, error: "Rakip kullanıcı seçilmedi." }, { status: 400 });
    if (!gameCode || !/^[a-z0-9_]{2,50}$/.test(gameCode)) return NextResponse.json({ ok: false, error: "Geçersiz oyun kodu." }, { status: 400 });
    if (opponentId === user.id) return NextResponse.json({ ok: false, error: "Kendine düello gönderemezsin." }, { status: 400 });

    const { data: opponent, error: opponentError } = await supabaseAdmin.from("profiles").select("id,username,display_name,avatar_url").eq("id", opponentId).maybeSingle();
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

    // Eski, cevaplanmamış arkadaş davetlerini otomatik kapat.
    await supabaseAdmin
      .from("duels")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString());

    const { data: existingDuels, error: existingError } = await supabaseAdmin
      .from("duels")
      .select("id,challenger_id,opponent_id,game_code,status,created_at,expires_at")
      .eq("game_code", gameCode)
      .in("status", ["pending", "accepted", "active"])
      .or(`and(challenger_id.eq.${user.id},opponent_id.eq.${opponentId}),and(challenger_id.eq.${opponentId},opponent_id.eq.${user.id})`)
      .limit(1);
    if (existingError) return NextResponse.json({ ok: false, error: "Mevcut düellolar kontrol edilemedi." }, { status: 500 });
    if (existingDuels?.[0]) return NextResponse.json({ ok: false, error: "Bu oyuncuyla bu oyun için zaten açık bir düellon var.", duel: existingDuels[0] }, { status: 409 });

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const { data: duel, error: insertError } = await supabaseAdmin
      .from("duels")
      .insert({
        challenger_id: user.id,
        opponent_id: opponentId,
        game_code: gameCode,
        status: "pending",
        challenger_score: 0,
        opponent_score: 0,
        invite_type: "friend",
        expires_at: expiresAt,
      })
      .select("*")
      .single();
    if (insertError) return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });

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
