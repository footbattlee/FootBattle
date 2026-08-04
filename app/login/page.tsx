"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setIsError(false);

    const supabase = createClient();

    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: displayName.trim(),
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          throw error;
        }

        setMessage(
          "Kayıt başarılı. E-posta adresine gelen doğrulama bağlantısını aç.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        window.location.href = "/";
      }
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Beklenmeyen bir hata oluştu.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07111f] px-4 py-10 text-white">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 inline-flex text-sm font-semibold text-slate-400 transition hover:text-green-400"
        >
          ← Ana sayfaya dön
        </Link>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 sm:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500 font-black text-[#07111f]">
              FB
            </div>

            <h1 className="mt-5 text-3xl font-black">
              {mode === "login" ? "Arenaya Gir" : "Takıma Katıl"}
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              {mode === "login"
                ? "Skorlarını, serini ve başarılarını kaydet."
                : "FootBattle hesabını oluştur ve mücadeleye başla."}
            </p>
          </div>

          <div className="mt-7 grid grid-cols-2 rounded-xl bg-black/20 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
              className={`rounded-lg px-4 py-3 text-sm font-bold transition ${
                mode === "login"
                  ? "bg-green-500 text-[#07111f]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Giriş Yap
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("register");
                setMessage("");
              }}
              className={`rounded-lg px-4 py-3 text-sm font-bold transition ${
                mode === "register"
                  ? "bg-green-500 text-[#07111f]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Kayıt Ol
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "register" && (
              <div>
                <label
                  htmlFor="displayName"
                  className="mb-2 block text-sm font-semibold text-slate-300"
                >
                  Görünen ad
                </label>

                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  required
                  minLength={2}
                  maxLength={40}
                  autoComplete="name"
                  placeholder="Örn. Emre"
                  className="w-full rounded-xl border border-white/10 bg-[#0c1929] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-green-400/60"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-300"
              >
                E-posta
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                placeholder="ornek@mail.com"
                className="w-full rounded-xl border border-white/10 bg-[#0c1929] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-green-400/60"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-slate-300"
              >
                Şifre
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                autoComplete={
                  mode === "login"
                    ? "current-password"
                    : "new-password"
                }
                placeholder="En az 6 karakter"
                className="w-full rounded-xl border border-white/10 bg-[#0c1929] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-green-400/60"
              />
            </div>

            {message && (
              <div
                className={`rounded-xl border p-3 text-sm ${
                  isError
                    ? "border-red-500/30 bg-red-500/10 text-red-300"
                    : "border-green-500/30 bg-green-500/10 text-green-300"
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-green-500 px-5 py-4 font-black text-[#07111f] transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "İşlem yapılıyor..."
                : mode === "login"
                  ? "Giriş Yap"
                  : "Hesap Oluştur"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs leading-5 text-slate-600">
            Kaydolarak FootBattle kullanım koşullarını ve gizlilik
            politikasını kabul etmiş olursun.
          </p>
        </section>
      </div>
    </main>
  );
}