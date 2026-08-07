"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "register";

function normalizeUsername(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 20);
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");

  const [usernameAvailable, setUsernameAvailable] =
    useState<boolean | null>(null);

  const [usernameChecking, setUsernameChecking] =
    useState(false);

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode !== "register") {
      setUsernameAvailable(null);
      setUsernameChecking(false);
      return;
    }

    const cleanUsername =
      normalizeUsername(username);

    if (cleanUsername.length < 3) {
      setUsernameAvailable(null);
      setUsernameChecking(false);
      return;
    }

    const timer = window.setTimeout(
      async () => {
        try {
          setUsernameChecking(true);

          const response = await fetch(
            `/api/auth/check-username?username=${encodeURIComponent(
              cleanUsername,
            )}`,
          );

          const result = await response.json();

          if (!response.ok || !result.ok) {
            setUsernameAvailable(null);
            return;
          }

          setUsernameAvailable(
            Boolean(result.available),
          );
        } catch {
          setUsernameAvailable(null);
        } finally {
          setUsernameChecking(false);
        }
      },
      400,
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [username, mode]);

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setIsError(false);

    const supabase = createClient();

    try {
      if (mode === "register") {
        const cleanUsername =
          normalizeUsername(username);

        if (displayName.trim().length < 2) {
          throw new Error(
            "Görünen ad en az 2 karakter olmalıdır.",
          );
        }

        if (cleanUsername.length < 3) {
          throw new Error(
            "Kullanıcı adı en az 3 karakter olmalıdır.",
          );
        }

        if (
          !/^[a-z0-9._]{3,20}$/.test(
            cleanUsername,
          )
        ) {
          throw new Error(
            "Kullanıcı adı sadece küçük harf, sayı, nokta ve alt çizgi içerebilir.",
          );
        }

        if (usernameChecking) {
          throw new Error(
            "Kullanıcı adı kontrolünün tamamlanmasını bekle.",
          );
        }

        if (usernameAvailable !== true) {
          throw new Error(
            "Bu kullanıcı adı kullanılamıyor.",
          );
        }

        const { error } =
          await supabase.auth.signUp({
            email: email.trim(),
            password,

            options: {
              data: {
                full_name:
                  displayName.trim(),

                username:
                  cleanUsername,
              },

              emailRedirectTo:
                `${window.location.origin}/auth/callback`,
            },
          });

        if (error) {
          if (
            error.message
              .toLowerCase()
              .includes("rate limit")
          ) {
            throw new Error(
              "Çok fazla doğrulama e-postası gönderildi. Biraz bekleyip tekrar dene.",
            );
          }

          throw error;
        }

        setMessage(
          "Kayıt başarılı. E-posta adresine gelen doğrulama bağlantısını aç.",
        );
      } else {
        const { error } =
          await supabase.auth.signInWithPassword(
            {
              email: email.trim(),
              password,
            },
          );

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

  function switchMode(
    nextMode: Mode,
  ) {
    setMode(nextMode);

    setMessage("");
    setIsError(false);

    setUsernameAvailable(null);
    setUsernameChecking(false);
  }

  const registerButtonDisabled =
    mode === "register" &&
    (
      usernameChecking ||
      username.length < 3 ||
      usernameAvailable !== true
    );

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">

        <Link
          href="/"
          className="mb-6 inline-flex w-fit text-sm font-bold text-slate-400 transition hover:text-white"
        >
          ← Ana sayfaya dön
        </Link>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 sm:p-8">

          <div className="text-center">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500 font-black text-[#07111f]">
              FB
            </div>

            <h1 className="mt-5 text-3xl font-black">
              {mode === "login"
                ? "Arenaya Gir"
                : "Takıma Katıl"}
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
              onClick={() =>
                switchMode("login")
              }
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
              onClick={() =>
                switchMode("register")
              }
              className={`rounded-lg px-4 py-3 text-sm font-bold transition ${
                mode === "register"
                  ? "bg-green-500 text-[#07111f]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Kayıt Ol
            </button>

          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-4"
          >

            {mode === "register" && (
              <>

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
                    onChange={(event) =>
                      setDisplayName(
                        event.target.value,
                      )
                    }
                    required
                    minLength={2}
                    maxLength={40}
                    autoComplete="name"
                    placeholder="Örn. Emre"
                    className="w-full rounded-xl border border-white/10 bg-[#0c1929] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-green-400/60"
                  />

                  <p className="mt-1 text-xs text-slate-600">
                    Görünen adın başka kullanıcılarla aynı olabilir.
                  </p>

                </div>

                <div>

                  <label
                    htmlFor="username"
                    className="mb-2 block text-sm font-semibold text-slate-300"
                  >
                    Kullanıcı adı
                  </label>

                  <div className="flex items-center rounded-xl border border-white/10 bg-[#0c1929] transition focus-within:border-green-400/60">

                    <span className="pl-4 font-bold text-slate-500">
                      @
                    </span>

                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(event) => {
                        const value =
                          normalizeUsername(
                            event.target.value,
                          );

                        setUsername(
                          value,
                        );

                        setUsernameAvailable(
                          null,
                        );
                      }}
                      required
                      minLength={3}
                      maxLength={20}
                      autoComplete="username"
                      placeholder="emre1907"
                      className="min-w-0 flex-1 bg-transparent px-2 py-3 text-white outline-none placeholder:text-slate-600"
                    />

                  </div>

                  <div className="mt-2 min-h-5 text-xs">

                    {usernameChecking ? (
                      <p className="text-slate-500">
                        Kullanıcı adı kontrol ediliyor...
                      </p>
                    ) : username.length >= 3 &&
                      usernameAvailable === true ? (
                      <p className="font-bold text-green-400">
                        ✓ @{username} kullanılabilir
                      </p>
                    ) : username.length >= 3 &&
                      usernameAvailable === false ? (
                      <p className="font-bold text-red-400">
                        ✕ @{username} zaten kullanılıyor
                      </p>
                    ) : (
                      <p className="text-slate-600">
                        3–20 karakter. Küçük harf, sayı, nokta ve alt çizgi kullanılabilir.
                      </p>
                    )}

                  </div>

                </div>

              </>
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
                onChange={(event) =>
                  setEmail(
                    event.target.value,
                  )
                }
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
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
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
              disabled={
                loading ||
                registerButtonDisabled
              }
              className="w-full rounded-xl bg-green-500 px-5 py-4 font-black text-[#07111f] transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading
                ? "İşlem yapılıyor..."
                : mode === "login"
                  ? "Giriş Yap"
                  : usernameChecking
                    ? "Kontrol Ediliyor..."
                    : "Hesap Oluştur"}
            </button>

          </form>

          <p className="mt-5 text-center text-xs leading-5 text-slate-600">
            Kaydolarak FootBattle kullanım koşullarını ve
            gizlilik politikasını kabul etmiş olursun.
          </p>

        </section>

      </div>
    </main>
  );
}