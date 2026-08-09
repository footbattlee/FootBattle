import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type RespondBody = {
  friendshipId?: number;
  action?: "accept" | "reject";
};

export async function POST(
  request: Request,
) {
  try {
    const authSupabase =
      await createAuthServerClient();

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

    const body =
      (await request.json()) as RespondBody;

    const friendshipId =
      Number(body.friendshipId);

    const action =
      body.action;

    if (
      !Number.isInteger(
        friendshipId,
      ) ||
      friendshipId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Geçerli bir arkadaşlık isteği seçilmedi.",
        },
        { status: 400 },
      );
    }

    if (
      action !== "accept" &&
      action !== "reject"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Geçersiz arkadaşlık işlemi.",
        },
        { status: 400 },
      );
    }

    const {
      data: friendship,
      error: friendshipError,
    } = await supabaseAdmin
      .from("friendships")
      .select(`
        id,
        requester_id,
        addressee_id,
        status
      `)
      .eq("id", friendshipId)
      .maybeSingle();

    if (friendshipError) {
      console.error(
        "Arkadaşlık isteği okunamadı:",
        friendshipError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Arkadaşlık isteği kontrol edilemedi.",
        },
        { status: 500 },
      );
    }

    if (!friendship) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Arkadaşlık isteği bulunamadı.",
        },
        { status: 404 },
      );
    }

    if (
      friendship.addressee_id !==
      user.id
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu arkadaşlık isteğini cevaplama yetkin yok.",
        },
        { status: 403 },
      );
    }

    if (
      friendship.status !==
      "pending"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu arkadaşlık isteği artık beklemede değil.",
        },
        { status: 409 },
      );
    }

    const newStatus =
      action === "accept"
        ? "accepted"
        : "rejected";

    const {
      data: updatedFriendship,
      error: updateError,
    } = await supabaseAdmin
      .from("friendships")
      .update({
        status: newStatus,
      })
      .eq("id", friendshipId)
      .select(`
        id,
        requester_id,
        addressee_id,
        status,
        created_at,
        updated_at
      `)
      .single();

    if (updateError) {
      console.error(
        "Arkadaşlık isteği güncellenemedi:",
        updateError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Arkadaşlık isteği güncellenemedi.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      friendship:
        updatedFriendship,
    });
  } catch (error) {
    console.error(
      "Friend respond endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Arkadaşlık isteği işlenemedi.",
      },
      { status: 500 },
    );
  }
}