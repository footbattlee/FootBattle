import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

function normalizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase();
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const username = normalizeUsername(
      url.searchParams.get("username") ?? "",
    );

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        {
          ok: true,
          available: false,
          reason: "Kullanıcı adı 3–20 karakter olmalıdır.",
        },
      );
    }

    if (!/^[a-z0-9._]+$/.test(username)) {
      return NextResponse.json(
        {
          ok: true,
          available: false,
          reason:
            "Sadece küçük harf, sayı, nokta ve alt çizgi kullanılabilir.",
        },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .limit(1);

    if (error) {
      console.error(
        "Username kontrolü başarısız:",
        error,
      );

      return NextResponse.json(
        {
          ok: false,
          available: false,
          error: "Kullanıcı adı kontrol edilemedi.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      username,
      available: !data || data.length === 0,
    });
  } catch (error) {
    console.error(
      "Check username endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        available: false,
        error: "Beklenmeyen bir hata oluştu.",
      },
      { status: 500 },
    );
  }
}