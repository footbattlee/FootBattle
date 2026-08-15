import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";
import { supabaseAdmin } from "@/lib/supabase/server";

type FaceoffInput = {
  id?: string;
  matchDate?: string;
  title?: string;
  category?: string;
  leftName?: string;
  rightName?: string;
  isActive?: boolean;
};

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status });
  }

  const { data, error } = await supabaseAdmin
    .from("daily_faceoffs")
    .select("id, match_date, title, category, left_name, right_name, is_active, created_at, updated_at")
    .order("match_date", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const ids = (data ?? []).map((item) => item.id);
  const voteCounts = new Map<string, { total: number; left: number; right: number }>();

  if (ids.length > 0) {
    const { data: votes, error: votesError } = await supabaseAdmin
      .from("daily_faceoff_votes")
      .select("faceoff_id, choice")
      .in("faceoff_id", ids);

    if (votesError) {
      return NextResponse.json({ ok: false, error: votesError.message }, { status: 500 });
    }

    for (const vote of votes ?? []) {
      const current = voteCounts.get(vote.faceoff_id) ?? { total: 0, left: 0, right: 0 };
      current.total += 1;
      if (vote.choice === "left") current.left += 1;
      if (vote.choice === "right") current.right += 1;
      voteCounts.set(vote.faceoff_id, current);
    }
  }

  return NextResponse.json({
    ok: true,
    items: (data ?? []).map((item) => ({
      id: item.id,
      matchDate: item.match_date,
      title: item.title,
      category: item.category,
      leftName: item.left_name,
      rightName: item.right_name,
      isActive: item.is_active,
      votes: voteCounts.get(item.id) ?? { total: 0, left: 0, right: 0 },
    })),
  });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status });
  }

  const input = (await request.json().catch(() => null)) as FaceoffInput | null;
  const matchDate = input?.matchDate?.trim();
  const title = input?.title?.trim() || "Günün Kapışması";
  const category = input?.category?.trim() || "Genel";
  const leftName = input?.leftName?.trim();
  const rightName = input?.rightName?.trim();

  if (!matchDate || !leftName || !rightName) {
    return NextResponse.json({ ok: false, error: "Tarih ve iki taraf da zorunlu." }, { status: 400 });
  }
  if (leftName.toLocaleLowerCase("tr-TR") === rightName.toLocaleLowerCase("tr-TR")) {
    return NextResponse.json({ ok: false, error: "İki taraf aynı olamaz." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("daily_faceoffs")
    .insert({
      match_date: matchDate,
      title,
      category,
      left_name: leftName,
      right_name: rightName,
      is_active: input?.isActive ?? true,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    const message = error.code === "23505" ? "Bu tarih için zaten bir kapışma var." : error.message;
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status });
  }

  const input = (await request.json().catch(() => null)) as FaceoffInput | null;
  if (!input?.id) {
    return NextResponse.json({ ok: false, error: "Kayıt id gerekli." }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.matchDate !== undefined) updates.match_date = input.matchDate.trim();
  if (input.title !== undefined) updates.title = input.title.trim() || "Günün Kapışması";
  if (input.category !== undefined) updates.category = input.category.trim() || "Genel";
  if (input.leftName !== undefined) updates.left_name = input.leftName.trim();
  if (input.rightName !== undefined) updates.right_name = input.rightName.trim();
  if (input.isActive !== undefined) updates.is_active = input.isActive;

  if (typeof updates.left_name === "string" && typeof updates.right_name === "string") {
    if (updates.left_name.toLocaleLowerCase("tr-TR") === updates.right_name.toLocaleLowerCase("tr-TR")) {
      return NextResponse.json({ ok: false, error: "İki taraf aynı olamaz." }, { status: 400 });
    }
  }

  const { error } = await supabaseAdmin.from("daily_faceoffs").update(updates).eq("id", input.id);
  if (error) {
    const message = error.code === "23505" ? "Bu tarih için zaten bir kapışma var." : error.message;
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status });
  }

  const input = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!input?.id) {
    return NextResponse.json({ ok: false, error: "Kayıt id gerekli." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("daily_faceoffs").delete().eq("id", input.id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
