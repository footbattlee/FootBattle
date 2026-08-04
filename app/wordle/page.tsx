export default function WordlePage() {
  return (
    <main className="min-h-screen bg-[#07111f] px-5 py-10 text-white">
      <div className="mx-auto max-w-xl">
        <a
          href="/"
          className="text-sm font-semibold text-slate-400 transition hover:text-green-400"
        >
          ← Ana Sayfa
        </a>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="text-center">
            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-bold text-green-400">
              Günün Wordle&apos;ı
            </span>

            <h1 className="mt-6 text-4xl font-black">Futbolcuyu Bul</h1>

            <p className="mt-3 text-slate-400">
              Futbolcunun soyadını 5 tahminde bul.
            </p>
          </div>

          <div className="mt-10 space-y-3">
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} className="flex justify-center gap-2">
                {[0, 1, 2, 3, 4, 5, 6].map((box) => (
                  <div
                    key={box}
                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-[#0c1929] text-xl font-black"
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
            <p className="text-sm text-slate-400">
              😏 Footy: İlk tahminini görelim bakalım.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}