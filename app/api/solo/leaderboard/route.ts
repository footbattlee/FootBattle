import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { data: rows, error } = await supabaseAdmin
      .from("solo_rating_progress")
      .select("user_id, rating, games_played, games_count, wins, updated_at")
      .order("rating", { ascending: false })
      .order("wins", { ascending: false })
      .limit(100);
    if (error) throw error;

    const ids = (rows ?? []).map((row) => row.user_id);
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, username, display_name, avatar_url").in("id", ids)
      : { data: [] as Array<{ id: string; username: string | null; display_name: string | null; avatar_url: string | null }> };
    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

    const leaderboard = (rows ?? []).map((row, index) => {
      const profile = profileMap.get(row.user_id);
      return {
        position: index + 1,
        userId: row.user_id,
        username: profile?.username ?? null,
        displayName: profile?.display_name ?? profile?.username ?? "FootBattle Oyuncusu",
        avatarUrl: profile?.avatar_url ?? null,
        rating: Number(row.rating ?? 1000),
        gamesPlayed: Number(row.games_played ?? 0),
        gamesCount: Number(row.games_count ?? 0),
        wins: Number(row.wins ?? 0),
      };
    });

    const auth = await createAuthServerClient();
    const { data: { user } } = await auth.auth.getUser();
    let me = null;
    if (user) {
      me = leaderboard.find((item) => item.userId === user.id) ?? null;
      if (!me) {
        const { data: mine } = await supabaseAdmin
          .from("solo_rating_progress")
          .select("rating, games_played, games_count, wins")
          .eq("user_id", user.id)
          .maybeSingle();
        if (mine) {
          me = {
            position: null,
            userId: user.id,
            username: null,
            displayName: "Sen",
            avatarUrl: null,
            rating: Number(mine.rating ?? 1000),
            gamesPlayed: Number(mine.games_played ?? 0),
            gamesCount: Number(mine.games_count ?? 0),
            wins: Number(mine.wins ?? 0),
          };
        }
      }
    }

    return NextResponse.json({ ok: true, leaderboard, me });
  } catch (error) {
    console.error("Solo leaderboard hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Solo sıralaması yüklenemedi." }, { status: 500 });
  }
}
