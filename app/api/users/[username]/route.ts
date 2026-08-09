import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type RouteParams = {
  params: Promise<{
    username: string;
  }>;
};

export async function GET(
  request: Request,
  { params }: RouteParams,
) {
  try {
    const { username } = await params;

    const normalizedUsername = decodeURIComponent(
      username,
    )
      .trim()
      .toLowerCase()
      .replace(/^@/, "");

    if (!normalizedUsername) {
      return NextResponse.json(
        {
          ok: false,
          error: "Kullanıcı adı boş olamaz.",
        },
        { status: 400 },
      );
    }

    /*
     * Public profil
     */
    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        username,
        display_name,
        avatar_url,
        total_score,
        current_streak,
        best_streak,
        games_played,
        games_won,
        created_at
      `)
      .eq("username", normalizedUsername)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Public profile sorgu hatası:",
        profileError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Profil okunamadı.",
        },
        { status: 500 },
      );
    }

    if (!profile) {
      return NextResponse.json(
        {
          ok: false,
          error: "Kullanıcı bulunamadı.",
        },
        { status: 404 },
      );
    }

    /*
     * Oyun sonuçları
     */
    const {
      data: results,
      error: resultsError,
    } = await supabaseAdmin
      .from("game_results")
      .select(`
        id,
        game_code,
        play_date,
        score,
        attempt_count,
        won,
        duration_seconds,
        created_at
      `)
      .eq("user_id", profile.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(20);

    if (resultsError) {
      console.error(
        "Public profile results hatası:",
        resultsError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Oyun geçmişi okunamadı.",
        },
        { status: 500 },
      );
    }

    /*
     * Giriş yapan kullanıcı varsa
     * arkadaşlık durumunu da döndür.
     */
    let viewerId: string | null = null;

    try {
      const authSupabase =
        await createAuthServerClient();

      const {
        data: { user },
      } =
        await authSupabase.auth.getUser();

      viewerId = user?.id ?? null;
    } catch {
      viewerId = null;
    }

    let friendship:
      | {
          id: number | null;
          status:
            | "none"
            | "pending_sent"
            | "pending_received"
            | "accepted"
            | "rejected";
        }
      | null = {
      id: null,
      status: "none",
    };

    const isOwnProfile =
      viewerId === profile.id;

    if (
      viewerId &&
      !isOwnProfile
    ) {
      const {
        data: friendshipRow,
        error: friendshipError,
      } = await supabaseAdmin
        .from("friendships")
        .select(`
          id,
          requester_id,
          addressee_id,
          status
        `)
        .or(
          `and(requester_id.eq.${viewerId},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${viewerId})`,
        )
        .maybeSingle();

      if (friendshipError) {
        console.error(
          "Public profile friendship hatası:",
          friendshipError,
        );
      }

      if (friendshipRow) {
        let status:
          | "pending_sent"
          | "pending_received"
          | "accepted"
          | "rejected";

        if (
          friendshipRow.status ===
          "accepted"
        ) {
          status = "accepted";
        } else if (
          friendshipRow.status ===
          "rejected"
        ) {
          status = "rejected";
        } else if (
          friendshipRow.requester_id ===
          viewerId
        ) {
          status = "pending_sent";
        } else {
          status = "pending_received";
        }

        friendship = {
          id: friendshipRow.id,
          status,
        };
      }
    }

    const winRate =
      profile.games_played > 0
        ? Math.round(
            (profile.games_won /
              profile.games_played) *
              100,
          )
        : 0;

    return NextResponse.json({
      ok: true,

      isOwnProfile,

      profile: {
        id: profile.id,
        username: profile.username,
        displayName:
          profile.display_name ??
          profile.username ??
          "FootBattle Oyuncusu",
        avatarUrl:
          profile.avatar_url ??
          null,
        totalScore:
          Number(
            profile.total_score ??
              0,
          ),
        currentStreak:
          Number(
            profile.current_streak ??
              0,
          ),
        bestStreak:
          Number(
            profile.best_streak ??
              0,
          ),
        gamesPlayed:
          Number(
            profile.games_played ??
              0,
          ),
        gamesWon:
          Number(
            profile.games_won ??
              0,
          ),
        winRate,
        createdAt:
          profile.created_at,
      },

      friendship,

      results: results ?? [],
    });
  } catch (error) {
    console.error(
      "Public user endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Profil yüklenemedi.",
      },
      { status: 500 },
    );
  }
}