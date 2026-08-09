import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function requireAdmin() {
  const authClient =
    await createAuthServerClient();

  const {
    data: { user },
    error: userError,
  } =
    await authClient.auth.getUser();

  if (
    userError ||
    !user
  ) {
    return {
      ok: false as const,
      status: 401,
      error: "Giriş yapmalısın.",
      user: null,
      profile: null,
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await supabaseAdmin
    .from("profiles")
    .select(`
      id,
      username,
      display_name,
      is_admin
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Admin profile sorgu hatası:",
      profileError,
    );

    return {
      ok: false as const,
      status: 500,
      error: "Admin bilgisi kontrol edilemedi.",
      user,
      profile: null,
    };
  }

  if (
    !profile ||
    profile.is_admin !== true
  ) {
    return {
      ok: false as const,
      status: 403,
      error: "Bu işlem için admin yetkisi gerekiyor.",
      user,
      profile:
        profile ?? null,
    };
  }

  return {
    ok: true as const,
    status: 200,
    error: null,
    user,
    profile,
  };
}