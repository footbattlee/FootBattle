import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";
import { supabaseAdmin } from "@/lib/supabase/server";

type FaceoffInput = {
  id?: string; matchDate?: string; title?: string; category?: string;
  titleTr?: string; titleEn?: string; categoryTr?: string; categoryEn?: string;
  leftName?: string; rightName?: string; isActive?: boolean;
};

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status });
  const { data, error } = await supabaseAdmin.from("daily_faceoffs")
    .select("id, match_date, title, category, title_tr, title_en, category_tr, category_en, left_name, right_name, is_active, created_at, updated_at")
    .order("match_date", { ascending: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const ids = (data ?? []).map((item) => item.id);
  const voteCounts = new Map<string, { total: number; left: number; right: number }>();
  if (ids.length) {
    const { data: votes, error: votesError } = await supabaseAdmin.from("daily_faceoff_votes").select("faceoff_id, choice").in("faceoff_id", ids);
    if (votesError) return NextResponse.json({ ok: false, error: votesError.message }, { status: 500 });
    for (const vote of votes ?? []) { const c = voteCounts.get(vote.faceoff_id) ?? { total: 0, left: 0, right: 0 }; c.total++; if (vote.choice === "left") c.left++; if (vote.choice === "right") c.right++; voteCounts.set(vote.faceoff_id, c); }
  }
  return NextResponse.json({ ok: true, items: (data ?? []).map((item) => ({
    id: item.id, matchDate: item.match_date,
    title: item.title_tr || item.title, category: item.category_tr || item.category,
    titleTr: item.title_tr || item.title, titleEn: item.title_en || "",
    categoryTr: item.category_tr || item.category, categoryEn: item.category_en || "",
    leftName: item.left_name, rightName: item.right_name, isActive: item.is_active,
    votes: voteCounts.get(item.id) ?? { total: 0, left: 0, right: 0 },
  })) });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(); if (!admin.ok) return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status });
  const input = (await request.json().catch(() => null)) as FaceoffInput | null;
  const matchDate = input?.matchDate?.trim(); const leftName = input?.leftName?.trim(); const rightName = input?.rightName?.trim();
  const titleTr = input?.titleTr?.trim() || input?.title?.trim() || "Günün Kapışması";
  const titleEn = input?.titleEn?.trim() || ""; const categoryTr = input?.categoryTr?.trim() || input?.category?.trim() || "Genel"; const categoryEn = input?.categoryEn?.trim() || "";
  if (!matchDate || !leftName || !rightName) return NextResponse.json({ ok: false, error: "Tarih ve iki taraf da zorunlu." }, { status: 400 });
  if (leftName.toLocaleLowerCase("tr-TR") === rightName.toLocaleLowerCase("tr-TR")) return NextResponse.json({ ok: false, error: "İki taraf aynı olamaz." }, { status: 400 });
  const { data, error } = await supabaseAdmin.from("daily_faceoffs").insert({ match_date: matchDate, title: titleTr, category: categoryTr, title_tr: titleTr, title_en: titleEn || null, category_tr: categoryTr, category_en: categoryEn || null, left_name: leftName, right_name: rightName, is_active: input?.isActive ?? true, updated_at: new Date().toISOString() }).select("id").single();
  if (error) return NextResponse.json({ ok: false, error: error.code === "23505" ? "Bu tarih için zaten bir kapışma var." : error.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(); if (!admin.ok) return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status });
  const input = (await request.json().catch(() => null)) as FaceoffInput | null;
  if (!input?.id) return NextResponse.json({ ok: false, error: "Kayıt id gerekli." }, { status: 400 });
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.matchDate !== undefined) updates.match_date = input.matchDate.trim();
  if (input.titleTr !== undefined || input.title !== undefined) { const v = input.titleTr?.trim() || input.title?.trim() || "Günün Kapışması"; updates.title = v; updates.title_tr = v; }
  if (input.titleEn !== undefined) updates.title_en = input.titleEn.trim() || null;
  if (input.categoryTr !== undefined || input.category !== undefined) { const v = input.categoryTr?.trim() || input.category?.trim() || "Genel"; updates.category = v; updates.category_tr = v; }
  if (input.categoryEn !== undefined) updates.category_en = input.categoryEn.trim() || null;
  if (input.leftName !== undefined) updates.left_name = input.leftName.trim(); if (input.rightName !== undefined) updates.right_name = input.rightName.trim(); if (input.isActive !== undefined) updates.is_active = input.isActive;
  const { error } = await supabaseAdmin.from("daily_faceoffs").update(updates).eq("id", input.id);
  if (error) return NextResponse.json({ ok: false, error: error.code === "23505" ? "Bu tarih için zaten bir kapışma var." : error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin(); if (!admin.ok) return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status });
  const input = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!input?.id) return NextResponse.json({ ok: false, error: "Kayıt id gerekli." }, { status: 400 });
  const { error } = await supabaseAdmin.from("daily_faceoffs").delete().eq("id", input.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
