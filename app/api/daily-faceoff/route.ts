import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const COOKIE_NAME = "footbattle_faceoff_voter";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

type VoteChoice = "left" | "right";

function todayInIstanbul() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function identity() {
  const auth = await createAuthServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (user) return { userId: user.id, voterKey: `u:${user.id}`, guestToken: null as string | null };

  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value?.trim();
  const token = existing && existing.length >= 16 ? existing : crypto.randomUUID().replace(/-/g, "");
  return { userId: null, voterKey: `g:${token}`, guestToken: existing ? null : token };
}

async function getTodayFaceoff() {
  const date = todayInIstanbul();
  const { data, error } = await supabaseAdmin
    .from("daily_faceoffs")
    .select("id, match_date, title, category, left_name, right_name")
    .eq("match_date", date)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getCounts(faceoffId: string) {
  const { data, error } = await supabaseAdmin.from("daily_faceoff_votes").select("choice").eq("faceoff_id", faceoffId);
  if (error) throw error;
  const rows = data ?? [];
  const left = rows.filter((row) => row.choice === "left").length;
  const right = rows.filter((row) => row.choice === "right").length;
  const total = left + right;
  return {
    left, right, total,
    leftPercent: total > 0 ? Math.round((left / total) * 100) : 50,
    rightPercent: total > 0 ? Math.round((right / total) * 100) : 50,
  };
}

function attachGuestCookie(response: NextResponse, token: string | null) {
  if (!token) return response;
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return response;
}

export async function GET() {
  try {
    const faceoff = await getTodayFaceoff();
    if (!faceoff) return NextResponse.json({ ok: true, available: false });

    const id = await identity();
    const { data: vote, error: voteError } = await supabaseAdmin
      .from("daily_faceoff_votes").select("choice")
      .eq("faceoff_id", faceoff.id).eq("voter_key", id.voterKey).maybeSingle();
    if (voteError) throw voteError;

    const voted = vote?.choice === "left" || vote?.choice === "right";
    const counts = voted ? await getCounts(faceoff.id) : null;
    const response = NextResponse.json({
      ok: true,
      available: true,
      faceoff: { id: faceoff.id, date: faceoff.match_date, title: faceoff.title, category: faceoff.category, left: faceoff.left_name, right: faceoff.right_name },
      voted,
      choice: voted ? vote.choice : null,
      results: counts,
    });
    return attachGuestCookie(response, id.guestToken);
  } catch (error) {
    console.error("Daily faceoff GET error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Kapışma yüklenemedi." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { choice?: VoteChoice } | null;
    if (body?.choice !== "left" && body?.choice !== "right") {
      return NextResponse.json({ ok: false, error: "Geçersiz oy." }, { status: 400 });
    }

    const faceoff = await getTodayFaceoff();
    if (!faceoff) return NextResponse.json({ ok: false, error: "Bugün için aktif kapışma yok." }, { status: 404 });

    const id = await identity();
    const { error: insertError } = await supabaseAdmin.from("daily_faceoff_votes").insert({
      faceoff_id: faceoff.id,
      voter_key: id.voterKey,
      user_id: id.userId,
      choice: body.choice,
    });
    if (insertError && insertError.code !== "23505") throw insertError;

    const alreadyVoted = Boolean(insertError?.code === "23505");
    const { data: storedVote, error: storedVoteError } = await supabaseAdmin
      .from("daily_faceoff_votes").select("choice")
      .eq("faceoff_id", faceoff.id).eq("voter_key", id.voterKey).single();
    if (storedVoteError) throw storedVoteError;

    let rankReward: Record<string, unknown> | null = null;
    if (id.userId && !alreadyVoted) {
      try {
        const { data } = await supabaseAdmin.rpc("footbattle_apply_rank_event", {
          p_user_id: id.userId,
          p_event_key: `faceoff:${faceoff.id}:${id.userId}`,
          p_game_code: "daily_faceoff",
          p_lp_change: 3,
        });
        rankReward = (data as Record<string, unknown> | null) ?? null;
      } catch (rankError) {
        console.error("Daily faceoff LP award error:", rankError);
      }
    }

    const results = await getCounts(faceoff.id);
    const response = NextResponse.json({
      ok: true,
      choice: storedVote.choice,
      alreadyVoted,
      results,
      rankReward,
    });
    return attachGuestCookie(response, id.guestToken);
  } catch (error) {
    console.error("Daily faceoff POST error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Oy kaydedilemedi." }, { status: 500 });
  }
}
