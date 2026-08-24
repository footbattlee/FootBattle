import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const auth = await createAuthServerClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ ok:false, error:"Giriş yapmalısın." }, { status:401 });
    const body = await request.json().catch(() => ({}));
    const token = String(body?.token ?? "").replace(/[^a-zA-Z0-9]/g, "").slice(0,64);
    if (!token) return NextResponse.json({ ok:false, error:"Token eksik." }, { status:400 });

    const { data: match } = await supabaseAdmin.from("ranked_matches")
      .select("id,player_a_id,opponent_kind,status")
      .eq("challenge_token", token).eq("game_code","club_nation").maybeSingle();
    if (!match || match.player_a_id !== user.id || match.opponent_kind !== "bot" || match.status === "completed") {
      return NextResponse.json({ ok:true, skipped:true });
    }
    const { data: challenge } = await supabaseAdmin.from("guest_challenges")
      .select("id,status,challenger_score,opponent_score,winner_side").eq("invite_token",token).maybeSingle();
    if (!challenge || challenge.status === "completed") return NextResponse.json({ ok:true, completed:true });

    const { data: rounds, error: roundError } = await supabaseAdmin.from("challenge_rounds")
      .select("id,round_no,left_value,right_value,winner_side,completed_at,created_at,opponent_answered_at")
      .eq("challenge_id",challenge.id).eq("game_code","club_nation").order("round_no",{ascending:true});
    if (roundError) throw roundError;
    const round = (rounds ?? []).find((r) => !r.completed_at);
    if (!round || round.opponent_answered_at) return NextResponse.json({ ok:true, waiting:true });
    const age = Date.now() - new Date(round.created_at).getTime();
    const delay = 8500 + ((Number(round.round_no) * 1777) % 5500);
    if (age < delay) return NextResponse.json({ ok:true, waiting:true, inMs:delay-age });

    const club = String(round.left_value ?? "");
    const nation = String(round.right_value ?? "");
    const { data: clubRows } = await supabaseAdmin.from("player_quiz_clubs").select("player_id").eq("club_name",club).limit(500);
    const ids = Array.from(new Set((clubRows ?? []).map((x) => Number(x.player_id)).filter(Number.isInteger)));
    if (!ids.length) return NextResponse.json({ ok:true, waiting:true });
    const { data: players } = await supabaseAdmin.from("guess_players").select("player_id,name,nationality").in("player_id",ids).eq("nationality",nation).limit(30);
    const options = players ?? [];
    if (!options.length) return NextResponse.json({ ok:true, waiting:true });
    const player = options[(Number(round.round_no) * 7) % options.length];
    const now = new Date().toISOString();
    const { data: claimed } = await supabaseAdmin.from("challenge_rounds").update({
      winner_side:"opponent", opponent_answer:String(player.name), opponent_answer_player_id:Number(player.player_id), opponent_answered_at:now, completed_at:now,
    }).eq("id",round.id).is("completed_at",null).select("id").maybeSingle();
    if (!claimed) return NextResponse.json({ ok:true, raced:true });

    const { data: fresh } = await supabaseAdmin.from("challenge_rounds").select("winner_side,completed_at")
      .eq("challenge_id",challenge.id).eq("game_code","club_nation");
    const challengerScore = (fresh ?? []).filter((x) => x.completed_at && x.winner_side === "challenger").length;
    const opponentScore = (fresh ?? []).filter((x) => x.completed_at && x.winner_side === "opponent").length;
    const completed = challengerScore >= 3 || opponentScore >= 3 || (fresh ?? []).every((x) => Boolean(x.completed_at));
    const winner = challengerScore > opponentScore ? "challenger" : opponentScore > challengerScore ? "opponent" : completed ? "draw" : null;
    await supabaseAdmin.from("guest_challenges").update({
      challenger_score:challengerScore, opponent_score:opponentScore,
      ...(completed ? { status:"completed", winner_side:winner, completed_at:now } : {}), updated_at:now,
    }).eq("id",challenge.id);
    return NextResponse.json({ ok:true, answered:true, completed, score:{challenger:challengerScore,opponent:opponentScore} });
  } catch (error) {
    console.error("Club Nation ranked bot error", error);
    return NextResponse.json({ ok:false, error:error instanceof Error ? error.message : "Bot hamlesi yapılamadı." }, { status:500 });
  }
}
