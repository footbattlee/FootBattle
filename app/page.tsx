import Link from "next/link";

import AuthButton from "@/components/AuthButton";
import HomeStats from "@/components/HomeStats";

const games = [
  {
    title: "Wordle",
    description: "Günün futbolcu soyadını 5 tahminde bul.",
    icon: "W",
    color: "from-green-500/30 to-green-950/30",
    button: "Oyna",
    active: true,
    href: "/wordle",
  },
  {
  title: "Guess the Player",
  description:
    "Oyuncu özelliklerini karşılaştır ve gizli futbolcuyu bul.",
  icon: "?",
  color: "from-purple-500/30 to-purple-950/30",
  button: "Oyna",
  active: true,
  href: "/guess-the-player",
},
  {
    title: "Career Path",
    description:
      "Kulüp geçmişinden gizli futbolcuyu tahmin et.",
    icon: "↗",
    color: "from-amber-500/30 to-amber-950/30",
    button: "Yakında",
    active: false,
    href: "#",
  },
  {
    title: "Tic Tac Toe",
    description:
      "Kulüp kesişimlerini doldur ve rakibine üçlü yap.",
    icon: "×",
    color: "from-blue-500/30 to-blue-950/30",
    button: "Yakında",
    active: false,
    href: "#",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <header className="border-b border-white/10 bg-[#07111f]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-green-300/30 bg-gradient-to-br from-green-300 to-green-600 font-black text-[#07111f] shadow-lg shadow-green-500/20">
              FB
            </div>

            <div>
              <p className="text-lg font-black tracking-tight">
                FootBattle
              </p>

              <p className="text-xs text-slate-400">
                Futbol oyunları arenası
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
            <a className="text-green-400" href="#">
              Ana Sayfa
            </a>

            <a
              className="transition hover:text-white"
              href="#oyunlar"
            >
              Oyunlar
            </a>

            <a
              className="transition hover:text-white"
              href="#"
            >
              Düellolar
            </a>

            <a
              className="transition hover:text-white"
              href="#"
            >
              Liderlik
            </a>
          </nav>

          <AuthButton />
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-green-500/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1.3fr_0.7fr] md:py-24">
          <div className="flex flex-col justify-center">
            <span className="mb-5 w-fit rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-400">
              Günün oyunu hazır
            </span>

            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl md:text-6xl">
              Futbol bilgini
              <span className="block text-green-400">
                kanıtlamaya hazır mısın?
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">
              Hazırsan başlayalım... ama kaybedersen kol bozuk
              demek yok.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/wordle"
                className="animate-pulse-glow rounded-xl bg-green-500 px-6 py-4 text-center font-black text-[#07111f] shadow-lg shadow-green-500/20 transition duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:bg-green-400"
              >
                Günün Wordle&apos;ını Oyna
              </Link>

              <button className="rounded-xl border border-white/15 px-6 py-4 font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/5">
                Nasıl Oynanır?
              </button>
            </div>
          </div>

          <div className="animate-float-soft rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30">
            <div className="rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/20 to-transparent p-6">
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-green-500 px-3 py-1 text-xs font-black text-[#07111f]">
                  GÜNLÜK
                </span>

                <span className="text-sm text-slate-400">
                  5 tahmin
                </span>
              </div>

              <div className="my-8 flex justify-center gap-2">
                {["F", "O", "O", "T", "Y"].map(
                  (letter, index) => (
                    <div
                      key={`${letter}-${index}`}
                      className="flex h-12 w-12 items-center justify-center rounded-xl border border-green-500/30 bg-[#0c1929] text-xl font-black"
                    >
                      {letter}
                    </div>
                  ),
                )}
              </div>

              <p className="text-center text-sm text-slate-400">
                Footy seni bekliyor. Çok güveniyorsan başla.
              </p>
            </div>

            <HomeStats />
          </div>
        </div>
      </section>

      <section
        id="oyunlar"
        className="mx-auto max-w-6xl px-5 pb-20"
      >
        <div className="mb-7 flex items-end justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-green-400">
              Oyunlar
            </p>

            <h2 className="mt-2 text-3xl font-black">
              Arenanı seç
            </h2>
          </div>

          <p className="hidden text-sm text-slate-500 sm:block">
            Yeni oyunlar yakında eklenecek.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {games.map((game) => (
            <article
              key={game.title}
              className={`group rounded-2xl border border-white/10 bg-gradient-to-br ${game.color} p-5 transition hover:-translate-y-1 hover:border-white/20`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/20 text-xl font-black">
                {game.icon}
              </div>

              <h3 className="mt-7 text-xl font-black">
                {game.title}
              </h3>

              <p className="mt-2 min-h-16 text-sm leading-6 text-slate-400">
                {game.description}
              </p>

              {game.active ? (
                <Link
                  href={game.href}
                  className="mt-6 block w-full rounded-xl bg-green-500 px-4 py-3 text-center text-sm font-black text-[#07111f] transition hover:bg-green-400"
                >
                  {game.button}
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-6 w-full cursor-not-allowed rounded-xl bg-white/10 px-4 py-3 text-sm font-black text-slate-500"
                >
                  {game.button}
                </button>
              )}
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-600">
          Sponsor / reklam alanı ileride burada kullanılacak.
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-7 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 FootBattle</p>
          <p>Futbol bilgini konuşma, göster.</p>
        </div>
      </footer>
    </main>
  );
}