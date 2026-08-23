"use client";

type Player = {
  id: number;
  name: string;
  nationality: string | null;
  currentClubName: string | null;
  imageUrl: string | null;
};

type Props = {
  query: string;
  players: Player[];
  searching: boolean;
  busy: boolean;
  onQueryChange: (value: string) => void;
  onSelect: (player: Player) => void;
  onClose: () => void;
};

export default function MobilePlayerSearchSheet({
  query,
  players,
  searching,
  busy,
  onQueryChange,
  onSelect,
  onClose,
}: Props) {
  const hasQuery = query.trim().length >= 2;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-end bg-black/65 md:items-center md:justify-center md:p-6"
      onClick={onClose}
    >
      <section
        className="w-full overflow-hidden rounded-t-[28px] border border-white/10 bg-[#0d1828] shadow-2xl md:max-w-xl md:rounded-[28px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <div className="min-w-0 pr-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-yellow-300">Oyuncuyu seç</p>
            <p className="mt-1 text-sm text-slate-400">Seçtiğin hücre için futbolcu ara.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-lg font-black text-slate-300"
            aria-label="Oyuncu aramayı kapat"
          >
            ✕
          </button>
        </div>

        <div className="px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4">
          <input
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Futbolcu ara..."
            inputMode="search"
            enterKeyHint="search"
            className="block h-14 w-full min-w-0 rounded-2xl border border-white/10 bg-[#07111f] px-4 text-base text-white outline-none placeholder:text-slate-500 focus:border-yellow-300/50"
          />

          <div className="mt-3 max-h-[min(40dvh,300px)] min-h-[72px] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#07111f] p-2">
            {!hasQuery && <p className="px-3 py-4 text-sm text-slate-500">En az 2 harf yaz.</p>}
            {searching && <p className="px-3 py-4 text-sm text-slate-500">Aranıyor...</p>}
            {!searching && hasQuery && players.length === 0 && (
              <p className="px-3 py-4 text-sm text-slate-500">Oyuncu bulunamadı.</p>
            )}

            {!searching && players.map((player) => (
              <button
                key={player.id}
                type="button"
                disabled={busy}
                onClick={() => onSelect(player)}
                className="mb-1 grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-left active:border-white/10 active:bg-white/[0.06] disabled:opacity-50"
              >
                <span
                  className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold text-white"
                  style={{ writingMode: "horizontal-tb", wordBreak: "normal", overflowWrap: "normal" }}
                >
                  {player.name}
                </span>
                <span
                  className="block shrink-0 whitespace-nowrap text-xs font-bold text-green-300"
                  style={{ writingMode: "horizontal-tb", wordBreak: "normal", overflowWrap: "normal" }}
                >
                  Seç →
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
