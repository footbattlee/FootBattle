import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type StartBody = { duelId?: number };
type PrepareResponse = { ok?: boolean; error?: string };

const START_DELAY_MS = 5000;

function forwardedHeaders(request: Request) {
  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  return headers;
}

async function prepareClubClash(request: Request, duelId: number) {
  const url = new URL(`/api/duels/${duelId}/club-clash/prepare`, request.url);
  const response = await fetch(url, { method: "POST", headers: forwardedHeaders(request), cache: "no-store" });
  const result = (await response.json()) as PrepareResponse;
  if (!response.ok || !result.ok) throw new Error(result.error ?? "2 Takım 1 Oyuncu hazırlanamadı.");
}

async function prepareClubNation(request: Request, token: string) {
  const url = new URL(`/api/challenges/${encodeURIComponent(token)}/club-nation/prepare`, request.url);
  const response = await fetch(url, { method: "POST", headers: forwardedHeaders(request), cache: "no-store" });
  const result = (await response.json()) as PrepareResponse;
  if (!response.ok || !result.ok) throw new Error(result.error ?? "1 Takım 1 Millet hazırlanamadı.");
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
      return NextResponse.json({
        ok: true,
        alreadyStarted: true,
        duel,
        startsAt: duel.started_at,
        game: { url: gameUrl(duel.game_code, duel.id, duel.challenge_token ?? null) },
      });
    }

    if (duel.status !== "accepted") return NextResponse.json({ ok: false, error: "Yalnızca kabul edilmiş düellolar başlatılabilir." }, { status: 409 });

    try {
      if (duel.game_code === "club_clash") {
        await prepareClubClash(request, duelId);
      } else if (duel.game_code === "club_nation") {
        if (!duel.challenge_token) return NextResponse.json({ ok: false, error: "Oyun bağlantısı hazırlanmadı." }, { status: 409 });
        await prepareClubNation(request, duel.challenge_token);
      }
    } catch (error) {
      console.error("Duel prepare failed", error);
      return NextResponse.json({
        ok: false,
        recoverable: true,
        error: error instanceof Error ? error.message : "Oyun hazırlanamadı.",
      }, { status: 500 });
    }

    const now = new Date();
    const startsAt = new Date(now.getTime() + START_DELAY_MS).toISOString();
    const nowIso = now.toISOString();
    const challengeBackedGame = duel.game_code === "tic_tac_toe" || duel.game_code === "club_nation";

    if (challengeBackedGame) {
      if (!duel.challenge_token) return NextResponse.json({ ok: false, error: "Oyun bağlantısı hazırlanmadı." }, { status: 409 });
      const { data: challenge, error: challengeError } = await supabaseAdmin
        .from("guest_challenges")
        .update({ status: "playing", started_at: startsAt, updated_at: nowIso })
        .eq("invite_token", duel.challenge_token)
        .in("status", ["ready", "playing"])
        .select("id,status,invite_token,started_at")
        .maybeSingle();
      if (challengeError || !challenge) return NextResponse.json({ ok: false, error: "Düello oyunu başlatılamadı." }, { status: 500 });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("duels")
      .update({ status: "active", started_at: startsAt, updated_at: nowIso })
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
      if (latest?.status === "active") {
        return NextResponse.json({
          ok: true,
          alreadyStarted: true,
          duel: latest,
          startsAt: latest.started_at,
          game: { url: gameUrl(latest.game_code, latest.id, latest.challenge_token ?? null) },
        });
      }
      return NextResponse.json({ ok: false, error: "Düello başlatılamadı." }, { status: 409 });
    }

    return NextResponse.json({
      ok: true,
      message: "Oyun hazır. Ortak başlangıç sayacı başladı. ⚔️",
      duel: updated,
      startsAt: updated.started_at,
      game: { url: gameUrl(updated.game_code, updated.id, updated.challenge_token ?? null) },
    });
  } catch (error) {
    console.error("Duel start endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Düello başlatılamadı." }, { status: 500 });
  }
}
