import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";
import { supabaseAdmin } from "@/lib/supabase/server";

const BUCKET = "survivor-images";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status });

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Görsel dosyası gerekli." }, { status: 400 });
    if (!ALLOWED.has(file.type)) return NextResponse.json({ ok: false, error: "Sadece JPG, PNG veya WEBP yükleyebilirsin." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "Görsel en fazla 5 MB olabilir." }, { status: 400 });

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, bytes, { contentType: file.type, upsert: false, cacheControl: "31536000" });
    if (error) throw error;
    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ ok: true, url: data.publicUrl, path });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Görsel yüklenemedi." }, { status: 500 });
  }
}
