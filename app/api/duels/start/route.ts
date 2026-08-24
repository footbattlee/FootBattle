import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type StartBody = { duelId?: number };
type PrepareResponse = { ok?: boolean; error?: string };

async function prepareClubClash(request: Request, duelId: number) {
  const url = new URL(`/api/duels/${duelId}/club-clash/prepare`, request.url);
  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(url, { method: "POST", headers, cache: "no-store" });
  const result = (await response.json()) as PrepareResponse;
  if (!response.ok || !result.ok) throw new Error(result.error ?? "2 Takım 1 Oyuncu hazırlanamadı.");
}

function gameUrl(gameCode: string, duelId: number, token: string | null) {
  if (gameCode === "tic_tac_toe" && token) return `/tic-tac-toe/duel/${token}`;
  if (gameCode === "club_nation" && token) return `/challenge/${token}`;
  return `/duels/${duelId}`;
}

export async function POST(request: Request) {
  try {
    const auth = await createAuthServerClient();
    const { data: { user }, error: userError } = await auth.auth.getUser();
    if (userError || !user) return NextResponse.json({ ok: false, error: "Giriş yapmalısın." }, { status: 401 });

    const body = (await request.json()) as StartBody;
    const duelId = Number(body.duelId);
    if (!Number.isInteger(duelId) || duelId <= 0) return NextResponse.json({ ok: false, error: "Geçerli düello seçilmedi." }, { status: 400 });

    const { data: duel, error: duelError } = await supabaseAdmin
      .from("duels")
      .select("id,challenger_id,opponent_id,game_code,status,challenge_token,started_at")
      .eq("id", duelId)
      .maybeSingle();
    if (duelError) return NextResponse.json({ ok: false, error: "Düello okunamadı." }, { status: 500 });
    if (!duel) return NextResponse.json({ ok: false, error: "Düello bulunamadı." }, { status: 404 });
    if (duel.challenger_id !== user.id && duel.opponent_id !== user.id) return NextResponse.json({ ok: false, error: "Bu düelloyu başlatamazsın." }, { status: 403 });

    if (duel.status === "active") {
      if (duel.game_code === "club_clash") await prepareClubClash(request, duelId);
      return NextResponse.json({ ok: true, alreadyStarted: true, duel, game: { url: gameUrl(duel.game_code, duel.id, duel.challenge_token ?? null) } });
    }

    if (duel.status !== "accepted") return NextResponse.json({ ok: false, error: "Yalnızca kabul edilmiş düellolar başlatılabilir." }, { status: 409 });

    const now = new Date().toISOString();
    const challengeBackedGame = duel.game_code === "tic_tac_toe" || duel.game_code === "club_nation";

    if (challengeBackedGame) {
      if (!duel.challenge_token) return NextResponse.json({ ok: false, error: "Oyun bağlantısı hazırlanmadı." }, { status: 409 });
      const { data: challenge, error: challengeError } = await supabaseAdmin
        .from("guest_challenges")
        .update({ status: "playing", started_at: now, updated_at: now })
        .eq("invite_token", duel.challenge_token)
        .in("status", ["ready", "playing"])
        .select("id,status,invite_token")
        .maybeSingle();
      if (challengeError || !challenge) return NextResponse.json({ ok: false, error: "Düello oyunu başlatılamadı." }, { status: 500 });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("duels")
      .update({ status: "active", started_at: now, updated_at: now })
      .eq("id", duelId)
      .eq("status", "accepted")
      .select("id,challenger_id,opponent_id,game_code,status,challenge_token,started_at")
      .maybeSingle();

    if (updateError || !updated) {
      const { data: latest } = await supabaseAdmin
        .from("duels")
        .select("id,challenger_id,opponent_id,game_code,status,challenge_token,started_at")
        .eq("id", duelId)
        .maybeSingle();
      if (latest?.status === "active") return NextResponse.json({ ok: true, alreadyStarted: true, duel: latest, game: { url: gameUrl(latest.game_code, latest.id, latest.challenge_token ?? null) } });
      return NextResponse.json({ ok: false, error: "Düello başlatılamadı." }, { status: 409 });
    }

    if (updated.game_code === "club_clash") {
      try {
        await prepareClubClash(request, duelId);
      } catch (error) {
        console.error("Club Clash prepare failed", error);
        return NextResponse.json({ ok: false, recoverable: true, error: error instanceof Error ? error.message : "Oyun hazırlanamadı.", duel: updated, game: { url: `/duels/${duelId}` } }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Düello başlatıldı. ⚔️",
      duel: updated,
      game: { url: gameUrl(updated.game_code, updated.id, updated.challenge_token ?? null) },
    });
  } catch (error) {
    console.error("Duel start endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Düello başlatılamadı." }, { status: 500 });
  }
}
