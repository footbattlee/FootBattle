import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

function levelFloorXp(level: number) {
  return 250 * Math.pow(Math.max(0, level - 1), 2);
}

function nextLevelXp(level: number) {
  return 250 * Math.pow(Math.max(1, level), 2);
}

export async function GET() {
  try {
    const auth = await createAuthServerClient();
    const {
      data: { user },
    } = await auth.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: true, authenticated: false });
    }

    const [progressResult, profileResult, definitionsResult, unlockedResult] =
      await Promise.all([
        supabaseAdmin
          .from("user_progress")
          .select("xp, level, current_streak, best_streak, last_play_date")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabaseAdmin
          .from("profiles")
          .select("total_score, games_played, games_won")
          .eq("id", user.id)
          .maybeSingle(),
        supabaseAdmin
          .from("achievement_definitions")
          .select("code, title, description, icon, category, sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabaseAdmin
          .from("user_achievements")
          .select("achievement_code, unlocked_at")
          .eq("user_id", user.id)
          .order("unlocked_at", { ascending: false }),
      ]);

    if (progressResult.error) throw progressResult.error;
    if (profileResult.error) throw profileResult.error;
    if (definitionsResult.error) throw definitionsResult.error;
    if (unlockedResult.error) throw unlockedResult.error;

    const progress = progressResult.data ?? {
      xp: 0,
      level: 1,
      current_streak: 0,
      best_streak: 0,
      last_play_date: null,
    };

    const level = Math.max(1, Number(progress.level ?? 1));
    const xp = Math.max(0, Number(progress.xp ?? 0));
    const floor = levelFloorXp(level);
    const next = nextLevelXp(level);
    const unlockedMap = new Map(
      (unlockedResult.data ?? []).map((item) => [
        item.achievement_code,
        item.unlocked_at,
      ]),
    );

    const achievements = (definitionsResult.data ?? []).map((definition) => ({
      code: definition.code,
      title: definition.title,
      description: definition.description,
      icon: definition.icon,
      category: definition.category,
      unlocked: unlockedMap.has(definition.code),
      unlockedAt: unlockedMap.get(definition.code) ?? null,
    }));

    return NextResponse.json({
      ok: true,
      authenticated: true,
      progress: {
        xp,
        level,
        levelFloorXp: floor,
        nextLevelXp: next,
        xpIntoLevel: Math.max(0, xp - floor),
        xpNeededForLevel: Math.max(1, next - floor),
        currentStreak: Number(progress.current_streak ?? 0),
        bestStreak: Number(progress.best_streak ?? 0),
        lastPlayDate: progress.last_play_date ?? null,
      },
      stats: {
        totalScore: Number(profileResult.data?.total_score ?? 0),
        gamesPlayed: Number(profileResult.data?.games_played ?? 0),
        gamesWon: Number(profileResult.data?.games_won ?? 0),
      },
      achievements,
      unlockedCount: achievements.filter((item) => item.unlocked).length,
      totalAchievements: achievements.length,
    });
  } catch (error) {
    console.error("Progression endpoint hatası:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "İlerleme bilgileri yüklenemedi.",
      },
      { status: 500 },
    );
  }
}
