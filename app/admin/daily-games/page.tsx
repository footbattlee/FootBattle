"use client";

import Link from "next/link";
import {
  CalendarDays,
  Check,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Player = {
  id: number;
  fullName: string;
  imageUrl: string | null;
  nationality: string | null;
  position: string | null;
  subPosition: string | null;
  club: string | null;
  popularityScore: number | null;
};

type DailyGame = {
  gameCode:
    | "wordle"
    | "guess_the_player"
    | "player_quiz"
    | "career_path";
  label: string;
  record: null | {
    playDate: string;
    playerId: number;
    isPublished: boolean;
    createdAt: string;
    createdBy: string | null;
    player: Player | null;
  };
};

type DailyGamesResponse = {
  ok?: boolean;
  error?: string;
  playDate?: string;
  games?: DailyGame[];
};

type PlayerSearchResponse = {
  ok?: boolean;
  error?: string;
  players?: Player[];
};

function getTurkeyDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function AdminDailyGamesPage() {
  const [playDate, setPlayDate] = useState(getTurkeyDateKey());
  const [games, setGames] = useState<DailyGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [editingGame, setEditingGame] =
    useState<DailyGame["gameCode"] | null>(null);
  const [playerQuery, setPlayerQuery] = useState("");
  const [playerResults, setPlayerResults] = useState<Player[]>([]);
  const [playerSearchLoading, setPlayerSearchLoading] =
    useState(false);

  const publishedCount = useMemo(
    () =>
      games.filter((game) => game.record?.isPublished).length,
    [games],
  );

  useEffect(() => {
    void loadGames();
  }, [playDate]);

  useEffect(() => {
    if (!editingGame) {
      return;
    }

    const query = playerQuery.trim();

    if (query.length < 2) {
      setPlayerResults([]);
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      try {
        setPlayerSearchLoading(true);

        const response = await fetch(
          `/api/admin/player-search?q=${encodeURIComponent(query)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const result =
          (await response.json()) as PlayerSearchResponse;

        if (!response.ok || !result.ok) {
          throw new Error(result.error ?? "Oyuncular aranamadı.");
        }

        setPlayerResults(result.players ?? []);
      } catch (searchError) {
        if (
          searchError instanceof DOMException &&
          searchError.name === "AbortError"
        ) {
          return;
        }

        setPlayerResults([]);
      } finally {
        setPlayerSearchLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [editingGame, playerQuery]);

  async function loadGames() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/admin/daily-games?date=${encodeURIComponent(playDate)}`,
        { cache: "no-store" },
      );

      const result =
        (await response.json()) as DailyGamesResponse;

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error ?? "Günlük oyunlar yüklenemedi.",
        );
      }

      setGames(result.games ?? []);
    } catch (loadError) {
      setGames([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Günlük oyunlar yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function generate(force: boolean) {
    try {
      setActionLoading(force ? "regenerate" : "generate");
      setError("");
      setMessage("");

      const response = await fetch(
        "/api/admin/daily-games/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            playDate,
            force,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error ?? "Adaylar üretilemedi.",
        );
      }

      setMessage(
        force
          ? "Tüm adaylar yeniden seçildi."
          : "Eksik günlük oyun adayları oluşturuldu.",
      );

      await loadGames();
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Adaylar üretilemedi.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function changePlayer(
    gameCode: DailyGame["gameCode"],
    playerId: number,
  ) {
    try {
      setActionLoading(`update-${gameCode}`);
      setError("");
      setMessage("");

      const response = await fetch(
        "/api/admin/daily-games/update",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            playDate,
            gameCode,
            playerId,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error ?? "Oyuncu değiştirilemedi.",
        );
      }

      setEditingGame(null);
      setPlayerQuery("");
      setPlayerResults([]);
      setMessage("Oyuncu değiştirildi ve yayın durumu taslağa alındı.");

      await loadGames();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Oyuncu değiştirilemedi.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function publish(
    gameCode: DailyGame["gameCode"] | "all",
    isPublished: boolean,
  ) {
    try {
      setActionLoading(`publish-${gameCode}`);
      setError("");
      setMessage("");

      const response = await fetch(
        "/api/admin/daily-games/publish",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            playDate,
            gameCode,
            isPublished,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error ?? "Yayın durumu güncellenemedi.",
        );
      }

      setMessage(
        isPublished
          ? gameCode === "all"
            ? "Tüm günlük oyunlar yayınlandı."
            : "Oyun yayınlandı."
          : "Oyun yayından kaldırıldı.",
      );

      await loadGames();
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Yayın durumu güncellenemedi.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-7xl px-5 py-8">
        <header className="flex flex-col gap-6 border-b border-white/10 pb-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/"
              className="inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:text-white"
            >
              ← Ana Sayfa
            </Link>

            <div className="mt-5 flex items-center gap-3">
              <ShieldCheck className="text-yellow-300" size={32} />
              <div>
                <h1 className="text-3xl font-black sm:text-4xl">
                  Günlük Oyun Yönetimi
                </h1>
                <p className="mt-1 text-slate-400">
                  Adayları üret, kontrol et, değiştir ve yayınla.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Yayın durumu
            </p>
            <p className="mt-2 text-2xl font-black">
              <span className="text-green-400">{publishedCount}</span>
              <span className="text-slate-600"> / 4</span>
            </p>
          </div>
        </header>

        <section className="mt-7 rounded-3xl border border-white/10 bg-[#0d1828] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <label>
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-400">
                <CalendarDays size={17} />
                Oyun tarihi
              </span>

              <input
                type="date"
                value={playDate}
                onChange={(event) => setPlayDate(event.target.value)}
                className="rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 outline-none focus:border-yellow-400/50"
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void generate(false)}
                disabled={Boolean(actionLoading)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 font-black text-[#07111f] disabled:opacity-50"
              >
                {actionLoading === "generate" ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Sparkles size={18} />
                )}
                Adayları Oluştur
              </button>

              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Dört oyun için seçilen adaylar değiştirilecek. Devam edilsin mi?",
                    )
                  ) {
                    void generate(true);
                  }
                }}
                disabled={Boolean(actionLoading)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/30 px-5 py-3 font-black text-red-300 disabled:opacity-50"
              >
                <RefreshCcw size={18} />
                Tümünü Yeniden Seç
              </button>

              <button
                type="button"
                onClick={() => void publish("all", true)}
                disabled={
                  Boolean(actionLoading) ||
                  games.length !== 4 ||
                  games.some((game) => !game.record)
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-400/30 bg-green-400/10 px-5 py-3 font-black text-green-300 disabled:opacity-40"
              >
                <Check size={18} />
                Tümünü Yayınla
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
              {error}
            </div>
          )}

          {message && (
            <div className="mt-5 rounded-xl border border-green-400/20 bg-green-500/10 px-4 py-3 text-sm font-bold text-green-300">
              {message}
            </div>
          )}
        </section>

        {loading ? (
          <div className="flex min-h-72 items-center justify-center">
            <Loader2 className="animate-spin text-yellow-300" size={34} />
          </div>
        ) : (
          <section className="mt-7 grid gap-5 md:grid-cols-2">
            {games.map((game) => (
              <article
                key={game.gameCode}
                className="rounded-3xl border border-white/10 bg-[#0d1828] p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-yellow-300">
                      Günlük oyun
                    </p>
                    <h2 className="mt-1 text-2xl font-black">
                      {game.label}
                    </h2>
                  </div>

                  <span
                    className={`rounded-full px-3 py-2 text-xs font-black ${
                      game.record?.isPublished
                        ? "bg-green-500/15 text-green-300"
                        : "bg-yellow-500/15 text-yellow-300"
                    }`}
                  >
                    {game.record?.isPublished ? "YAYINDA" : "TASLAK"}
                  </span>
                </div>

                {game.record?.player ? (
                  <div className="mt-5 flex items-center gap-4 rounded-2xl border border-white/10 bg-[#07111f] p-4">
                    {game.record.player.imageUrl ? (
                      <img
                        src={game.record.player.imageUrl}
                        alt=""
                        className="h-20 w-20 rounded-2xl object-cover object-top"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-800 text-2xl font-black">
                        {game.record.player.fullName.slice(0, 1)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-xl font-black">
                        {game.record.player.fullName}
                      </p>
                      <p className="mt-1 truncate text-sm text-slate-400">
                        {game.record.player.club ?? "Kulüpsüz"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {game.record.player.nationality ?? "—"} ·{" "}
                        {game.record.player.subPosition ??
                          game.record.player.position ??
                          "Mevki bilinmiyor"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-7 text-center text-slate-500">
                    Bu tarih için aday oluşturulmadı.
                  </div>
                )}

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingGame(game.gameCode);
                      setPlayerQuery("");
                      setPlayerResults([]);
                    }}
                    disabled={!game.record}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 font-black disabled:opacity-40"
                  >
                    <Search size={17} />
                    Oyuncuyu Değiştir
                  </button>

                  {game.record?.isPublished ? (
                    <button
                      type="button"
                      onClick={() =>
                        void publish(game.gameCode, false)
                      }
                      disabled={Boolean(actionLoading)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 font-black text-red-300"
                    >
                      <X size={17} />
                      Yayından Kaldır
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        void publish(game.gameCode, true)
                      }
                      disabled={!game.record || Boolean(actionLoading)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-400/30 bg-green-500/10 px-4 py-3 font-black text-green-300 disabled:opacity-40"
                    >
                      <Check size={17} />
                      Yayınla
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}
      </div>

      {editingGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[#0d1828] shadow-2xl">
            <header className="flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <h2 className="text-xl font-black">
                  Oyuncuyu değiştir
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  En az iki harf yazarak oyuncu ara.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingGame(null)}
                className="rounded-xl border border-white/10 p-3"
              >
                <X size={20} />
              </button>
            </header>

            <div className="p-5">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  autoFocus
                  value={playerQuery}
                  onChange={(event) => setPlayerQuery(event.target.value)}
                  placeholder="Örn. Ronaldo"
                  className="w-full rounded-xl border border-white/10 bg-[#07111f] py-3 pl-11 pr-4 outline-none focus:border-yellow-400/50"
                />
              </div>

              <div className="mt-4 max-h-[55vh] overflow-y-auto">
                {playerSearchLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin" />
                  </div>
                ) : playerResults.length === 0 ? (
                  <p className="py-12 text-center text-slate-500">
                    Oyuncu bulunamadı.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {playerResults.map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() =>
                          void changePlayer(editingGame, player.id)
                        }
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#07111f] p-4 text-left transition hover:border-yellow-400/40"
                      >
                        {player.imageUrl ? (
                          <img
                            src={player.imageUrl}
                            alt=""
                            className="h-14 w-14 rounded-full object-cover object-top"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 font-black">
                            {player.fullName.slice(0, 1)}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="truncate font-black">
                            {player.fullName}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {player.club ?? "Kulüpsüz"} ·{" "}
                            {player.nationality ?? "—"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}