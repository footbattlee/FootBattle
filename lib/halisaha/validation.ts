export type PlayerPosition = { x: number; y: number };

export type ArrowDrawing = {
  id: string;
  kind: "arrow";
  start: PlayerPosition;
  end: PlayerPosition;
  color: string;
  width: number;
};

export type PenDrawing = {
  id: string;
  kind: "pen";
  points: PlayerPosition[];
  color: string;
  width: number;
};

export type DrawingItem = ArrowDrawing | PenDrawing;
export type TacticKey = "balanced" | "offensive" | "defensive";

export type HalisahaSharePayload = {
  squadName: string;
  playerCount: number;
  players: string[];
  bodyColor: string;
  sleeveColor: string;
  tactic: TacticKey;
  positions: PlayerPosition[];
  drawings: DrawingItem[];
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const MAX_DRAWINGS = 80;
const MAX_PEN_POINTS = 600;

function boundedPoint(value: unknown): value is PlayerPosition {
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<PlayerPosition>;
  return (
    typeof point.x === "number" &&
    Number.isFinite(point.x) &&
    point.x >= 0 &&
    point.x <= 100 &&
    typeof point.y === "number" &&
    Number.isFinite(point.y) &&
    point.y >= 0 &&
    point.y <= 100
  );
}

function validDrawing(value: unknown): value is DrawingItem {
  if (!value || typeof value !== "object") return false;
  const drawing = value as Partial<DrawingItem> & { points?: unknown[] };

  if (
    typeof drawing.id !== "string" ||
    drawing.id.length < 1 ||
    drawing.id.length > 80 ||
    typeof drawing.color !== "string" ||
    !HEX_COLOR.test(drawing.color) ||
    typeof drawing.width !== "number" ||
    drawing.width < 1 ||
    drawing.width > 16
  ) {
    return false;
  }

  if (drawing.kind === "arrow") {
    const arrow = drawing as Partial<ArrowDrawing>;
    return boundedPoint(arrow.start) && boundedPoint(arrow.end);
  }

  if (drawing.kind === "pen") {
    return (
      Array.isArray(drawing.points) &&
      drawing.points.length >= 1 &&
      drawing.points.length <= MAX_PEN_POINTS &&
      drawing.points.every(boundedPoint)
    );
  }

  return false;
}

export function validateHalisahaSharePayload(input: unknown):
  | { ok: true; data: HalisahaSharePayload }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Paylaşım verisi geçersiz." };
  }

  const body = input as Partial<HalisahaSharePayload>;
  const playerCount = Number(body.playerCount);

  if (!Number.isInteger(playerCount) || playerCount < 5 || playerCount > 11) {
    return { ok: false, error: "Oyuncu sayısı 5 ile 11 arasında olmalı." };
  }

  const squadName = typeof body.squadName === "string" ? body.squadName.trim() : "";
  if (squadName.length > 80) {
    return { ok: false, error: "Kadro adı en fazla 80 karakter olabilir." };
  }

  if (!Array.isArray(body.players) || body.players.length !== playerCount) {
    return { ok: false, error: "Oyuncu listesi geçersiz." };
  }

  const players = body.players.map((player) =>
    typeof player === "string" ? player.trim() : "",
  );

  if (players.some((player) => player.length > 40)) {
    return { ok: false, error: "Oyuncu adları en fazla 40 karakter olabilir." };
  }

  if (!Array.isArray(body.positions) || body.positions.length !== playerCount) {
    return { ok: false, error: "Oyuncu pozisyonları geçersiz." };
  }

  if (!body.positions.every(boundedPoint)) {
    return { ok: false, error: "Oyuncu pozisyonları saha sınırlarının dışında." };
  }

  const bodyColor =
    typeof body.bodyColor === "string" && HEX_COLOR.test(body.bodyColor)
      ? body.bodyColor
      : "#c8101e";
  const sleeveColor =
    typeof body.sleeveColor === "string" && HEX_COLOR.test(body.sleeveColor)
      ? body.sleeveColor
      : "#ffffff";
  const tactic: TacticKey =
    body.tactic === "offensive" || body.tactic === "defensive"
      ? body.tactic
      : "balanced";

  const drawings = Array.isArray(body.drawings) ? body.drawings : [];
  if (drawings.length > MAX_DRAWINGS || !drawings.every(validDrawing)) {
    return { ok: false, error: "Çizim verisi geçersiz veya çok büyük." };
  }

  return {
    ok: true,
    data: {
      squadName: squadName || "Halısaha Kadrosu",
      playerCount,
      players,
      bodyColor,
      sleeveColor,
      tactic,
      positions: body.positions,
      drawings,
    },
  };
}
