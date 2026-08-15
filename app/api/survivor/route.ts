import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const { data: sets, error } = await supabaseAdmin
    .from("survivor_sets")
    .select("id, slug, title, description, kind, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const ids = (sets ?? []).map((set) => set.id);
  const { data: entries } = ids.length
    ? await supabaseAdmin.from("survivor_entries").select("set_id, name, image_url, slot").in("set_id", ids).order("slot")
    : { data: [] };
  const { data: results } = ids.length
    ? await supabaseAdmin.from("survivor_results").select("set_id").in("set_id", ids)
    : { data: [] };

  const counts = new Map<string, number>();
  for (const result of results ?? []) counts.set(result.set_id, (counts.get(result.set_id) ?? 0) + 1);

  return NextResponse.json({
    ok: true,
    items: (sets ?? []).map((set) => ({
      id: set.id,
      slug: set.slug,
      title: set.title,
      description: set.description,
      kind: set.kind,
      completions: counts.get(set.id) ?? 0,
      preview: (entries ?? []).filter((entry) => entry.set_id === set.id).slice(0, 4).map((entry) => ({ name: entry.name, imageUrl: entry.image_url })),
    })),
  });
}
