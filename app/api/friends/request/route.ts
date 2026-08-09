import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type RequestBody = {
  userId?: string;
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
      (await request.json()) as RequestBody;

    const targetUserId =
      body.userId?.trim();

    if (!targetUserId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Arkadaş eklenecek kullanıcı zorunludur.",
        },
        { status: 400 },
      );
    }

    if (targetUserId === user.id) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Kendine arkadaşlık isteği gönderemezsin.",
        },
        { status: 400 },
      );
    }

    // Hedef kullanıcı gerçekten var mı?
    const {
      data: targetProfile,
      error: targetProfileError,
    } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        username,
        display_name
      `)
      .eq("id", targetUserId)
      .maybeSingle();

    if (targetProfileError) {
      console.error(
        "Hedef profil sorgu hatası:",
        targetProfileError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Kullanıcı kontrol edilemedi.",
        },
        { status: 500 },
      );
    }

    if (!targetProfile) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Kullanıcı bulunamadı.",
        },
        { status: 404 },
      );
    }

    // İki kullanıcı arasında zaten bir kayıt var mı?
    const {
      data: existingFriendship,
      error: existingError,
    } = await supabaseAdmin
      .from("friendships")
      .select(`
        id,
        requester_id,
        addressee_id,
        status
      `)
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`,
      )
      .maybeSingle();

    if (existingError) {
      console.error(
        "Mevcut arkadaşlık sorgu hatası:",
        existingError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Arkadaşlık durumu kontrol edilemedi.",
        },
        { status: 500 },
      );
    }

    if (existingFriendship) {
      if (
        existingFriendship.status ===
        "accepted"
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Bu kullanıcıyla zaten arkadaşsın.",
          },
          { status: 409 },
        );
      }

      if (
        existingFriendship.status ===
        "pending"
      ) {
        if (
          existingFriendship.requester_id ===
          user.id
        ) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "Arkadaşlık isteği zaten gönderilmiş.",
            },
            { status: 409 },
          );
        }

        return NextResponse.json(
          {
            ok: false,
            error:
              "Bu kullanıcı sana zaten arkadaşlık isteği göndermiş.",
          },
          { status: 409 },
        );
      }

      if (
        existingFriendship.status ===
        "rejected"
      ) {
        const {
          data: reopenedFriendship,
          error: reopenError,
        } = await supabaseAdmin
          .from("friendships")
          .update({
            requester_id: user.id,
            addressee_id: targetUserId,
            status: "pending",
          })
          .eq(
            "id",
            existingFriendship.id,
          )
          .select(`
            id,
            requester_id,
            addressee_id,
            status,
            created_at,
            updated_at
          `)
          .single();

        if (reopenError) {
          console.error(
            "Arkadaşlık yeniden gönderme hatası:",
            reopenError,
          );

          return NextResponse.json(
            {
              ok: false,
              error:
                "Arkadaşlık isteği gönderilemedi.",
            },
            { status: 500 },
          );
        }

        return NextResponse.json({
          ok: true,
          friendship:
            reopenedFriendship,
        });
      }
    }

    // Yeni arkadaşlık isteği oluştur
    const {
      data: friendship,
      error: insertError,
    } = await supabaseAdmin
      .from("friendships")
      .insert({
        requester_id: user.id,
        addressee_id: targetUserId,
        status: "pending",
      })
      .select(`
        id,
        requester_id,
        addressee_id,
        status,
        created_at,
        updated_at
      `)
      .single();

    if (insertError) {
      console.error(
        "Arkadaşlık isteği insert hatası:",
        insertError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Arkadaşlık isteği gönderilemedi.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      friendship,
    });
  } catch (error) {
    console.error(
      "Friend request endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Arkadaşlık isteği gönderilemedi.",
      },
      { status: 500 },
    );
  }
}