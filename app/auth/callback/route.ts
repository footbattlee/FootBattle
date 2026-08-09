import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_code", requestUrl.origin),
    );
  }

  try {
    const supabase = await createAuthServerClient();

    const { error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error(
        "Auth callback exchange error:",
        error,
      );

      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(error.message)}`,
          requestUrl.origin,
        ),
      );
    }

    return NextResponse.redirect(
      new URL("/", requestUrl.origin),
    );
  } catch (error) {
    console.error(
      "Auth callback error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Bilinmeyen hata";

    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(message)}`,
        requestUrl.origin,
      ),
    );
  }
}