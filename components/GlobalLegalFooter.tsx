import Link from "next/link";

export default function GlobalLegalFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#07111f] text-slate-500">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 py-6 text-xs sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <p>© 2026 FootBattle</p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/about" className="transition hover:text-white">Hakkımızda</Link>
          <Link href="/contact" className="transition hover:text-white">İletişim</Link>
          <Link href="/privacy" className="transition hover:text-white">Gizlilik</Link>
          <Link href="/terms" className="transition hover:text-white">Kullanım Şartları</Link>
        </nav>
      </div>
    </footer>
  );
}
