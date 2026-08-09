import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type RequestBody = {
  opponentId?: string;
  gameCode?: string;
};

export async function POST(request: Request) {
  try {
    // --------------------------------------------------
    // 1. Giriş yapan kullanıcı
    // --------------------------------------------------

    const authSupabase = await createAuthServerClient();

    const {
      data: { user },
      error: userError,
    } = await authSupabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: "Giriş yapmalısın.",
        },
        { status: 401 },
      );
    }

    // --------------------------------------------------
    // 2. Body
    // --------------------------------------------------

    const body = (await request.json()) as RequestBody;

    const opponentId = body.opponentId?.trim();
    const gameCode = body.gameCode?.trim().toLowerCase();

    if (!opponentId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Rakip kullanıcı seçilmedi.",
        },
        { status: 400 },
      );
    }

    if (!gameCode) {
      return NextResponse.json(
        {
          ok: false,
          error: "Düello oyunu seçilmedi.",
        },
        { status: 400 },
      );
    }

    // Sadece güvenli game_code formatına izin veriyoruz.
    if (!/^[a-z0-9_]{2,50}$/.test(gameCode)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Geçersiz oyun kodu.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 3. Kendine düello gönderemez
    // --------------------------------------------------

    if (opponentId === user.id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Kendine düello gönderemezsin.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 4. Rakip gerçekten var mı?
    // --------------------------------------------------

    const {
      data: opponent,
      error: opponentError,
    } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        username,
        display_name,
        avatar_url
      `)
      .eq("id", opponentId)
      .maybeSingle();

    if (opponentError) {
      console.error("Rakip sorgu hatası:", opponentError);

      return NextResponse.json(
        {
          ok: false,
          error: "Rakip kullanıcı kontrol edilemedi.",
        },
        { status: 500 },
      );
    }

    if (!opponent) {
      return NextResponse.json(
        {
          ok: false,
          error: "Rakip kullanıcı bulunamadı.",
        },
        { status: 404 },
      );
    }

    // --------------------------------------------------
    // 5. Arkadaşlık kontrolü
    // --------------------------------------------------

    const {
      data: friendships,
      error: friendshipError,
    } = await supabaseAdmin
      .from("friendships")
      .select(`
        id,
        requester_id,
        addressee_id,
        status
      `)
      .eq("status", "accepted")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${opponentId}),and(requester_id.eq.${opponentId},addressee_id.eq.${user.id})`,
      )
      .limit(1);

    if (friendshipError) {
      console.error(
        "Arkadaşlık kontrol hatası:",
        friendshipError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Arkadaşlık durumu kontrol edilemedi.",
        },
        { status: 500 },
      );
    }

    if (!friendships || friendships.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Sadece arkadaşlarına düello gönderebilirsin.",
        },
        { status: 403 },
      );
    }

    // --------------------------------------------------
    // 6. Aynı oyuncuyla açık düello var mı?
    // --------------------------------------------------

    const {
      data: existingDuels,
      error: existingError,
    } = await supabaseAdmin
      .from("duels")
      .select(`
        id,
        challenger_id,
        opponent_id,
        game_code,
        status,
        created_at
      `)
      .eq("game_code", gameCode)
      .in("status", [
        "pending",
        "accepted",
        "active",
      ])
      .or(
        `and(challenger_id.eq.${user.id},opponent_id.eq.${opponentId}),and(challenger_id.eq.${opponentId},opponent_id.eq.${user.id})`,
      )
      .limit(1);

    if (existingError) {
      console.error(
        "Mevcut düello kontrol hatası:",
        existingError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Mevcut düellolar kontrol edilemedi.",
        },
        { status: 500 },
      );
    }

    const existingDuel = existingDuels?.[0];

    if (existingDuel) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu oyuncuyla bu oyun için zaten açık bir düellon var.",
          duel: existingDuel,
        },
        { status: 409 },
      );
    }

    // --------------------------------------------------
    // 7. Düello oluştur
    // --------------------------------------------------

    const {
      data: duel,
      error: insertError,
    } = await supabaseAdmin
      .from("duels")
      .insert({
        challenger_id: user.id,
        opponent_id: opponentId,
        game_code: gameCode,
        status: "pending",
        challenger_score: 0,
        opponent_score: 0,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error(
        "Düello oluşturma hatası:",
        insertError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: insertError.message,
        },
        { status: 500 },
      );
    }

    // --------------------------------------------------
    // 8. Başarılı
    // --------------------------------------------------

    return NextResponse.json({
      ok: true,
      message: "Düello daveti gönderildi.",

      duel,

      opponent: {
        id: opponent.id,
        username: opponent.username,

        displayName:
          opponent.display_name ??
          opponent.username ??
          "FootBattle Oyuncusu",

        avatarUrl:
          opponent.avatar_url ?? null,
      },
    });
  } catch (error) {
    console.error(
      "Duel request endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Düello daveti gönderilemedi.",
      },
      { status: 500 },
    );
  }
}