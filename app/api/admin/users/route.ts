import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";
import { supabaseAdmin } from "@/lib/supabase/server";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export async function GET(request: Request) {
  const admin = await requireAdmin();

  if (!admin.ok) {
    return NextResponse.json(
      { ok: false, error: admin.error },
      { status: admin.status },
    );
  }

  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim() ?? "";
    const page = clampNumber(Number(url.searchParams.get("page") ?? "1") || 1, 1, 100000);
    const limit = clampNumber(Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT, 1, MAX_LIMIT);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let usersQuery = supabaseAdmin
      .from("profiles")
      .select(
        `
          id,
          username,
          display_name,
          avatar_url,
          total_score,
          current_streak,
          best_streak,
          games_played,
          games_won,
          created_at,
          updated_at,
          last_play_date,
          last_seen_at,
          is_admin
        `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (query) {
      const safeQuery = query.replace(/[%_,]/g, "").trim();

      if (safeQuery) {
        usersQuery = usersQuery.or(
          `username.ilike.%${safeQuery}%,display_name.ilike.%${safeQuery}%`,
        );
      }
    }

    const now = Date.now();
    const onlineSince = new Date(now - 2 * 60 * 1000).toISOString();
    const active24hSince = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const new7dSince = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      usersResult,
      totalUsersResult,
      onlineUsersResult,
      active24hResult,
      new7dResult,
    ] = await Promise.all([
      usersQuery,
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("last_seen_at", onlineSince),
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("last_seen_at", active24hSince),
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new7dSince),
    ]);

    if (usersResult.error) {
      throw new Error(usersResult.error.message);
    }

    const users = (usersResult.data ?? []).map((profile) => {
      const lastSeenAt = profile.last_seen_at ?? null;
      const lastSeenMs = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;

      return {
        id: profile.id,
        username: profile.username ?? null,
        displayName:
          profile.display_name ??
          profile.username ??
          "FootBattle Oyuncusu",
        avatarUrl: profile.avatar_url ?? null,
        totalScore: Number(profile.total_score ?? 0),
        currentStreak: Number(profile.current_streak ?? 0),
        bestStreak: Number(profile.best_streak ?? 0),
        gamesPlayed: Number(profile.games_played ?? 0),
        gamesWon: Number(profile.games_won ?? 0),
        createdAt: profile.created_at ?? null,
        updatedAt: profile.updated_at ?? null,
        lastPlayDate: profile.last_play_date ?? null,
        lastSeenAt,
        isOnline:
          lastSeenMs > 0 &&
          lastSeenMs >= now - 2 * 60 * 1000,
        isAdmin: Boolean(profile.is_admin),
      };
    });

    return NextResponse.json({
      ok: true,
      users,
      pagination: {
        page,
        limit,
        total: Number(usersResult.count ?? 0),
        totalPages: Math.max(
          1,
          Math.ceil(Number(usersResult.count ?? 0) / limit),
        ),
      },
      summary: {
        totalUsers: Number(totalUsersResult.count ?? 0),
        onlineUsers: Number(onlineUsersResult.count ?? 0),
        activeLast24Hours: Number(active24hResult.count ?? 0),
        newUsersLast7Days: Number(new7dResult.count ?? 0),
      },
    });
  } catch (error) {
    console.error("Admin users GET error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Kullanıcılar yüklenemedi.",
      },
      { status: 500 },
    );
  }
}