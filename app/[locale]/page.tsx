import Link from "next/link";
import { notFound } from "next/navigation";

import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, type Locale } from "@/lib/i18n/config";

export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale as Locale);
  const otherLocale: Locale = locale === "tr" ? "en" : "tr";

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-7 sm:px-6 sm:py-10">
        <nav className="flex items-center justify-between gap-4">
          <Link href={`/${locale}`} className="text-xl font-black tracking-tight text-green-300">
            FootBattle
          </Link>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] p-1 text-xs font-black">
            <Link
              href="/tr"
              className={`rounded-lg px-3 py-2 transition ${locale === "tr" ? "bg-green-500 text-[#07111f]" : "text-slate-400 hover:text-white"}`}
            >
              TR
            </Link>
            <Link
              href="/en"
              className={`rounded-lg px-3 py-2 transition ${locale === "en" ? "bg-green-500 text-[#07111f]" : "text-slate-400 hover:text-white"}`}
            >
              EN
            </Link>
          </div>
        </nav>

        <section className="my-auto py-16 text-center sm:py-24">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-green-300">
            {dictionary.home.eyebrow}
          </p>
          <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl lg:text-7xl">
            {dictionary.home.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-400 sm:text-lg">
            {dictionary.home.description}
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-green-500 px-6 text-sm font-black text-[#07111f] transition hover:bg-green-400"
            >
              {dictionary.home.primaryCta}
            </Link>
            <Link
              href="/rank"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-yellow-300/25 bg-yellow-300/10 px-6 text-sm font-black text-yellow-100 transition hover:bg-yellow-300/15"
            >
              {dictionary.home.secondaryCta}
            </Link>
          </div>

          <p className="mt-7 text-xs font-bold text-slate-600">
            {dictionary.home.languageNote} · /{locale}
          </p>
        </section>

        <footer className="flex items-center justify-between gap-4 border-t border-white/10 pt-5 text-xs text-slate-600">
          <span>© FootBattle</span>
          <Link href={`/${otherLocale}`} className="font-bold text-slate-400 hover:text-white">
            {dictionary.language[otherLocale]} →
          </Link>
        </footer>
      </div>
    </main>
  );
}
