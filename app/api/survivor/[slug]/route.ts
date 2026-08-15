import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const { data: set, error } = await supabaseAdmin
    .from("survivor_sets")
    .select("id, slug, title, description, kind")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!set) return NextResponse.json({ ok: false, error: "Survivor bulunamadı." }, { status: 404 });

  const { data: entries, error: entriesError } = await supabaseAdmin
    .from("survivor_entries")
    .select("id, slot, name, image_url")
    .eq("set_id", set.id)
    .order("slot");

  if (entriesError) return NextResponse.json({ ok: false, error: entriesError.message }, { status: 500 });
  if ((entries ?? []).length !== 16) return NextResponse.json({ ok: false, error: "Bu Survivor henüz 16 katılımcı ile tamamlanmamış." }, { status: 422 });

  return NextResponse.json({
    ok: true,
    survivor: {
      id: set.id,
      slug: set.slug,
      title: set.title,
      description: set.description,
      kind: set.kind,
      entries: (entries ?? []).map((entry) => ({ id: entry.id, slot: entry.slot, name: entry.name, imageUrl: entry.image_url })),
    },
  });
}
