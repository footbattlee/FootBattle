import { NextResponse } from "next/server";

import { ensureTicTacToeDuel, requireTicTacToeParticipant, type DuelSide } from "@/lib/tic-tac-toe/duel-server";
import { ensureTurnState, finalizeTurnDuel, otherSide } from "@/lib/tic-tac-toe/turn-duel";
import { supabaseAdmin } from "@/lib/supabase/server";

type Body = { action?: "forfeit" | "offer_draw" | "accept_draw" | "decline_draw" };

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const access = await requireTicTacToeParticipant(token);
    if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
    if (access.challenge.status !== "playing") return NextResponse.json({ ok: false, error: "Düello aktif değil." }, { status: 409 });

    const body = (await request.json()) as Body;
    const side = access.role as DuelSide;
    const duel = await ensureTicTacToeDuel(access.challenge);
    const turn = await ensureTurnState(duel.id);

    if (body.action === "forfeit") {
      const winner = otherSide(side);
      await finalizeTurnDuel(access.challenge, winner);
      return NextResponse.json({ ok: true, completed: true, winnerSide: winner, message: "Pes ettin. Rakip kazandı." });
    }

    if (body.action === "offer_draw") {
      if (turn.drawOfferBy === side) return NextResponse.json({ ok: true, drawOfferBy: side, message: "Beraberlik teklifin zaten bekliyor." });
      const now = new Date().toISOString();
      const { error } = await supabaseAdmin
        .from("tic_tac_toe_duels")
        .update({ draw_offer_by: side, updated_at: now })
        .eq("id", duel.id);
      if (error) throw error;
      return NextResponse.json({ ok: true, drawOfferBy: side, message: "Beraberlik teklifi gönderildi." });
    }

    if (body.action === "accept_draw") {
      if (!turn.drawOfferBy || turn.drawOfferBy === side) return NextResponse.json({ ok: false, error: "Kabul edilecek rakip beraberlik teklifi yok." }, { status: 409 });
      await finalizeTurnDuel(access.challenge, "draw");
      return NextResponse.json({ ok: true, completed: true, winnerSide: "draw", message: "Beraberlik kabul edildi." });
    }

    if (body.action === "decline_draw") {
      if (!turn.drawOfferBy || turn.drawOfferBy === side) return NextResponse.json({ ok: false, error: "Reddedilecek rakip beraberlik teklifi yok." }, { status: 409 });
      const now = new Date().toISOString();
      const { error } = await supabaseAdmin
        .from("tic_tac_toe_duels")
        .update({ draw_offer_by: null, updated_at: now })
        .eq("id", duel.id);
      if (error) throw error;
      return NextResponse.json({ ok: true, drawOfferBy: null, message: "Beraberlik teklifi reddedildi." });
    }

    return NextResponse.json({ ok: false, error: "Geçersiz işlem." }, { status: 400 });
  } catch (error) {
    console.error("Tic Tac Toe duel action error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "İşlem yapılamadı." }, { status: 500 });
  }
}
