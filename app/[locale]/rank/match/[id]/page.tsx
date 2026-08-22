import Link from "next/link";
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

  const { data: match } = await supabaseAdmin
    .from("ranked_matches")
    .select("id,game_code,status,player_a_id,player_b_id,opponent_kind,bot_name,created_at")
    .eq("id", id)
    .maybeSingle();

  if (!match || (match.player_a_id !== user.id && match.player_b_id !== user.id)) notFound();

  const opponentId = match.player_a_id === user.id ? match.player_b_id : match.player_a_id;
  const { data: opponent } = opponentId
    ? await supabaseAdmin.from("profiles").select("display_name,username,avatar_url").eq("id", opponentId).maybeSingle()
    : { data: null };

  const gameLabel = match.game_code === "tic_tac_toe" ? "Futbol Tic Tac Toe" : "2 Takım 1 Oyuncu";
  const opponentName = match.opponent_kind === "bot" ? (match.bot_name ?? "Mehmet") : (opponent?.display_name ?? opponent?.username ?? "Rakip");

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-6 text-white">
      <div className="mx-auto max-w-xl">
        <Link href={`/${locale}/rank`} className="text-sm font-black text-slate-400">← Ranked</Link>
        <section className="mt-6 rounded-3xl border border-green-500/20 bg-[#0c1929] p-5 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-300">Ranked Match</p>
          <h1 className="mt-2 text-3xl font-black">Rakip bulundu!</h1>
          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs text-slate-500">Sen</p><p className="mt-1 font-black">FootBattle</p></div>
            <span className="font-black text-purple-400">VS</span>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs text-slate-500">Rakip</p><p className="mt-1 font-black">{opponentName}</p>{match.opponent_kind === "bot" && <p className="mt-1 text-[10px] font-black text-yellow-300">BOT</p>}</div>
          </div>
          <div className="mt-5 rounded-2xl border border-purple-400/20 bg-purple-500/[0.08] p-4">
            <p className="text-xs font-black uppercase tracking-wider text-purple-300">Oyun</p>
            <p className="mt-1 text-xl font-black">{gameLabel}</p>
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-400">Matchmaking hazır. Sıradaki adım bu ranked match kaydını düellodaki aynı oyun motoruna bağlamak; LP/ELO bu fazda değişmeyecek.</p>
        </section>
      </div>
    </main>
  );
}
