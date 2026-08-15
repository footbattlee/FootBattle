import Link from "next/link";

const ADMIN_AREAS = [
  {
    title: "Günlük Oyunlar",
    description: "Guess The Player, Player Quiz, Tic Tac Toe ve Wordle için günlük adayları oluştur, değiştir ve yayınla.",
    href: "/admin/daily-games",
    icon: "🎮",
    badge: "AKTİF",
    accent: "border-green-500/25 bg-green-500/[0.045]",
  },
  {
    title: "Günün Kapışması",
    description: "Tarih bazlı eşleşmeleri oluştur, oyuncuları değiştir, aktif/pasif yap ve topluluk oylarını takip et.",
    href: "/admin/faceoffs",
    icon: "🔥",
    badge: "YENİ",
    accent: "border-orange-400/25 bg-orange-400/[0.045]",
  },
  {
    title: "Oyun Raporları",
    description: "Oyun başlatma, tamamlama, tekrar oynama, paylaşım ve oyun bazlı kullanım verilerini incele.",
    href: "/admin/analytics",
    icon: "📊",
    badge: "AKTİF",
    accent: "border-blue-500/20 bg-blue-500/[0.035]",
  },
  {
    title: "Kullanıcılar",
    description: "Kayıtlı kullanıcıları, puanlarını, oyun sayılarını, serilerini ve son aktivitelerini görüntüle.",
    href: "/admin/users",
    icon: "👥",
    badge: "AKTİF",
    accent: "border-purple-500/25 bg-purple-500/[0.04]",
  },
  {
    title: "Transfer Quiz",
    description: "Transfer gündemindeki günlük oyuncuyu seç, içeriği kontrol et ve yayınla.",
    href: "/admin/transfer-quiz",
    icon: "🔥",
    badge: "AKTİF",
    accent: "border-yellow-400/20 bg-yellow-400/[0.035]",
  },
];

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-7xl px-5 py-8">
        <header className="border-b border-white/10 pb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <Link href="/" className="inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:border-white/20 hover:text-white">← Ana Sayfa</Link>
                <Link href="/admin/faceoffs" className="inline-flex rounded-xl border border-orange-400/20 bg-orange-400/10 px-4 py-2 text-sm font-semibold text-orange-200">🔥 Günün Kapışması</Link>
                <Link href="/admin/analytics" className="inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:border-white/20 hover:text-white">📊 Analytics</Link>
                <Link href="/admin/users" className="inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:border-white/20 hover:text-white">👥 Kullanıcılar</Link>
              </div>
              <p className="mt-7 text-xs font-black uppercase tracking-[0.24em] text-green-400">FOOTBATTLE</p>
              <h1 className="mt-2 text-4xl font-black sm:text-5xl">Admin Panel</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">Oyunları, günlük içerikleri, Günün Kapışması'nı, kullanıcıları ve kullanım raporlarını tek merkezden yönet.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat value="5" label="Yönetim Alanı" />
              <MiniStat value="🔥" label="Kapışma" />
              <MiniStat value="📊" label="Analytics" />
              <MiniStat value="👥" label="Users" />
            </div>
          </div>
        </header>

        <section className="mt-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-300">Yönetim Merkezi</p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">Ne yönetmek istiyorsun?</h2>
          <p className="mt-2 text-sm text-slate-500">İlgili alana gitmek için kartı seç.</p>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {ADMIN_AREAS.map((area) => (
              <Link key={area.href} href={area.href} className={`group relative overflow-hidden rounded-3xl border p-6 transition duration-200 hover:-translate-y-1 hover:border-white/20 ${area.accent}`}>
                <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/[0.035] blur-3xl" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#07111f] text-2xl">{area.icon}</div>
                    <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-green-400">{area.badge}</span>
                  </div>
                  <h3 className="mt-6 text-2xl font-black">{area.title}</h3>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">{area.description}</p>
                  <div className="mt-7 flex items-center gap-2 text-sm font-black text-green-400 transition group-hover:gap-3">Yönet <span>→</span></div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-[#0d1828] p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Hızlı Erişim</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <QuickLink href="/admin/faceoffs" icon="🔥" label="Günün Kapışması" description="Eşleşmeleri yönet" />
            <QuickLink href="/admin/analytics" icon="📈" label="Analytics" description="Oyun kullanım raporları" />
            <QuickLink href="/admin/daily-games" icon="🎮" label="Daily Games" description="Günün oyunlarını yönet" />
            <QuickLink href="/admin/users" icon="👤" label="Kullanıcılar" description="Kayıtlı kullanıcıları gör" />
            <QuickLink href="/admin/transfer-quiz" icon="🔥" label="Transfer Quiz" description="Transfer içeriğini yönet" />
          </div>
        </section>
      </div>
    </main>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return <div className="min-w-[110px] rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4"><p className="text-2xl font-black text-green-400">{value}</p><p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-600">{label}</p></div>;
}

function QuickLink({ href, icon, label, description }: { href: string; icon: string; label: string; description: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-white/[0.07] bg-[#07111f] p-4 transition hover:border-green-400/20 hover:bg-green-400/[0.025]">
      <div className="flex items-center gap-3"><span className="text-xl">{icon}</span><div className="min-w-0"><p className="font-black">{label}</p><p className="mt-1 truncate text-xs text-slate-600">{description}</p></div></div>
      <p className="mt-4 text-xs font-black text-green-400 opacity-70 transition group-hover:opacity-100">Aç →</p>
    </Link>
  );
}
