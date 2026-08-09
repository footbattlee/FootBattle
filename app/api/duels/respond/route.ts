import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type RespondBody = {
  duelId?: number;
  action?: "accept" | "reject";
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

    const currentUserId = user.id;

    const body =
      (await request.json()) as RespondBody;

    const duelId =
      Number(body.duelId);

    const action =
      body.action;

    if (
      !Number.isInteger(duelId) ||
      duelId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Geçerli düello seçilmedi.",
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
          error: "Geçersiz işlem.",
        },
        { status: 400 },
      );
    }

    const {
      data: duel,
      error: duelError,
    } = await supabaseAdmin
      .from("duels")
      .select(`
        id,
        challenger_id,
        opponent_id,
        game_code,
        status
      `)
      .eq("id", duelId)
      .maybeSingle();

    if (duelError) {
      console.error(
        "Düello sorgu hatası:",
        duelError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Düello okunamadı.",
        },
        { status: 500 },
      );
    }

    if (!duel) {
      return NextResponse.json(
        {
          ok: false,
          error: "Düello bulunamadı.",
        },
        { status: 404 },
      );
    }

    if (
      duel.opponent_id !==
      currentUserId
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu düello davetine cevap veremezsin.",
        },
        { status: 403 },
      );
    }

    if (
      duel.status !==
      "pending"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu düello daveti artık beklemede değil.",
        },
        { status: 409 },
      );
    }

    const now =
      new Date().toISOString();

    if (action === "accept") {
      const {
        data: updatedDuel,
        error: updateError,
      } = await supabaseAdmin
        .from("duels")
        .update({
          status: "accepted",
          accepted_at: now,
          updated_at: now,
        })
        .eq("id", duelId)
        .eq("status", "pending")
        .select(`
          id,
          challenger_id,
          opponent_id,
          game_code,
          status,
          challenger_score,
          opponent_score,
          winner_id,
          created_at,
          accepted_at,
          started_at,
          completed_at,
          updated_at
        `)
        .maybeSingle();

      if (updateError) {
        console.error(
          "Düello kabul hatası:",
          updateError,
        );

        return NextResponse.json(
          {
            ok: false,
            error:
              "Düello kabul edilemedi.",
          },
          { status: 500 },
        );
      }

      if (!updatedDuel) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Düello güncellenemedi.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json({
        ok: true,
        message:
          "Düello daveti kabul edildi.",
        duel: updatedDuel,
      });
    }

    const {
      data: updatedDuel,
      error: updateError,
    } = await supabaseAdmin
      .from("duels")
      .update({
        status: "rejected",
        updated_at: now,
      })
      .eq("id", duelId)
      .eq("status", "pending")
      .select(`
        id,
        challenger_id,
        opponent_id,
        game_code,
        status,
        created_at,
        updated_at
      `)
      .maybeSingle();

    if (updateError) {
      console.error(
        "Düello reddetme hatası:",
        updateError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Düello reddedilemedi.",
        },
        { status: 500 },
      );
    }

    if (!updatedDuel) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Düello güncellenemedi.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      ok: true,
      message:
        "Düello daveti reddedildi.",
      duel: updatedDuel,
    });
  } catch (error) {
    console.error(
      "Duel respond endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Düello daveti cevaplanamadı.",
      },
      { status: 500 },
    );
  }
}