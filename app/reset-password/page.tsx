"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setIsError(false);

    if (password.length < 6) {
      setIsError(true);
      setMessage("Şifre en az 6 karakter olmalıdır.");
      return;
    }
    if (password !== confirmPassword) {
      setIsError(true);
      setMessage("Şifreler eşleşmiyor.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setMessage("Şifren oluşturuldu. Artık aynı e-posta ile e-posta/şifre kullanarak da giriş yapabilirsin.");
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Şifre güncellenemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 sm:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500 font-black text-[#07111f]">FB</div>
            <h1 className="mt-5 text-3xl font-black">Yeni Şifre Belirle</h1>
            <p className="mt-2 text-sm text-slate-400">Bu şifreyi Google ile açtığın mevcut FootBattle hesabında da kullanabilirsin.</p>
          </div>

          {!done ? (
            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-300">Yeni şifre</label>
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" className="w-full rounded-xl border border-white/10 bg-[#0c1929] px-4 py-3 text-white outline-none focus:border-green-400/60" />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-slate-300">Yeni şifre tekrar</label>
                <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} autoComplete="new-password" className="w-full rounded-xl border border-white/10 bg-[#0c1929] px-4 py-3 text-white outline-none focus:border-green-400/60" />
              </div>
              {message ? <div className={`rounded-xl border p-3 text-sm ${isError ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-green-500/30 bg-green-500/10 text-green-300"}`}>{message}</div> : null}
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-green-500 px-5 py-4 font-black text-[#07111f] disabled:opacity-50">{loading ? "Kaydediliyor..." : "Şifreyi Kaydet"}</button>
            </form>
          ) : (
            <div className="mt-7 space-y-4">
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300">{message}</div>
              <Link href="/login" className="block w-full rounded-xl bg-green-500 px-5 py-4 text-center font-black text-[#07111f]">Giriş Ekranına Dön</Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
