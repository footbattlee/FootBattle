"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("FootBattle global UI error", error);
  }, [error]);

  return (
    <html lang="tr">
      <body className="min-h-screen bg-[#07111f] text-white">
        <main className="flex min-h-screen items-center justify-center px-5">
          <section className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#101c2c] p-6 text-center shadow-2xl">
            <div className="text-4xl">⚠️</div>
            <h1 className="mt-4 text-xl font-black">Bir şey ters gitti</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Ekran yüklenirken beklenmeyen bir hata oluştu. Önce tekrar deneyebilir, devam etmezse ana sayfaya dönebilirsin.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="mt-5 min-h-12 w-full rounded-xl bg-green-500 px-4 font-black text-[#07111f]"
            >
              Tekrar Dene
            </button>
            <button
              type="button"
              onClick={() => { window.location.href = "/tr"; }}
              className="mt-3 min-h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 font-black text-slate-200"
            >
              Ana Sayfa
            </button>
            {error.digest ? <p className="mt-4 text-[10px] text-slate-600">Hata kodu: {error.digest}</p> : null}
          </section>
        </main>
      </body>
    </html>
  );
}
