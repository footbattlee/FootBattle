import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

export default async function DuelRoomLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const duelId = Number(id);
  if (!Number.isInteger(duelId) || duelId <= 0) return children;

  const auth = await createAuthServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return children;

  const { data: duel } = await supabaseAdmin
    .from("duels")
    .select("id,challenger_id,opponent_id,game_code,challenge_token")
    .eq("id", duelId)
    .maybeSingle();

  if (
    duel &&
    duel.game_code === "tic_tac_toe" &&
    duel.challenge_token &&
    (duel.challenger_id === user.id || duel.opponent_id === user.id)
  ) {
    redirect(`/tic-tac-toe/duel/${duel.challenge_token}`);
  }

  return children;
}
