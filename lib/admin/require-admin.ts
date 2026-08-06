import { createClient as createAuthClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function requireAdmin() {
  const authClient = await createAuthClient();

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();

  if (userError || !user) {
    return {
      ok: false as const,
      status: 401,
      error: "Bu işlem için giriş yapmalısın.",
      user: null,
    };
  }

  const { data, error } = await supabaseAdmin.rpc("is_app_admin", {
    p_user_id: user.id,
  });

  if (error) {
    console.error("Admin kontrolü başarısız:", error);

    return {
      ok: false as const,
      status: 500,
      error: "Admin yetkisi kontrol edilemedi.",
      user,
    };
  }

  if (!data) {
    return {
      ok: false as const,
      status: 403,
      error: "Bu sayfaya erişim yetkin yok.",
      user,
    };
  }

  return {
    ok: true as const,
    status: 200,
    error: null,
    user,
  };
}
