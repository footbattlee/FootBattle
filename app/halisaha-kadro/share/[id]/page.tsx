import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabase/server";

type PlayerPosition = {
  x: number;
  y: number;
};

type ArrowDrawing = {
  id: string;
  kind: "arrow";
  start: PlayerPosition;
  end: PlayerPosition;
  color: string;
  width: number;
};

type PenDrawing = {
  id: string;
  kind: "pen";
  points: PlayerPosition[];
  color: string;
  width: number;
};

type DrawingItem =
  | ArrowDrawing
  | PenDrawing;

type ShareRow = {
  id: string;
  squad_name: string;
  player_count: number;
  players: string[];
  body_color: string;
  sleeve_color: string;
  tactic: string;
  positions: PlayerPosition[];
  drawings: DrawingItem[];
  created_at: string;
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

/* =========================================================
   GET SHARE
========================================================= */

async function getShare(
  id: string,
): Promise<ShareRow | null> {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("halisaha_shares")
    .select(`
      id,
      squad_name,
      player_count,
      players,
      body_color,
      sleeve_color,
      tactic,
      positions,
      drawings,
      created_at
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(
      "Halısaha paylaşımı okunamadı:",
      error,
    );

    return null;
  }

  if (!data) {
    return null;
  }

  return data as ShareRow;
}

/* =========================================================
   METADATA
========================================================= */

export async function generateMetadata(
  props: PageProps,
): Promise<Metadata> {
  const {
    id,
  } = await props.params;

  const share =
    await getShare(id);

  if (!share) {
    return {
      title:
        "Halısaha Kadrosu | FootBattle",

      description:
        "FootBattle ile oluşturulan halısaha kadrosu.",
    };
  }

  const title =
    `${share.squad_name} | FootBattle`;

  const description =
    `${share.player_count} kişilik halısaha kadrosunu görüntüle.`;

  return {
    title,

    description,

    openGraph: {
      title,

      description,

      type:
        "website",

      url:
        `/halisaha-kadro/share/${share.id}`,

      images: [
        {
          url:
            `/halisaha-kadro/share/${share.id}/opengraph-image`,

          width:
            1200,

          height:
            630,

          alt:
            `${share.squad_name} halısaha kadrosu`,
        },
      ],
    },

    twitter: {
      card:
        "summary_large_image",

      title,

      description,

      images: [
        `/halisaha-kadro/share/${share.id}/opengraph-image`,
      ],
    },
  };
}

/* =========================================================
   PAGE
========================================================= */

export default async function SharedHalisahaPage(
  props: PageProps,
) {
  const {
    id,
  } = await props.params;

  const share =
    await getShare(id);

  if (!share) {
    notFound();
  }

  const players =
    Array.isArray(
      share.players,
    )
      ? share.players.slice(
          0,
          share.player_count,
        )
      : [];

  const positions =
    Array.isArray(
      share.positions,
    )
      ? share.positions
      : [];

  const drawings =
    Array.isArray(
      share.drawings,
    )
      ? share.drawings
      : [];

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-6 text-white sm:px-6">

      <div className="mx-auto max-w-[1000px]">

        {/* HEADER */}

        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <Link
              href="/"
              className="inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-400 transition hover:text-white"
            >
              ← FootBattle
            </Link>

            <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-yellow-400">
              Paylaşılan Halısaha Kadrosu
            </p>

            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              {share.squad_name}
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              {share.player_count} kişilik kadro
            </p>

          </div>

          <Link
            href="/halisaha-kadro"
            className="rounded-xl bg-yellow-400 px-5 py-3 text-center text-sm font-black text-[#07111f] transition hover:bg-yellow-300"
          >
            ⚽ Kendi Kadronu Oluştur
          </Link>

        </header>

        {/* PITCH */}

        <section className="mt-7 rounded-3xl border border-white/10 bg-[#0d1828] p-2 shadow-2xl shadow-black/30 sm:p-5">

          <div className="relative mx-auto aspect-[3/4] w-full max-w-[720px] overflow-hidden rounded-2xl border-4 border-green-950 bg-[#37a823]">

            <PitchLines />

            {/* WATERMARK */}

            <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 w-[72%] -translate-x-1/2 -translate-y-1/2 text-center text-white/20">

              <p className="text-4xl font-black italic sm:text-6xl">
                FootBattle
              </p>

              <p className="mt-2 text-xs font-black sm:text-lg">
                {share.squad_name}
              </p>

            </div>

            {/* DRAWINGS */}

            <DrawingSvg
              drawings={
                drawings
              }
            />

            {/* PLAYERS */}

            {players.map(
              (
                player,
                index,
              ) => {
                const position =
                  positions[
                    index
                  ] ?? {
                    x:
                      50,

                    y:
                      50,
                  };

                return (
                  <div
                    key={
                      index
                    }
                    className="absolute z-20 -translate-x-1/2 -translate-y-1/2 text-center"
                    style={{
                      left:
                        `${position.x}%`,

                      top:
                        `${position.y}%`,
                    }}
                  >

                    <Jersey
                      number={
                        index +
                        1
                      }
                      bodyColor={
                        share.body_color
                      }
                      sleeveColor={
                        share.sleeve_color
                      }
                    />

                    <div className="mx-auto mt-1 max-w-24 truncate rounded-md border border-white/10 bg-[#07111f]/90 px-2 py-1 text-[10px] font-black shadow-lg sm:max-w-32 sm:text-sm">
                      {player.trim() ||
                        `Oyuncu ${
                          index +
                          1
                        }`}
                    </div>

                  </div>
                );
              },
            )}

          </div>

        </section>

        {/* PLAYER LIST */}

        <section className="mt-6 rounded-3xl border border-white/10 bg-[#0d1828] p-5 sm:p-6">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.2em] text-green-400">
                Kadro
              </p>

              <h2 className="mt-1 text-xl font-black">
                Oyuncular
              </h2>

            </div>

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black text-slate-400">
              {players.length} kişi
            </span>

          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">

            {players.map(
              (
                player,
                index,
              ) => (
                <div
                  key={
                    index
                  }
                  className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/10 px-4 py-3"
                >

                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-400 text-xs font-black text-[#07111f]">
                    {index + 1}
                  </div>

                  <span className="truncate text-sm font-bold">
                    {player.trim() ||
                      `Oyuncu ${
                        index +
                        1
                      }`}
                  </span>

                </div>
              ),
            )}

          </div>

        </section>

        {/* CTA */}

        <section className="mt-6 rounded-3xl border border-yellow-400/20 bg-yellow-400/[0.05] p-6 text-center">

          <p className="text-2xl">
            ⚽
          </p>

          <h2 className="mt-2 text-xl font-black">
            Sen de kadronu kur
          </h2>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
            Arkadaşlarını sahaya yerleştir, taktiğini çiz ve kısa linkle paylaş.
          </p>

          <Link
            href="/halisaha-kadro"
            className="mt-5 inline-flex rounded-xl bg-yellow-400 px-6 py-3 text-sm font-black text-[#07111f] transition hover:bg-yellow-300"
          >
            Kadro Oluştur
          </Link>

        </section>

      </div>

    </main>
  );
}

/* =========================================================
   DRAWINGS
========================================================= */

function DrawingSvg({
  drawings,
}: {
  drawings: DrawingItem[];
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 z-[15] h-full w-full"
      aria-hidden="true"
    >

      <defs>

        <marker
          id="shared-arrow-head"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >

          <path
            d="M0,0 L6,3 L0,6 Z"
            fill="context-stroke"
          />

        </marker>

      </defs>

      {drawings.map(
        (
          drawing,
        ) => {
          if (
            drawing.kind ===
            "arrow"
          ) {
            return (
              <line
                key={
                  drawing.id
                }
                x1={
                  drawing.start.x
                }
                y1={
                  drawing.start.y
                }
                x2={
                  drawing.end.x
                }
                y2={
                  drawing.end.y
                }
                stroke={
                  drawing.color
                }
                strokeWidth={
                  drawing.width
                }
                strokeLinecap="round"
                markerEnd="url(#shared-arrow-head)"
                vectorEffect="non-scaling-stroke"
              />
            );
          }

          const points =
            drawing.points
              .map(
                (
                  point,
                ) =>
                  `${point.x},${point.y}`,
              )
              .join(
                " ",
              );

          return (
            <polyline
              key={
                drawing.id
              }
              points={
                points
              }
              fill="none"
              stroke={
                drawing.color
              }
              strokeWidth={
                drawing.width
              }
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          );
        },
      )}

    </svg>
  );
}

/* =========================================================
   PITCH
========================================================= */

function PitchLines() {
  return (
    <>
      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.055)_0%,rgba(255,255,255,0.055)_12.5%,rgba(0,0,0,0.035)_12.5%,rgba(0,0,0,0.035)_25%)]" />

      <div className="absolute inset-[3%] border-[3px] border-white/75" />

      <div className="absolute left-[3%] right-[3%] top-1/2 h-[3px] -translate-y-1/2 bg-white/70" />

      <div className="absolute left-1/2 top-1/2 aspect-square w-[31%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white/70" />

      <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />

      <div className="absolute left-1/2 top-[3%] h-[17%] w-[50%] -translate-x-1/2 border-x-[3px] border-b-[3px] border-white/70" />

      <div className="absolute left-1/2 top-[3%] h-[8%] w-[27%] -translate-x-1/2 border-x-[3px] border-b-[3px] border-white/70" />

      <div className="absolute left-1/2 top-0 h-[3%] w-[19%] -translate-x-1/2 border-x-[3px] border-t-[3px] border-white/85 bg-white/10" />

      <div className="absolute bottom-[3%] left-1/2 h-[17%] w-[50%] -translate-x-1/2 border-x-[3px] border-t-[3px] border-white/70" />

      <div className="absolute bottom-[3%] left-1/2 h-[8%] w-[27%] -translate-x-1/2 border-x-[3px] border-t-[3px] border-white/70" />

      <div className="absolute bottom-0 left-1/2 h-[3%] w-[19%] -translate-x-1/2 border-x-[3px] border-b-[3px] border-white/85 bg-white/10" />
    </>
  );
}

/* =========================================================
   JERSEY
========================================================= */

function Jersey({
  number,
  bodyColor,
  sleeveColor,
}: {
  number: number;
  bodyColor: string;
  sleeveColor: string;
}) {
  return (
    <div className="relative mx-auto h-14 w-16 drop-shadow-xl sm:h-16 sm:w-20">

      <div
        className="absolute left-0 top-2 h-6 w-6 -rotate-[18deg] rounded-l-md border border-black/30"
        style={{
          backgroundColor:
            sleeveColor,
        }}
      />

      <div
        className="absolute right-0 top-2 h-6 w-6 rotate-[18deg] rounded-r-md border border-black/30"
        style={{
          backgroundColor:
            sleeveColor,
        }}
      />

      <div
        className="absolute left-1/2 top-1 h-12 w-10 -translate-x-1/2 rounded-b-md border border-black/40 sm:h-14 sm:w-12"
        style={{
          backgroundColor:
            bodyColor,
        }}
      >

        <div className="absolute left-1/2 top-0 h-3 w-5 -translate-x-1/2 -translate-y-1/3 rounded-b-full border-b-2 border-white/80 bg-[#07111f]" />

        <span className="flex h-full items-center justify-center text-lg font-black text-white">
          {number}
        </span>

      </div>

    </div>
  );
}