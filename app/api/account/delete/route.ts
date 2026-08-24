import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function DELETE() {
  try {
    const auth = await createAuthServerClient();
    const { data: { user }, error: userError } = await auth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Giriş yapmalısın." }, { status: 401 });
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    try {
      await auth.auth.signOut();
    } catch {
      // User has already been removed; cookie cleanup is best effort.
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Hesap silinemedi." },
      { status: 500 },
    );
  }
}
