"use client";

import Link from "next/link";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

type AdminUser = {
  id: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  totalScore: number;
  currentStreak: number;
  bestStreak: number;
  gamesPlayed: number;
  gamesWon: number;
  createdAt: string | null;
  updatedAt: string | null;
  lastPlayDate: string | null;
  lastSeenAt: string | null;
  isOnline: boolean;
  isAdmin: boolean;
};

type UsersResponse = {
  ok?: boolean;
  error?: string;

  users?: AdminUser[];

  summary?: {
    totalUsers: number;
    onlineUsers: number;
    activeLast24Hours: number;
    newUsersLast7Days: number;
  };

  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function formatDateTime(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatRelativeTime(value: string | null) {
  if (!value) return "Hiç görülmedi";

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();

  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return formatDateTime(value);
  }

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "az önce";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dk önce`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce`;

  return formatDateTime(value);
}

export default function AdminUsersPage() {
  const [users, setUsers] =
    useState<AdminUser[]>([]);

  const [summary, setSummary] =
    useState({
      totalUsers: 0,
      onlineUsers: 0,
      activeLast24Hours: 0,
      newUsersLast7Days: 0,
    });

  const [query, setQuery] =
    useState("");

  const [
    debouncedQuery,
    setDebouncedQuery,
  ] = useState("");

  const [page, setPage] =
    useState(1);

  const [
    totalPages,
    setTotalPages,
  ] = useState(1);

  const [
    totalRows,
    setTotalRows,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          setDebouncedQuery(
            query.trim(),
          );
          setPage(1);
        },
        300,
      );

    return () => {
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      try {
        setLoading(true);
        setError("");

        const params =
          new URLSearchParams({
            page: String(page),
            limit: "25",
          });

        if (debouncedQuery) {
          params.set(
            "q",
            debouncedQuery,
          );
        }

        const response =
          await fetch(
            `/api/admin/users?${params.toString()}`,
            {
              cache: "no-store",
            },
          );

        const result =
          (await response.json()) as
            UsersResponse;

        if (cancelled) return;

        if (
          !response.ok ||
          !result.ok
        ) {
          throw new Error(
            result.error ??
              "Kullanıcılar yüklenemedi.",
          );
        }

        setUsers(
          result.users ?? [],
        );

        setSummary({
          totalUsers:
            result.summary
              ?.totalUsers ?? 0,
          onlineUsers:
            result.summary
              ?.onlineUsers ?? 0,
          activeLast24Hours:
            result.summary
              ?.activeLast24Hours ??
            0,
          newUsersLast7Days:
            result.summary
              ?.newUsersLast7Days ??
            0,
        });

        setTotalPages(
          result.pagination
            ?.totalPages ?? 1,
        );

        setTotalRows(
          result.pagination
            ?.total ?? 0,
        );
      } catch (loadError) {
        if (!cancelled) {
          setUsers([]);

          setError(
            loadError instanceof Error
              ? loadError.message
              : "Kullanıcılar yüklenemedi.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [
    page,
    debouncedQuery,
  ]);

  const displayedRange =
    useMemo(() => {
      if (totalRows === 0) {
        return "0 kullanıcı";
      }

      const start =
        (page - 1) * 25 + 1;

      const end =
        Math.min(
          page * 25,
          totalRows,
        );

      return `${start}-${end} / ${formatNumber(
        totalRows,
      )}`;
    }, [
      page,
      totalRows,
    ]);

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-7xl px-5 py-8">

        <header className="flex flex-col gap-6 border-b border-white/10 pb-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin"
                className="inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:text-white"
              >
                ← Admin Panel
              </Link>

              <Link
                href="/admin/analytics"
                className="inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:text-white"
              >
                📊 Oyun Raporları
              </Link>

              <Link
                href="/admin/daily-games"
                className="inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:text-white"
              >
                🎮 Günlük Oyunlar
              </Link>

              <Link
                href="/"
                className="inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:text-white"
              >
                Ana Sayfa
              </Link>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <Users
                className="text-green-400"
                size={34}
              />

              <div>
                <h1 className="text-3xl font-black sm:text-4xl">
                  Kullanıcı Yönetimi
                </h1>

                <p className="mt-1 text-slate-400">
                  Kayıtlı kullanıcıları, aktivite ve oyun istatistikleriyle görüntüle.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<Users size={20} />}
            label="Toplam Kullanıcı"
            value={summary.totalUsers}
            accent="text-yellow-300"
          />

          <SummaryCard
            icon={<Activity size={20} />}
            label="Şu An Online"
            value={summary.onlineUsers}
            accent="text-green-400"
          />

          <SummaryCard
            icon={<UserRound size={20} />}
            label="Son 24 Saat Aktif"
            value={
              summary.activeLast24Hours
            }
            accent="text-cyan-300"
          />

          <SummaryCard
            icon={
              <ShieldCheck
                size={20}
              />
            }
            label="Son 7 Gün Yeni"
            value={
              summary.newUsersLast7Days
            }
            accent="text-purple-300"
          />
        </section>

        <section className="mt-7 rounded-3xl border border-white/10 bg-[#0d1828] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-xl">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                value={query}
                onChange={(event) =>
                  setQuery(
                    event.target.value,
                  )
                }
                placeholder="Kullanıcı adı veya görünen ad ara..."
                className="w-full rounded-xl border border-white/10 bg-[#07111f] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-green-400/40"
              />
            </div>

            <p className="shrink-0 text-sm font-bold text-slate-500">
              {displayedRange}
            </p>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-[#0d1828]">
          {error ? (
            <div className="m-5 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
              {error}
            </div>
          ) : loading ? (
            <div className="flex min-h-80 items-center justify-center">
              <Loader2
                className="animate-spin text-green-400"
                size={34}
              />
            </div>
          ) : users.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center px-5 text-center">
              <Users
                className="text-slate-700"
                size={46}
              />

              <p className="mt-4 font-black">
                Kullanıcı bulunamadı
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px]">
                <thead className="border-b border-white/10 bg-black/10">
                  <tr className="text-left text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-4">
                      Kullanıcı
                    </th>
                    <th className="px-4 py-4">
                      Durum
                    </th>
                    <th className="px-4 py-4 text-right">
                      Puan
                    </th>
                    <th className="px-4 py-4 text-right">
                      Oyun
                    </th>
                    <th className="px-4 py-4 text-right">
                      Galibiyet
                    </th>
                    <th className="px-4 py-4 text-right">
                      Seri
                    </th>
                    <th className="px-4 py-4">
                      Son Görülme
                    </th>
                    <th className="px-4 py-4">
                      Kayıt
                    </th>
                    <th className="px-5 py-4">
                      Yetki
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-white/[0.06] transition last:border-b-0 hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {user.avatarUrl ? (
                            <img
                              src={
                                user.avatarUrl
                              }
                              alt=""
                              className="h-11 w-11 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#07111f] font-black text-slate-300">
                              {user.displayName
                                .slice(0, 1)
                                .toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="max-w-[220px] truncate font-black">
                              {
                                user.displayName
                              }
                            </p>

                            <p className="mt-0.5 max-w-[220px] truncate text-xs text-slate-500">
                              {user.username
                                ? `@${user.username}`
                                : user.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${
                            user.isOnline
                              ? "border-green-500/20 bg-green-500/10 text-green-300"
                              : "border-white/10 bg-white/[0.03] text-slate-500"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              user.isOnline
                                ? "bg-green-400"
                                : "bg-slate-600"
                            }`}
                          />

                          {user.isOnline
                            ? "Online"
                            : "Offline"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right font-black text-yellow-300">
                        {formatNumber(
                          user.totalScore,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-bold">
                        {formatNumber(
                          user.gamesPlayed,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-bold text-green-300">
                        {formatNumber(
                          user.gamesWon,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <p className="font-black">
                          🔥{" "}
                          {
                            user.currentStreak
                          }
                        </p>

                        <p className="mt-0.5 text-[10px] text-slate-600">
                          En iyi{" "}
                          {user.bestStreak}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-sm font-bold text-slate-300">
                          {formatRelativeTime(
                            user.lastSeenAt,
                          )}
                        </p>

                        <p className="mt-0.5 text-[10px] text-slate-600">
                          {formatDateTime(
                            user.lastSeenAt,
                          )}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-400">
                        {formatDateTime(
                          user.createdAt,
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {user.isAdmin ? (
                          <span className="inline-flex rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1.5 text-xs font-black text-yellow-300">
                            ADMIN
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-600">
                            Oyuncu
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading &&
            !error &&
            users.length > 0 && (
              <div className="flex items-center justify-between gap-4 border-t border-white/10 px-5 py-4">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage((current) =>
                      Math.max(
                        current - 1,
                        1,
                      ),
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-black text-slate-300 transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft
                    size={17}
                  />
                  Önceki
                </button>

                <p className="text-sm font-bold text-slate-500">
                  Sayfa{" "}
                  <span className="text-white">
                    {page}
                  </span>
                  {" / "}
                  {totalPages}
                </p>

                <button
                  type="button"
                  disabled={
                    page >= totalPages
                  }
                  onClick={() =>
                    setPage((current) =>
                      Math.min(
                        current + 1,
                        totalPages,
                      ),
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-black text-slate-300 transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Sonraki
                  <ChevronRight
                    size={17}
                  />
                </button>
              </div>
            )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#0d1828] p-5">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}

        <p className="text-xs font-black uppercase tracking-wider">
          {label}
        </p>
      </div>

      <p
        className={`mt-3 text-3xl font-black ${accent}`}
      >
        {formatNumber(value)}
      </p>
    </article>
  );
}