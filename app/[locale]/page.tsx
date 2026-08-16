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
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
          <Link href={`/${locale}`} className="text-xl font-black tracking-tight text-green-300 sm:text-2xl">FootBattle</Link>
          <div className="flex items-center gap-2">
            <Link href={`/${locale}/profile`} className="hidden rounded-xl border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-black text-slate-300 transition hover:text-white sm:inline-flex">👤 {locale === "tr" ? "Profil" : "Profile"}</Link>
            <Link href={`/${locale}/rank`} className="hidden rounded-xl border border-yellow-300/20 bg-yellow-300/[0.07] px-4 py-2 text-xs font-black text-yellow-100 transition hover:bg-yellow-300/10 sm:inline-flex">🏆 {dictionary.home.secondaryCta}</Link>
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.035] p-1 text-xs font-black">
              <Link href="/tr" className={`rounded-lg px-3 py-2 transition ${locale === "tr" ? "bg-green-500 text-[#07111f]" : "text-slate-400 hover:text-white"}`}>🇹🇷 TR</Link>
              <Link href="/en" className={`rounded-lg px-3 py-2 transition ${locale === "en" ? "bg-green-500 text-[#07111f]" : "text-slate-400 hover:text-white"}`}>🇬🇧 EN</Link>
            </div>
          </div>
        </nav>

        <section className="relative overflow-hidden py-16 text-center sm:py-24 lg:py-28">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-500/10 blur-3xl" />
          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-green-300">{dictionary.home.eyebrow}</p>
            <h1 className="mx-auto mt-5 max-w-5xl text-4xl font-black tracking-tight sm:text-6xl lg:text-7xl">{dictionary.home.title}</h1>
            <p className="mx-auto mt-6 max-w-3xl text-sm leading-7 text-slate-400 sm:text-lg">{dictionary.home.description}</p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <a href="#games" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-green-500 px-7 text-sm font-black text-[#07111f] transition hover:bg-green-400">⚽ {dictionary.home.primaryCta}</a>
              <Link href={`/${locale}/rank`} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-yellow-300/25 bg-yellow-300/10 px-7 text-sm font-black text-yellow-100 transition hover:bg-yellow-300/15">🏆 {dictionary.home.secondaryCta}</Link>
            </div>
            <p className="mt-7 text-xs font-bold text-slate-600">{dictionary.home.languageNote} · /{locale}</p>
          </div>
        </section>

        <section id="games" className="border-t border-white/10 py-12 sm:py-16">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.22em] text-green-300">FootBattle Games</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">{dictionary.home.gamesTitle}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{dictionary.home.gamesSubtitle}</p></div></div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dictionary.home.games.map((game, index) => (
              <Link key={game.title} href={game.href} className="group rounded-3xl border border-white/10 bg-white/[0.035] p-5 transition hover:-translate-y-0.5 hover:border-green-400/30 hover:bg-white/[0.055]">
                <div className="flex items-start justify-between gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-green-400/15 bg-green-400/[0.08] text-lg font-black text-green-200">{index + 1}</span><span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">{game.tag}</span></div>
                <h3 className="mt-5 text-xl font-black transition group-hover:text-green-200">{game.title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{game.description}</p><p className="mt-5 text-xs font-black text-green-300">{locale === "tr" ? "Oyna →" : "Play →"}</p>
              </Link>
            ))}
          </div>
          {locale === "en" && <p className="mt-4 rounded-2xl border border-blue-400/15 bg-blue-400/[0.05] px-4 py-3 text-xs leading-5 text-blue-200/80">Guess the Player, Career Path, Daily Faceoff, Football Survivor, Rank Arena and Profile/Friends are now available in English. More game translations are coming next.</p>}
        </section>

        <section className="border-t border-white/10 py-12 sm:py-16">
          <div className="text-center"><p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-300">FootBattle Account</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">{dictionary.home.featuresTitle}</h2><p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">{dictionary.home.featuresSubtitle}</p></div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {dictionary.home.features.map((feature, index) => (
              <Link key={feature.title} href={index === 0 ? `/${locale}/rank` : index === 1 ? `/${locale}/profile` : `/${locale}/profile`} className="rounded-3xl border border-white/10 bg-[#0b1726] p-6 transition hover:border-green-400/25">
                <span className="text-2xl">{index === 0 ? "🏆" : index === 1 ? "👥" : "📱"}</span><h3 className="mt-4 text-lg font-black">{feature.title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{feature.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-10 overflow-hidden rounded-[32px] border border-green-400/20 bg-green-400/[0.055] px-6 py-9 text-center sm:px-10 sm:py-12">
          <h2 className="text-3xl font-black sm:text-4xl">{dictionary.home.finalTitle}</h2><p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">{dictionary.home.finalDescription}</p><Link href={`/${locale}/profile`} className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-green-500 px-7 text-sm font-black text-[#07111f] transition hover:bg-green-400">{dictionary.home.finalCta} →</Link>
        </section>

        <footer className="flex flex-col gap-3 border-t border-white/10 py-6 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between"><span>© FootBattle</span><div className="flex items-center gap-4"><Link href={`/${locale}/profile`} className="font-bold text-slate-400 hover:text-white">{locale === "tr" ? "Profil" : "Profile"}</Link><Link href={`/${locale}/rank`} className="font-bold text-slate-400 hover:text-white">{dictionary.home.secondaryCta}</Link><Link href={`/${otherLocale}`} className="font-bold text-slate-400 hover:text-white">{dictionary.language[otherLocale]} →</Link></div></footer>
      </div>
    </main>
  );
}
