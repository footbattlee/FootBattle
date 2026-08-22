import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/server/push";

type RequestBody = { userId?: string };

export async function POST(request: Request) {
  try {
    const auth = await createAuthServerClient();
    const { data: { user }, error: userError } = await auth.auth.getUser();
    if (userError || !user) return NextResponse.json({ ok: false, error: "Giriş yapmalısın." }, { status: 401 });

    const body = (await request.json()) as RequestBody;
    const targetUserId = body.userId?.trim();
    if (!targetUserId) return NextResponse.json({ ok: false, error: "Arkadaş eklenecek kullanıcı zorunludur." }, { status: 400 });
    if (targetUserId === user.id) return NextResponse.json({ ok: false, error: "Kendine arkadaşlık isteği gönderemezsin." }, { status: 400 });

    const [{ data: targetProfile, error: targetError }, { data: requesterProfile }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,username,display_name").eq("id", targetUserId).maybeSingle(),
      supabaseAdmin.from("profiles").select("username,display_name").eq("id", user.id).maybeSingle(),
    ]);
    if (targetError) return NextResponse.json({ ok: false, error: "Kullanıcı kontrol edilemedi." }, { status: 500 });
    if (!targetProfile) return NextResponse.json({ ok: false, error: "Kullanıcı bulunamadı." }, { status: 404 });

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("friendships")
      .select("id,requester_id,addressee_id,status")
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`)
      .maybeSingle();
    if (existingError) return NextResponse.json({ ok: false, error: "Arkadaşlık durumu kontrol edilemedi." }, { status: 500 });
    if (existing?.status === "accepted") return NextResponse.json({ ok: false, error: "Bu kullanıcıyla zaten arkadaşsın." }, { status: 409 });
    if (existing?.status === "pending") {
      return NextResponse.json({ ok: false, error: existing.requester_id === user.id ? "Arkadaşlık isteği zaten gönderilmiş." : "Bu kullanıcı sana zaten arkadaşlık isteği göndermiş." }, { status: 409 });
    }

    const payload = {
      requester_id: user.id,
      addressee_id: targetUserId,
      status: "pending",
      updated_at: new Date().toISOString(),
    };

    const mutation = existing
      ? supabaseAdmin.from("friendships").update(payload).eq("id", existing.id)
      : supabaseAdmin.from("friendships").insert(payload);

    const { data: friendship, error: saveError } = await mutation
      .select("id,requester_id,addressee_id,status,created_at,updated_at")
      .single();
    if (saveError) return NextResponse.json({ ok: false, error: "Arkadaşlık isteği gönderilemedi." }, { status: 500 });

    const requesterName = requesterProfile?.display_name ?? requesterProfile?.username ?? user.email?.split("@")[0] ?? "Bir oyuncu";
    try {
      await sendPushToUser(targetUserId, {
        title: "Yeni arkadaşlık isteği 👥",
        body: `${requesterName} seni arkadaş olarak eklemek istiyor.`,
        url: "/tr/profile",
        type: "friend_request",
      });
    } catch (error) {
      console.error("Friend request push failed", error);
    }

    return NextResponse.json({ ok: true, friendship });
  } catch (error) {
    console.error("Friend request endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Arkadaşlık isteği gönderilemedi." }, { status: 500 });
  }
}
