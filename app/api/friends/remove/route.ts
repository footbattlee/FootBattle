import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type RemoveBody = {
  friendshipId?: number;
};

export async function POST(request: Request) {
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
      (await request.json()) as RemoveBody;

    const friendshipId =
      Number(body.friendshipId);

    if (
      !Number.isInteger(friendshipId) ||
      friendshipId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Geçerli arkadaşlık kaydı seçilmedi.",
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
      throw friendshipError;
    }

    if (!friendship) {
      return NextResponse.json(
        {
          ok: false,
          error: "Arkadaşlık kaydı bulunamadı.",
        },
        { status: 404 },
      );
    }

    const userBelongsToFriendship =
      friendship.requester_id === user.id ||
      friendship.addressee_id === user.id;

    if (!userBelongsToFriendship) {
      return NextResponse.json(
        {
          ok: false,
          error: "Bu arkadaşlık üzerinde işlem yapamazsın.",
        },
        { status: 403 },
      );
    }

    /*
     * Pending istekte yalnızca isteği gönderen kişi iptal edebilir.
     */
    if (
      friendship.status === "pending" &&
      friendship.requester_id !== user.id
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Sana gelen isteği iptal edemezsin. Kabul veya reddetmelisin.",
        },
        { status: 403 },
      );
    }

    const { error: deleteError } =
      await supabaseAdmin
        .from("friendships")
        .delete()
        .eq("id", friendshipId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(
      "Friend remove endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Arkadaşlık kaldırılamadı.",
      },
      { status: 500 },
    );
  }
}