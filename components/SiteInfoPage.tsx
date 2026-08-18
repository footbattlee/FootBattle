import Link from "next/link";

export default function SiteInfoPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#07111f] px-5 py-12 text-white sm:py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/tr" className="text-sm font-black text-green-400 hover:text-green-300">← FootBattle'a dön</Link>
        <p className="mt-10 text-xs font-black uppercase tracking-[0.22em] text-yellow-400">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-5 text-base leading-7 text-slate-400">{intro}</p>
        <div className="mt-10 space-y-8 rounded-3xl border border-white/10 bg-white/[0.035] p-6 text-sm leading-7 text-slate-300 sm:p-8">
          {children}
        </div>
      </div>
    </main>
  );
}
