"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { createClient } from "@/lib/supabase/client";

type Props = { locale?: "tr" | "en"; standalone?: boolean };

export default function AccountDeletionPanel({ locale = "tr", standalone = false }: Props) {
  const tr = locale === "tr";
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void createClient().auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user))).catch(() => setSignedIn(false));
  }, []);

  async function deleteAccount() {
    if (busy) return;
    const confirmation = window.prompt(tr
      ? "Hesabını ve kişisel profil verilerini kalıcı olarak silmek için SIL yaz. Bu işlem geri alınamaz."
      : "Type DELETE to permanently delete your account and personal profile data. This cannot be undone.");
    if (confirmation !== (tr ? "SIL" : "DELETE")) return;

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account/delete", { method: "DELETE" });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error ?? (tr ? "Hesap silinemedi." : "Account could not be deleted."));

      if (Capacitor.isNativePlatform()) {
        try { await FirebaseAuthentication.signOut(); } catch { /* best effort */ }
      }
      try { await createClient().auth.signOut({ scope: "local" }); } catch { /* user is already deleted */ }
      window.location.replace(tr ? "/tr" : "/en");
    } catch (e) {
      setError(e instanceof Error ? e.message : (tr ? "Hesap silinemedi." : "Account could not be deleted."));
      setBusy(false);
    }
  }

  return (
    <section className={standalone ? "rounded-3xl border border-red-400/20 bg-red-500/[0.04] p-5" : "mx-auto mt-4 max-w-xl rounded-2xl border border-red-400/20 bg-red-500/[0.04] p-4"}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-300">{tr ? "Hesap Yönetimi" : "Account Management"}</p>
      <h2 className="mt-1 text-lg font-black text-white">{tr ? "Hesabını sil" : "Delete your account"}</h2>
      <p className="mt-2 text-xs leading-5 text-slate-400">
        {tr
          ? "Hesabın silindiğinde giriş hesabın, profilin ve sana doğrudan bağlı kişisel veriler kalıcı olarak kaldırılır. Maç/oyun kayıtlarında istatistiksel bütünlük için kimliğin kaldırılmış anonim kayıtlar kalabilir."
          : "Deleting your account permanently removes your sign-in account, profile and directly linked personal data. Anonymous records with your identity removed may remain where needed for match/game statistical integrity."}
      </p>

      {signedIn === false ? (
        <div className="mt-4">
          <Link href={`/login?next=${encodeURIComponent("/account-deletion")}`} className="inline-flex rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#07111f]">
            {tr ? "Giriş yap ve silme işlemini başlat" : "Sign in to start deletion"}
          </Link>
        </div>
      ) : (
        <button type="button" disabled={busy || signedIn === null} onClick={() => void deleteAccount()} className="mt-4 rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-2.5 text-xs font-black text-red-200 disabled:opacity-50">
          {busy ? (tr ? "Hesap siliniyor..." : "Deleting account...") : (tr ? "Hesabımı kalıcı olarak sil" : "Permanently delete my account")}
        </button>
      )}

      {error ? <p className="mt-3 text-xs font-bold text-red-300">{error}</p> : null}
    </section>
  );
}
