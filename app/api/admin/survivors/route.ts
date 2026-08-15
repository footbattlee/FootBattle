import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";
import { supabaseAdmin } from "@/lib/supabase/server";

type SurvivorInput = {
  id?: string;
  title?: string;
  description?: string;
  kind?: "player" | "team";
  isActive?: boolean;
  entries?: string[];
};

function slugify(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "survivor";
}

async function uniqueSlug(title: string, ignoreId?: string) {
  const base = slugify(title);
  for (let i = 0; i < 50; i += 1) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    let query = supabaseAdmin.from("survivor_sets").select("id").eq("slug", slug).limit(1);
    if (ignoreId) query = query.neq("id", ignoreId);
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return slug;
  }
  return `${base}-${Date.now()}`;
}

async function resolveEntries(kind: "player" | "team", names: string[]) {
  const rows: Array<{ slot: number; name: string; image_url: string | null; source_player_id: number | null }> = [];
  for (let index = 0; index < names.length; index += 1) {
    const name = names[index].trim();
    let imageUrl: string | null = null;
    let sourcePlayerId: number | null = null;

    if (kind === "player") {
      const { data } = await supabaseAdmin
        .from("guess_players")
        .select("player_id, name, image_url")
        .ilike("name", name)
        .order("popularity_score", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        imageUrl = data.image_url ?? null;
        sourcePlayerId = Number(data.player_id);
      }
    }

    rows.push({ slot: index + 1, name, image_url: imageUrl, source_player_id: sourcePlayerId });
  }
  return rows;
}

function validate(input: SurvivorInput | null) {
  const title = input?.title?.trim() ?? "";
  const description = input?.description?.trim() ?? "";
  const kind = input?.kind === "team" ? "team" : "player";
  const entries = (input?.entries ?? []).map((x) => x.trim()).filter(Boolean);
  if (title.length < 2) return { ok: false as const, error: "Oyun adı zorunlu." };
  if (entries.length !== 16) return { ok: false as const, error: "Survivor tam olarak 16 katılımcı içermeli." };
  const normalized = new Set(entries.map((x) => x.toLocaleLowerCase("tr-TR")));
  if (normalized.size !== 16) return { ok: false as const, error: "Aynı katılımcı iki kez kullanılamaz." };
  return { ok: true as const, title, description, kind, entries };
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status });

  const { data: sets, error } = await supabaseAdmin
    .from("survivor_sets")
    .select("id, slug, title, description, kind, is_active, created_at, updated_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const ids = (sets ?? []).map((x) => x.id);
  const { data: entries, error: entriesError } = ids.length
    ? await supabaseAdmin.from("survivor_entries").select("id, set_id, slot, name, image_url, source_player_id").in("set_id", ids).order("slot")
    : { data: [], error: null };
  if (entriesError) return NextResponse.json({ ok: false, error: entriesError.message }, { status: 500 });

  const { data: results, error: resultsError } = ids.length
    ? await supabaseAdmin.from("survivor_results").select("set_id").in("set_id", ids)
    : { data: [], error: null };
  if (resultsError) return NextResponse.json({ ok: false, error: resultsError.message }, { status: 500 });

  const completionCount = new Map<string, number>();
  for (const result of results ?? []) completionCount.set(result.set_id, (completionCount.get(result.set_id) ?? 0) + 1);

  return NextResponse.json({
    ok: true,
    items: (sets ?? []).map((set) => ({
      id: set.id,
      slug: set.slug,
      title: set.title,
      description: set.description,
      kind: set.kind,
      isActive: set.is_active,
      completions: completionCount.get(set.id) ?? 0,
      entries: (entries ?? []).filter((entry) => entry.set_id === set.id).map((entry) => ({
        id: entry.id,
        slot: entry.slot,
        name: entry.name,
        imageUrl: entry.image_url,
        sourcePlayerId: entry.source_player_id,
      })),
    })),
  });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status });

  const input = (await request.json().catch(() => null)) as SurvivorInput | null;
  const parsed = validate(input);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });

  try {
    const slug = await uniqueSlug(parsed.title);
    const { data: set, error } = await supabaseAdmin
      .from("survivor_sets")
      .insert({ title: parsed.title, description: parsed.description, kind: parsed.kind, slug, is_active: input?.isActive ?? true })
      .select("id, slug")
      .single();
    if (error || !set) throw error ?? new Error("Survivor oluşturulamadı.");

    const resolved = await resolveEntries(parsed.kind, parsed.entries);
    const { error: entriesError } = await supabaseAdmin.from("survivor_entries").insert(resolved.map((entry) => ({ ...entry, set_id: set.id })));
    if (entriesError) {
      await supabaseAdmin.from("survivor_sets").delete().eq("id", set.id);
      throw entriesError;
    }

    return NextResponse.json({ ok: true, id: set.id, slug: set.slug });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Survivor oluşturulamadı." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status });

  const input = (await request.json().catch(() => null)) as SurvivorInput | null;
  if (!input?.id) return NextResponse.json({ ok: false, error: "Kayıt id gerekli." }, { status: 400 });
  const parsed = validate(input);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });

  try {
    const slug = await uniqueSlug(parsed.title, input.id);
    const { error } = await supabaseAdmin
      .from("survivor_sets")
      .update({ title: parsed.title, description: parsed.description, kind: parsed.kind, slug, is_active: input.isActive ?? true, updated_at: new Date().toISOString() })
      .eq("id", input.id);
    if (error) throw error;

    const resolved = await resolveEntries(parsed.kind, parsed.entries);
    const { error: deleteError } = await supabaseAdmin.from("survivor_entries").delete().eq("set_id", input.id);
    if (deleteError) throw deleteError;
    const { error: entriesError } = await supabaseAdmin.from("survivor_entries").insert(resolved.map((entry) => ({ ...entry, set_id: input.id })));
    if (entriesError) throw entriesError;

    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Survivor güncellenemedi." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status });
  const input = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!input?.id) return NextResponse.json({ ok: false, error: "Kayıt id gerekli." }, { status: 400 });
  const { error } = await supabaseAdmin.from("survivor_sets").delete().eq("id", input.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
