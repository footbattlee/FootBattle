import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

type PlayerPosition = {
  x: number;
  y: number;
};

type DrawingMode = "move" | "arrow" | "pen" | "eraser";

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

type DrawingItem = ArrowDrawing | PenDrawing;

type TacticKey =
  | "balanced"
  | "offensive"
  | "defensive";

type CreateShareBody = {
  squadName?: string;
  playerCount?: number;
  players?: string[];
  bodyColor?: string;
  sleeveColor?: string;
  tactic?: TacticKey;
  positions?: PlayerPosition[];
  drawings?: DrawingItem[];
};

function createShareId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as CreateShareBody;

    const playerCount =
      Number(body.playerCount);

    if (
      !Number.isInteger(playerCount) ||
      playerCount < 5 ||
      playerCount > 11
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Oyuncu sayısı geçersiz.",
        },
        { status: 400 },
      );
    }

    if (
      !Array.isArray(body.players) ||
      body.players.length !== playerCount
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Oyuncu listesi geçersiz.",
        },
        { status: 400 },
      );
    }

    if (
      !Array.isArray(body.positions) ||
      body.positions.length !== playerCount
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Oyuncu pozisyonları geçersiz.",
        },
        { status: 400 },
      );
    }

    const tactic =
      body.tactic === "offensive" ||
      body.tactic === "defensive"
        ? body.tactic
        : "balanced";

    const id =
      createShareId();

    const {
      error,
    } = await supabaseAdmin
      .from("halisaha_shares")
      .insert({
        id,

        squad_name:
          body.squadName?.trim() ||
          "Halısaha Kadrosu",

        player_count:
          playerCount,

        players:
          body.players,

        body_color:
          body.bodyColor ||
          "#c8101e",

        sleeve_color:
          body.sleeveColor ||
          "#ffffff",

        tactic,

        positions:
          body.positions,

        drawings:
          Array.isArray(body.drawings)
            ? body.drawings
            : [],
      });

    if (error) {
      console.error(
        "Halısaha paylaşımı kaydedilemedi:",
        error,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Paylaşım kaydedilemedi.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      id,
      sharePath:
        `/halisaha-kadro/share/${id}`,
    });
  } catch (error) {
    console.error(
      "Halisaha share endpoint error:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Paylaşım oluşturulurken hata oluştu.",
      },
      { status: 500 },
    );
  }
}