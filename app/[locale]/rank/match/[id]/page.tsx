import { notFound, redirect } from "next/navigation";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isLocale } from "@/lib/i18n/config";

type Params = Promise<{ locale: string; id: string }>;

export default async function RankedMatchPage({ params }: { params: Params }) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();

  const auth = await createAuthServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: match, error } = await supabaseAdmin
    .from("ranked_matches")
    .select("id,game_code,status,player_a_id,player_b_id,opponent_kind,bot_name,challenge_token")
    .eq("id", id)
    .maybeSingle();

  if (error || !match || (match.player_a_id !== user.id && match.player_b_id !== user.id)) notFound();
  if (!match.challenge_token) redirect(`/${locale}/rank?ranked_error=missing_challenge`);

  const token = encodeURIComponent(String(match.challenge_token));
  if (match.game_code === "tic_tac_toe") {
    redirect(`/tic-tac-toe/duel/${token}?ranked=1&match=${encodeURIComponent(String(match.id))}`);
  }

  if (match.game_code === "club_clash" || match.game_code === "club_nation") {
    redirect(`/challenge/${token}?ranked=1&match=${encodeURIComponent(String(match.id))}`);
  }

  redirect(`/${locale}/rank?ranked_error=unsupported_game`);
}
