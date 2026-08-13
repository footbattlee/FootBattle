"use client";

import Link from "next/link";

type AdminCard = {
  title: string;
  description: string;
  href: string;
  icon: string;
  status?: string;
};

const ADMIN_CARDS: AdminCard[] = [
  {
    title: "Oyun Raporları",
    description:
      "Oyun başlatma, tamamlama, tekrar oynama ve paylaşım sayılarını görüntüle.",
    href: "/admin/analytics",
    icon: "📊",
    status: "Aktif",
  },

  {
    title: "Transfer Quiz",
    description:
      "Transfer gündemindeki oyuncuyu seç, başlığı yaz ve aktif quiz olarak yayınla.",
    href: "/admin/transfer-quiz",
    icon: "🔥",
    status: "Aktif",
  },

  {
    title: "Günlük Oyunlar",
    description:
      "Günlük oyunları oluştur, düzenle ve yayın durumlarını kontrol et.",
    href: "/admin/daily-games",
    icon: "📅",
    status: "Aktif",
  },
];

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-green-400">
            FootBattle
          </p>

          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Admin Panel
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Oyunları, transfer içeriklerini ve kullanım raporlarını tek yerden yönet.
          </p>
        </div>

        {/* QUICK LINKS */}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

          {ADMIN_CARDS.map(
            (
              card,
            ) => (
              <Link
                key={
                  card.href
                }
                href={
                  card.href
                }
                className="group rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:-translate-y-1 hover:border-green-500/30 hover:bg-white/[0.05]"
              >

                <div className="flex items-start justify-between gap-4">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-2xl">
                    {
                      card.icon
                    }
                  </div>

                  {card.status && (
                    <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-green-400">
                      {
                        card.status
                      }
                    </span>
                  )}

                </div>

                <h2 className="mt-5 text-xl font-black">
                  {
                    card.title
                  }
                </h2>

                <p className="mt-2 min-h-[72px] text-sm leading-6 text-slate-400">
                  {
                    card.description
                  }
                </p>

                <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-green-400 transition group-hover:gap-3">
                  Yönet →
                </div>

              </Link>
            ),
          )}

        </section>

        {/* STATUS */}

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-5">

          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Yönetim Alanları
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">

            <StatusItem
              label="Analytics"
              value="Hazır"
              icon="📈"
            />

            <StatusItem
              label="Transfer Quiz"
              value="Hazır"
              icon="🔥"
            />

            <StatusItem
              label="Daily Games"
              value="Hazır"
              icon="🎮"
            />

          </div>

        </section>

      </div>
    </main>
  );
}

function StatusItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/15 p-4">

      <div className="flex items-center gap-3">

        <span className="text-xl">
          {icon}
        </span>

        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-600">
            {label}
          </p>

          <p className="mt-1 font-black text-green-400">
            {value}
          </p>
        </div>

      </div>

    </div>
  );
}