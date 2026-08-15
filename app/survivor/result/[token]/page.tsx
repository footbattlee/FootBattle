import Link from "next/link";

import { supabaseAdmin } from "@/lib/supabase/server";

type MatchEntry = { id: string; name: string; imageUrl?: string | null };
type Match = { left: MatchEntry; right: MatchEntry; winner: MatchEntry };
type Round = { name: string; matches: Match[] };

export default async function SurvivorResultPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data: result } = await supabaseAdmin
    .from("survivor_results")
    .select("set_id, champion_entry_id, champion_name, bracket, created_at")
    .eq("share_token", token)
    .maybeSingle();

  if (!result) {
    return <main className="min-h-screen bg-[#07111f] p-8 text-white"><p className="text-red-300">Sonuç bulunamadı.</p><Link href="/survivor" className="mt-4 inline-block text-green-300">← Survivor listesi</Link></main>;
  }

  const [{ data: set }, { data: champion }] = await Promise.all([
    supabaseAdmin.from("survivor_sets").select("slug, title, description").eq("id", result.set_id).maybeSingle(),
    result.champion_entry_id
      ? supabaseAdmin.from("survivor_entries").select("name, image_url").eq("id", result.champion_entry_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const rounds = Array.isArray(result.bracket) ? (result.bracket as Round[]) : [];
  const finalRound = rounds.find((round) => round.name === "Final") ?? rounds.at(-1);
  const finalMatch = finalRound?.matches?.[0];

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-3xl px-4 py-8 text-center sm:px-6 sm:py-12">
        <Link href="/survivor" className="inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-400">← Survivor</Link>
        <p className="mt-8 text-xs font-black uppercase tracking-[0.24em] text-yellow-300">Paylaşılan Survivor Sonucu</p>
        <h1 className="mt-2 text-3xl font-black sm:text-5xl">{set?.title ?? "Survivor"}</h1>

        <section className="mx-auto mt-7 max-w-xl rounded-[32px] border border-yellow-300/25 bg-yellow-300/[0.055] p-6 sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-300">👑 Tahtın Sahibi</p>
          {champion?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={champion.image_url} alt={result.champion_name} className="mx-auto mt-5 h-44 w-44 rounded-3xl border border-yellow-300/25 object-cover object-top sm:h-56 sm:w-56" />
          ) : (
            <div className="mx-auto mt-5 flex h-44 w-44 items-center justify-center rounded-3xl border border-yellow-300/20 bg-[#07111f] text-6xl font-black text-yellow-100 sm:h-56 sm:w-56">{result.champion_name.slice(0, 1)}</div>
          )}
          <h2 className="mt-5 text-4xl font-black text-yellow-100 sm:text-5xl">{result.champion_name}</h2>
          {finalMatch && <p className="mt-3 text-sm text-slate-400">Final: {finalMatch.left.name} vs {finalMatch.right.name}</p>}
        </section>

        <div className="mx-auto mt-6 grid max-w-xl gap-2 sm:grid-cols-2">
          {set?.slug && <Link href={`/survivor/${set.slug}`} className="flex min-h-12 items-center justify-center rounded-xl bg-green-500 px-5 font-black text-[#07111f]">⚔️ Ben de Oynayayım</Link>}
          <Link href="/survivor" className="flex min-h-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 font-black">🏆 Diğer Survivor'lar</Link>
        </div>
      </div>
    </main>
  );
}
