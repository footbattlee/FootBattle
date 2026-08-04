"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type ProfileStats = {
  total_score: number;
  current_streak: number;
  games_played: number;
};

const EMPTY_STATS: ProfileStats = {
  total_score: 0,
  current_streak: 0,
  games_played: 0,
};

export default function HomeStats() {
  const [stats, setStats] = useState<ProfileStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadStats() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setStats(EMPTY_STATS);
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "total_score, current_streak, games_played",
          )
          .eq("id", user.id)
          .single();

      if (profileError || !profile) {
        console.error(
          "Profil istatistikleri okunamadı:",
          profileError,
        );

        setStats(EMPTY_STATS);
        setLoading(false);
        return;
      }

      setStats({
        total_score: profile.total_score ?? 0,
        current_streak: profile.current_streak ?? 0,
        games_played: profile.games_played ?? 0,
      });

      setLoading(false);
    }

    void loadStats();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadStats();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-[68px] animate-pulse rounded-xl bg-white/[0.04]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-3 gap-3 text-center">
      <div className="rounded-xl bg-white/[0.04] p-3">
        <p className="text-xl font-black text-green-400">
          {stats.games_played}
        </p>

        <p className="text-xs text-slate-500">
          Oynanan oyun
        </p>
      </div>

      <div className="rounded-xl bg-white/[0.04] p-3">
        <p className="text-xl font-black">
          {stats.total_score}
        </p>

        <p className="text-xs text-slate-500">
          Toplam puan
        </p>
      </div>

      <div className="rounded-xl bg-white/[0.04] p-3">
        <p className="text-xl font-black text-amber-400">
          🔥 {stats.current_streak}
        </p>

        <p className="text-xs text-slate-500">
          Günlük seri
        </p>
      </div>
    </div>
  );
}