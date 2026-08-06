"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Copy,
  Download,
  Eraser,
  HelpCircle,
  Link2,
  MousePointer2,
  Pencil,
  RotateCcw,
  Share2,
  Trash2,
  Undo2,
} from "lucide-react";
import { toPng } from "html-to-image";
import {
  PointerEvent as ReactPointerEvent,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const MIN_PLAYER_COUNT = 5;
const MAX_PLAYER_COUNT = 11;
const DEFAULT_PLAYER_COUNT = 7;

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

type TacticKey = "balanced" | "offensive" | "defensive";

type SharePayload = {
  squadName: string;
  playerCount: number;
  players: string[];
  bodyColor: string;
  sleeveColor: string;
  tactic: TacticKey;
  positions: PlayerPosition[];
  drawings: DrawingItem[];
};

const INITIAL_PLAYERS = [
  "Ahmet",
  "Mehmet",
  "Cem",
  "Kerem",
  "Can",
  "Deniz",
  "Tolga",
  "Oyuncu 8",
  "Oyuncu 9",
  "Oyuncu 10",
  "Oyuncu 11",
];

const TACTIC_LABELS: Record<TacticKey, string> = {
  balanced: "Dengeli",
  offensive: "Hücum",
  defensive: "Savunma",
};

const FORMATION_POSITIONS: Record<
  TacticKey,
  Record<number, PlayerPosition[]>
> = {
  balanced: {
    5: [
      { x: 50, y: 91 },
      { x: 27, y: 66 },
      { x: 73, y: 66 },
      { x: 30, y: 29 },
      { x: 70, y: 29 },
    ],
    6: [
      { x: 50, y: 91 },
      { x: 25, y: 70 },
      { x: 75, y: 70 },
      { x: 25, y: 45 },
      { x: 75, y: 45 },
      { x: 50, y: 19 },
    ],
    7: [
      { x: 50, y: 91 },
      { x: 25, y: 72 },
      { x: 75, y: 72 },
      { x: 18, y: 47 },
      { x: 50, y: 50 },
      { x: 82, y: 47 },
      { x: 50, y: 19 },
    ],
    8: [
      { x: 50, y: 91 },
      { x: 18, y: 72 },
      { x: 50, y: 75 },
      { x: 82, y: 72 },
      { x: 18, y: 44 },
      { x: 50, y: 48 },
      { x: 82, y: 44 },
      { x: 50, y: 18 },
    ],
    9: [
      { x: 50, y: 91 },
      { x: 14, y: 73 },
      { x: 38, y: 77 },
      { x: 62, y: 77 },
      { x: 86, y: 73 },
      { x: 22, y: 46 },
      { x: 50, y: 50 },
      { x: 78, y: 46 },
      { x: 50, y: 18 },
    ],
    10: [
      { x: 50, y: 91 },
      { x: 14, y: 73 },
      { x: 38, y: 77 },
      { x: 62, y: 77 },
      { x: 86, y: 73 },
      { x: 15, y: 45 },
      { x: 38, y: 49 },
      { x: 62, y: 49 },
      { x: 85, y: 45 },
      { x: 50, y: 18 },
    ],
    11: [
      { x: 50, y: 91 },
      { x: 13, y: 73 },
      { x: 37, y: 77 },
      { x: 63, y: 77 },
      { x: 87, y: 73 },
      { x: 15, y: 46 },
      { x: 38, y: 50 },
      { x: 62, y: 50 },
      { x: 85, y: 46 },
      { x: 34, y: 18 },
      { x: 66, y: 18 },
    ],
  },
  offensive: {
    5: [
      { x: 50, y: 91 },
      { x: 50, y: 70 },
      { x: 18, y: 30 },
      { x: 50, y: 24 },
      { x: 82, y: 30 },
    ],
    6: [
      { x: 50, y: 91 },
      { x: 27, y: 72 },
      { x: 73, y: 72 },
      { x: 50, y: 49 },
      { x: 28, y: 22 },
      { x: 72, y: 22 },
    ],
    7: [
      { x: 50, y: 91 },
      { x: 25, y: 72 },
      { x: 75, y: 72 },
      { x: 27, y: 48 },
      { x: 73, y: 48 },
      { x: 28, y: 20 },
      { x: 72, y: 20 },
    ],
    8: [
      { x: 50, y: 91 },
      { x: 25, y: 73 },
      { x: 75, y: 73 },
      { x: 18, y: 47 },
      { x: 50, y: 51 },
      { x: 82, y: 47 },
      { x: 28, y: 19 },
      { x: 72, y: 19 },
    ],
    9: [
      { x: 50, y: 91 },
      { x: 20, y: 73 },
      { x: 50, y: 76 },
      { x: 80, y: 73 },
      { x: 18, y: 47 },
      { x: 50, y: 51 },
      { x: 82, y: 47 },
      { x: 28, y: 18 },
      { x: 72, y: 18 },
    ],
    10: [
      { x: 50, y: 91 },
      { x: 20, y: 73 },
      { x: 50, y: 76 },
      { x: 80, y: 73 },
      { x: 13, y: 46 },
      { x: 38, y: 50 },
      { x: 62, y: 50 },
      { x: 87, y: 46 },
      { x: 28, y: 18 },
      { x: 72, y: 18 },
    ],
    11: [
      { x: 50, y: 91 },
      { x: 20, y: 73 },
      { x: 50, y: 76 },
      { x: 80, y: 73 },
      { x: 13, y: 47 },
      { x: 38, y: 51 },
      { x: 62, y: 51 },
      { x: 87, y: 47 },
      { x: 18, y: 18 },
      { x: 50, y: 14 },
      { x: 82, y: 18 },
    ],
  },
  defensive: {
    5: [
      { x: 50, y: 91 },
      { x: 27, y: 72 },
      { x: 73, y: 72 },
      { x: 50, y: 49 },
      { x: 50, y: 22 },
    ],
    6: [
      { x: 50, y: 91 },
      { x: 18, y: 72 },
      { x: 50, y: 77 },
      { x: 82, y: 72 },
      { x: 50, y: 48 },
      { x: 50, y: 21 },
    ],
    7: [
      { x: 50, y: 91 },
      { x: 18, y: 72 },
      { x: 50, y: 77 },
      { x: 82, y: 72 },
      { x: 28, y: 48 },
      { x: 72, y: 48 },
      { x: 50, y: 21 },
    ],
    8: [
      { x: 50, y: 91 },
      { x: 13, y: 72 },
      { x: 38, y: 77 },
      { x: 62, y: 77 },
      { x: 87, y: 72 },
      { x: 28, y: 48 },
      { x: 72, y: 48 },
      { x: 50, y: 21 },
    ],
    9: [
      { x: 50, y: 91 },
      { x: 13, y: 72 },
      { x: 38, y: 77 },
      { x: 62, y: 77 },
      { x: 87, y: 72 },
      { x: 20, y: 47 },
      { x: 50, y: 51 },
      { x: 80, y: 47 },
      { x: 50, y: 21 },
    ],
    10: [
      { x: 50, y: 91 },
      { x: 13, y: 72 },
      { x: 38, y: 77 },
      { x: 62, y: 77 },
      { x: 87, y: 72 },
      { x: 20, y: 48 },
      { x: 50, y: 52 },
      { x: 80, y: 48 },
      { x: 30, y: 21 },
      { x: 70, y: 21 },
    ],
    11: [
      { x: 50, y: 91 },
      { x: 10, y: 71 },
      { x: 30, y: 77 },
      { x: 50, y: 80 },
      { x: 70, y: 77 },
      { x: 90, y: 71 },
      { x: 20, y: 48 },
      { x: 50, y: 52 },
      { x: 80, y: 48 },
      { x: 30, y: 21 },
      { x: 70, y: 21 },
    ],
  },
};


function makeDrawingId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `drawing-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function distanceBetweenPoints(
  first: PlayerPosition,
  second: PlayerPosition,
) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function distanceToSegment(
  point: PlayerPosition,
  start: PlayerPosition,
  end: PlayerPosition,
) {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (segmentLengthSquared === 0) {
    return distanceBetweenPoints(point, start);
  }

  const projection = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * segmentX +
        (point.y - start.y) * segmentY) /
        segmentLengthSquared,
    ),
  );

  return distanceBetweenPoints(point, {
    x: start.x + projection * segmentX,
    y: start.y + projection * segmentY,
  });
}

function drawingDistance(
  point: PlayerPosition,
  drawing: DrawingItem,
) {
  if (drawing.kind === "arrow") {
    return distanceToSegment(point, drawing.start, drawing.end);
  }

  if (drawing.points.length < 2) {
    return drawing.points.length === 1
      ? distanceBetweenPoints(point, drawing.points[0])
      : Number.POSITIVE_INFINITY;
  }

  let minimumDistance = Number.POSITIVE_INFINITY;

  for (let index = 1; index < drawing.points.length; index += 1) {
    minimumDistance = Math.min(
      minimumDistance,
      distanceToSegment(
        point,
        drawing.points[index - 1],
        drawing.points[index],
      ),
    );
  }

  return minimumDistance;
}

function clonePositions(positions: PlayerPosition[]) {
  return positions.map((position) => ({ ...position }));
}

function getFormationPositions(
  tactic: TacticKey,
  playerCount: number,
) {
  return clonePositions(
    FORMATION_POSITIONS[tactic][playerCount] ??
      FORMATION_POSITIONS.balanced[DEFAULT_PLAYER_COUNT],
  );
}

function safeFileName(value: string) {
  return (
    value
      .trim()
      .toLocaleLowerCase("tr-TR")
      .replace(/ı/g, "i")
      .replace(/ç/g, "c")
      .replace(/ğ/g, "g")
      .replace(/ö/g, "o")
      .replace(/ş/g, "s")
      .replace(/ü/g, "u")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "halisaha-kadrosu"
  );
}

function encodeSharePayload(payload: SharePayload) {
  return window.btoa(
    encodeURIComponent(JSON.stringify(payload)),
  );
}

function decodeSharePayload(value: string): SharePayload | null {
  try {
    return JSON.parse(
      decodeURIComponent(window.atob(value)),
    ) as SharePayload;
  } catch {
    return null;
  }
}

export default function HalisahaKadroPage() {
  const pitchRef = useRef<HTMLDivElement | null>(null);

  const [squadName, setSquadName] = useState("Cumartesi Maçı");
  const [playerCount, setPlayerCount] = useState(DEFAULT_PLAYER_COUNT);
  const [players, setPlayers] = useState(INITIAL_PLAYERS);
  const [bodyColor, setBodyColor] = useState("#c8101e");
  const [sleeveColor, setSleeveColor] = useState("#ffffff");
  const [tactic, setTactic] = useState<TacticKey>("balanced");
  const [positions, setPositions] = useState<PlayerPosition[]>(
    getFormationPositions("balanced", DEFAULT_PLAYER_COUNT),
  );
  const [copyMessage, setCopyMessage] = useState("");
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [drawingMode, setDrawingMode] =
    useState<DrawingMode>("move");
  const [drawings, setDrawings] =
    useState<DrawingItem[]>([]);
  const [drawingColor, setDrawingColor] =
    useState("#ffffff");
  const [drawingWidth, setDrawingWidth] =
    useState(4);

  const visiblePlayers = useMemo(
    () => players.slice(0, playerCount),
    [playerCount, players],
  );

  const sharePayload = useMemo<SharePayload>(
    () => ({
      squadName,
      playerCount,
      players: visiblePlayers,
      bodyColor,
      sleeveColor,
      tactic,
      positions,
      drawings,
    }),
    [
      bodyColor,
      drawings,
      playerCount,
      positions,
      sleeveColor,
      squadName,
      tactic,
      visiblePlayers,
    ],
  );

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";

    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("kadro", encodeSharePayload(sharePayload));
    return url.toString();
  }, [sharePayload]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encodedPayload = params.get("kadro");

    if (!encodedPayload) return;

    const payload = decodeSharePayload(encodedPayload);
    if (!payload) return;

    const safeCount = Math.min(
      MAX_PLAYER_COUNT,
      Math.max(MIN_PLAYER_COUNT, Number(payload.playerCount) || 7),
    );

    const loadedPlayers = [...INITIAL_PLAYERS];
    payload.players.slice(0, safeCount).forEach((player, index) => {
      loadedPlayers[index] = player;
    });

    setSquadName(payload.squadName || "Paylaşılan Kadro");
    setPlayerCount(safeCount);
    setPlayers(loadedPlayers);
    setBodyColor(payload.bodyColor || "#c8101e");
    setSleeveColor(payload.sleeveColor || "#ffffff");
    setTactic(payload.tactic || "balanced");
    setPositions(
      payload.positions?.length === safeCount
        ? clonePositions(payload.positions)
        : getFormationPositions(payload.tactic || "balanced", safeCount),
    );
    setDrawings(Array.isArray(payload.drawings) ? payload.drawings : []);
  }, []);

  function updatePlayerName(index: number, value: string) {
    setPlayers((currentPlayers) => {
      const nextPlayers = [...currentPlayers];
      nextPlayers[index] = value;
      return nextPlayers;
    });
  }

  function clearPlayer(index: number) {
    updatePlayerName(index, "");
  }

  function applyFormation(
    nextTactic: TacticKey,
    nextPlayerCount = playerCount,
  ) {
    setTactic(nextTactic);
    setPositions(getFormationPositions(nextTactic, nextPlayerCount));
  }

  function changePlayerCount(nextPlayerCount: number) {
    setPlayerCount(nextPlayerCount);
    setPositions(getFormationPositions(tactic, nextPlayerCount));
  }

  function resetSquad() {
    setSquadName("Cumartesi Maçı");
    setPlayerCount(DEFAULT_PLAYER_COUNT);
    setPlayers([...INITIAL_PLAYERS]);
    setBodyColor("#c8101e");
    setSleeveColor("#ffffff");
    setTactic("balanced");
    setPositions(
      getFormationPositions("balanced", DEFAULT_PLAYER_COUNT),
    );
    setCopyMessage("");
    setDrawingMode("move");
    setDrawings([]);
    setDrawingColor("#ffffff");
    setDrawingWidth(4);
    window.history.replaceState({}, "", window.location.pathname);
  }

  function updatePlayerPosition(index: number, position: PlayerPosition) {
    setPositions((currentPositions) => {
      const nextPositions = [...currentPositions];
      nextPositions[index] = position;
      return nextPositions;
    });
  }

  function addDrawing(drawing: DrawingItem) {
    setDrawings((currentDrawings) => [
      ...currentDrawings,
      drawing,
    ]);
  }

  function removeDrawing(drawingId: string) {
    setDrawings((currentDrawings) =>
      currentDrawings.filter(
        (drawing) => drawing.id !== drawingId,
      ),
    );
  }

  function undoLastDrawing() {
    setDrawings((currentDrawings) =>
      currentDrawings.slice(0, -1),
    );
  }

  function clearDrawings() {
    setDrawings([]);
  }

  async function createPitchPng() {
    if (!pitchRef.current) {
      throw new Error("Saha görseli bulunamadı.");
    }

    return toPng(pitchRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#37a823",
    });
  }

  async function downloadImage() {
    try {
      setDownloadLoading(true);
      const dataUrl = await createPitchPng();
      const anchor = document.createElement("a");
      anchor.download = `${safeFileName(squadName)}.png`;
      anchor.href = dataUrl;
      anchor.click();
    } catch (error) {
      console.error("Kadro görseli indirilemedi:", error);
      window.alert("Görsel oluşturulurken bir hata oluştu.");
    } finally {
      setDownloadLoading(false);
    }
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyMessage("Link kopyalandı!");
      window.setTimeout(() => setCopyMessage(""), 2000);
    } catch {
      setCopyMessage("Link kopyalanamadı.");
    }
  }

  async function shareSquad() {
    try {
      setShareLoading(true);
      const dataUrl = await createPitchPng();
      const blob = await fetch(dataUrl).then((response) => response.blob());
      const file = new File(
        [blob],
        `${safeFileName(squadName)}.png`,
        { type: "image/png" },
      );

      const shareData: ShareData = {
        title: `${squadName || "Halısaha Kadrosu"} | FootBattle`,
        text: "Halısaha kadromu FootBattle ile oluşturdum!",
        url: shareUrl,
      };

      if (
        navigator.share &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({ ...shareData, files: [file] });
        return;
      }

      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await copyShareLink();
      window.alert(
        "Tarayıcın doğrudan paylaşımı desteklemiyor. Link panoya kopyalandı.",
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      console.error("Kadro paylaşılamadı:", error);
      window.alert("Paylaşım hazırlanırken bir hata oluştu.");
    } finally {
      setShareLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-[1500px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-5 border-b border-white/10 pb-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <Link
              href="/"
              className="mb-4 inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:border-yellow-400/40 hover:text-yellow-300"
            >
              ← Ana Sayfa
            </Link>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              HALISAHA <span className="text-yellow-400">KADRO KURMA</span>
            </h1>

            <p className="mt-2 text-sm text-slate-400 sm:text-base">
              Kendi halı saha kadronu oluştur, dizilimini paylaş! ⚽
            </p>
          </div>

          <div className="text-center">
            <p className="text-3xl font-black italic">
              Foot<span className="text-yellow-400">Battle</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              arkadaşına fifada değil burada koy :)
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                window.alert(
                  "Oyuncu adlarını yaz, taktiği seç ve formaları sahada sürükle. Sonra görseli indir veya paylaş.",
                )
              }
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold transition hover:bg-white/5"
            >
              <HelpCircle size={18} /> Nasıl Kullanılır?
            </button>

            <button
              type="button"
              onClick={resetSquad}
              className="inline-flex items-center gap-2 rounded-xl border border-yellow-400/50 bg-yellow-400/10 px-5 py-3 text-sm font-black text-yellow-300 transition hover:bg-yellow-400/20"
            >
              <RotateCcw size={18} /> Yeni Kadro
            </button>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="h-fit overflow-hidden rounded-3xl border border-white/10 bg-[#0d1828] shadow-2xl shadow-black/20 xl:sticky xl:top-4">
            <section className="border-b border-white/10 p-5 sm:p-6">
              <h2 className="font-black uppercase tracking-wide text-yellow-300">
                👥 Kadro Bilgileri
              </h2>

              <label className="mt-5 block text-sm text-slate-400">
                Kadro Adı
              </label>
              <input
                value={squadName}
                onChange={(event) => setSquadName(event.target.value)}
                placeholder="Kadro adı"
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 outline-none transition placeholder:text-slate-600 focus:border-yellow-400/50"
              />
            </section>

            <section className="border-b border-white/10 p-5 sm:p-6">
              <h3 className="font-black uppercase tracking-wide">
                Oyuncu Sayısı
              </h3>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {Array.from(
                  { length: MAX_PLAYER_COUNT - MIN_PLAYER_COUNT + 1 },
                  (_, index) => MIN_PLAYER_COUNT + index,
                ).map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => changePlayerCount(count)}
                    className={`rounded-xl border py-3 font-black transition ${
                      playerCount === count
                        ? "border-yellow-400 bg-yellow-400/15 text-yellow-300"
                        : "border-white/10 text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </section>

            <section className="border-b border-white/10 p-5 sm:p-6">
              <h3 className="font-black uppercase tracking-wide">Taktik</h3>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {(Object.keys(TACTIC_LABELS) as TacticKey[]).map(
                  (tacticKey) => (
                    <button
                      key={tacticKey}
                      type="button"
                      onClick={() => applyFormation(tacticKey)}
                      className={`rounded-xl border px-2 py-3 text-sm font-black transition ${
                        tactic === tacticKey
                          ? "border-yellow-400 bg-yellow-400/15 text-yellow-300"
                          : "border-white/10 text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      {TACTIC_LABELS[tacticKey]}
                    </button>
                  ),
                )}
              </div>
              <button
                type="button"
                onClick={() => applyFormation(tactic)}
                className="mt-3 w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/5"
              >
                Dizilişi Yenile
              </button>
            </section>

            <section className="border-b border-white/10 p-5 sm:p-6">
              <h3 className="font-black uppercase tracking-wide">
                Çizim Araçları
              </h3>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {(
                  [
                    ["move", "Taşı", MousePointer2],
                    ["arrow", "Ok", ArrowUpRight],
                    ["pen", "Kalem", Pencil],
                    ["eraser", "Silgi", Eraser],
                  ] as const
                ).map(([mode, label, Icon]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDrawingMode(mode)}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-black transition ${
                      drawingMode === mode
                        ? "border-yellow-400 bg-yellow-400/15 text-yellow-300"
                        : "border-white/10 text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <Icon size={17} />
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
                <label>
                  <span className="mb-2 block text-xs font-bold uppercase text-slate-500">
                    Çizgi rengi
                  </span>
                  <input
                    type="color"
                    value={drawingColor}
                    onChange={(event) =>
                      setDrawingColor(event.target.value)
                    }
                    className="h-11 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1"
                  />
                </label>

                <label>
                  <span className="mb-2 flex items-center justify-between text-xs font-bold uppercase text-slate-500">
                    <span>Kalınlık</span>
                    <span>{drawingWidth}px</span>
                  </span>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    step="1"
                    value={drawingWidth}
                    onChange={(event) =>
                      setDrawingWidth(Number(event.target.value))
                    }
                    className="w-full accent-yellow-400"
                  />
                </label>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={undoLastDrawing}
                  disabled={drawings.length === 0}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Undo2 size={17} />
                  Geri Al
                </button>

                <button
                  type="button"
                  onClick={clearDrawings}
                  disabled={drawings.length === 0}
                  className="flex items-center justify-center gap-2 rounded-xl border border-red-400/20 px-3 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={17} />
                  Temizle
                </button>
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                Taşı modunda oyuncuları sürükle. Ok veya kalem
                modunda sahaya basılı tutup çiz. Silgi modunda
                kaldırmak istediğin çizginin üzerine dokun.
              </p>
            </section>

            <section className="border-b border-white/10 p-5 sm:p-6">
              <h3 className="font-black uppercase tracking-wide">
                Oyuncu Listesi ({playerCount})
              </h3>
              <div className="mt-4 space-y-2">
                {visiblePlayers.map((player, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex h-11 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#07111f] text-sm font-black text-slate-400">
                      {index + 1}
                    </div>
                    <input
                      value={player}
                      onChange={(event) =>
                        updatePlayerName(index, event.target.value)
                      }
                      placeholder={`Oyuncu ${index + 1}`}
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 outline-none transition placeholder:text-slate-600 focus:border-yellow-400/50"
                    />
                    <button
                      type="button"
                      aria-label={`${index + 1}. oyuncuyu temizle`}
                      onClick={() => clearPlayer(index)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#07111f] transition hover:bg-slate-200"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="p-5 sm:p-6">
              <h3 className="font-black uppercase tracking-wide">
                Forma Renkleri
              </h3>
              <div className="mt-5 grid grid-cols-2 gap-5">
                <ColorPicker
                  label="Gövde Rengi"
                  value={bodyColor}
                  onChange={setBodyColor}
                />
                <ColorPicker
                  label="Kol Rengi"
                  value={sleeveColor}
                  onChange={setSleeveColor}
                />
              </div>

              <button
                type="button"
                onClick={() => void downloadImage()}
                disabled={downloadLoading}
                className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl bg-yellow-400 px-5 py-4 font-black text-[#07111f] transition hover:bg-yellow-300 disabled:cursor-wait disabled:opacity-60"
              >
                <Download size={20} />
                {downloadLoading ? "Hazırlanıyor..." : "Görseli İndir (PNG)"}
              </button>

              <button
                type="button"
                onClick={() => void shareSquad()}
                disabled={shareLoading}
                className="mt-3 flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 px-5 py-4 font-black transition hover:bg-white/5 disabled:cursor-wait disabled:opacity-60"
              >
                <Share2 size={20} />
                {shareLoading ? "Hazırlanıyor..." : "Paylaş"}
              </button>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-400">
                💡 Oyuncuları sahada fareyle veya parmağınla sürükleyebilirsin.
              </div>
            </section>
          </aside>

          <section className="min-w-0 space-y-6">
            <div className="rounded-3xl border border-white/10 bg-[#0d1828] p-2 shadow-2xl shadow-black/30 sm:p-5">
              <FootballPitch
                ref={pitchRef}
                players={visiblePlayers}
                positions={positions}
                bodyColor={bodyColor}
                sleeveColor={sleeveColor}
                squadName={squadName}
                drawingMode={drawingMode}
                drawings={drawings}
                drawingColor={drawingColor}
                drawingWidth={drawingWidth}
                onPositionChange={updatePlayerPosition}
                onAddDrawing={addDrawing}
                onRemoveDrawing={removeDrawing}
              />
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0d1828] p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <Share2 size={22} className="mt-1 shrink-0 text-yellow-300" />
                <div>
                  <h2 className="text-xl font-black uppercase tracking-wide">
                    Kadronu Paylaş
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Kadro görselini ve açılabilir bağlantıyı arkadaşlarına gönder.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <MiniPitchPreview
                  players={visiblePlayers}
                  positions={positions}
                  bodyColor={bodyColor}
                  sleeveColor={sleeveColor}
                  drawings={drawings}
                />

                <div className="flex flex-col justify-center">
                  <button
                    type="button"
                    onClick={() => void downloadImage()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-4 font-black text-[#07111f] transition hover:bg-yellow-300"
                  >
                    <Download size={19} /> Görseli İndir
                  </button>

                  <div className="my-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-xs font-black uppercase text-slate-500">
                      veya
                    </span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/10 bg-[#07111f] px-4 py-3">
                      <Link2 size={17} className="shrink-0 text-slate-500" />
                      <input
                        readOnly
                        value={shareUrl}
                        className="min-w-0 flex-1 bg-transparent text-sm text-slate-300 outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void copyShareLink()}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-yellow-400/50 bg-yellow-400/10 px-5 py-3 font-black text-yellow-300 transition hover:bg-yellow-400/20"
                    >
                      <Copy size={17} /> Kopyala
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => void shareSquad()}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-4 font-black transition hover:bg-white/5"
                  >
                    <Share2 size={19} /> Telefon / Uygulama ile Paylaş
                  </button>

                  {copyMessage && (
                    <p className="mt-3 text-sm font-semibold text-green-400">
                      {copyMessage}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm text-slate-400">{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-14 w-16 cursor-pointer rounded-xl border border-white/10 bg-transparent p-1"
        />
        <span className="text-xs font-semibold uppercase text-slate-500">
          {value}
        </span>
      </div>
    </label>
  );
}

const FootballPitch = forwardRef<
  HTMLDivElement,
  {
    players: string[];
    positions: PlayerPosition[];
    bodyColor: string;
    sleeveColor: string;
    squadName: string;
    drawingMode: DrawingMode;
    drawings: DrawingItem[];
    drawingColor: string;
    drawingWidth: number;
    onPositionChange: (
      index: number,
      position: PlayerPosition,
    ) => void;
    onAddDrawing: (drawing: DrawingItem) => void;
    onRemoveDrawing: (drawingId: string) => void;
  }
>(function FootballPitchComponent(
  {
    players,
    positions,
    bodyColor,
    sleeveColor,
    squadName,
    drawingMode,
    drawings,
    drawingColor,
    drawingWidth,
    onPositionChange,
    onAddDrawing,
    onRemoveDrawing,
  },
  ref,
) {
  const pitchContainerRef =
    useRef<HTMLDivElement | null>(null);
  const [activeDrawing, setActiveDrawing] =
    useState<DrawingItem | null>(null);

  function setCombinedRef(node: HTMLDivElement | null) {
    pitchContainerRef.current = node;

    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  }

  function pointerPosition(
    event: ReactPointerEvent<HTMLDivElement>,
  ): PlayerPosition | null {
    if (!pitchContainerRef.current) return null;

    const bounds =
      pitchContainerRef.current.getBoundingClientRect();

    return {
      x: Math.min(
        98,
        Math.max(
          2,
          ((event.clientX - bounds.left) / bounds.width) *
            100,
        ),
      ),
      y: Math.min(
        98,
        Math.max(
          2,
          ((event.clientY - bounds.top) / bounds.height) *
            100,
        ),
      ),
    };
  }

  function handlePlayerPointerMove(
    event: ReactPointerEvent<HTMLDivElement>,
    index: number,
  ) {
    const position = pointerPosition(event);
    if (!position) return;

    onPositionChange(index, {
      x: Math.min(93, Math.max(7, position.x)),
      y: Math.min(93, Math.max(7, position.y)),
    });
  }

  function handlePitchPointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (drawingMode === "move") return;

    const position = pointerPosition(event);
    if (!position) return;

    event.currentTarget.setPointerCapture(event.pointerId);

    if (drawingMode === "eraser") {
      const closestDrawing = drawings
        .map((drawing) => ({
          drawing,
          distance: drawingDistance(position, drawing),
        }))
        .sort(
          (first, second) =>
            first.distance - second.distance,
        )[0];

      if (
        closestDrawing &&
        closestDrawing.distance <= 5
      ) {
        onRemoveDrawing(closestDrawing.drawing.id);
      }

      return;
    }

    if (drawingMode === "arrow") {
      setActiveDrawing({
        id: makeDrawingId(),
        kind: "arrow",
        start: position,
        end: position,
        color: drawingColor,
        width: drawingWidth,
      });
      return;
    }

    setActiveDrawing({
      id: makeDrawingId(),
      kind: "pen",
      points: [position],
      color: drawingColor,
      width: drawingWidth,
    });
  }

  function handlePitchPointerMove(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (
      !activeDrawing ||
      !event.currentTarget.hasPointerCapture(
        event.pointerId,
      )
    ) {
      return;
    }

    const position = pointerPosition(event);
    if (!position) return;

    if (activeDrawing.kind === "arrow") {
      setActiveDrawing({
        ...activeDrawing,
        end: position,
      });
      return;
    }

    const lastPoint =
      activeDrawing.points[
        activeDrawing.points.length - 1
      ];

    if (
      lastPoint &&
      distanceBetweenPoints(lastPoint, position) < 0.7
    ) {
      return;
    }

    setActiveDrawing({
      ...activeDrawing,
      points: [...activeDrawing.points, position],
    });
  }

  function finishDrawing(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId,
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      );
    }

    if (!activeDrawing) return;

    const isValid =
      activeDrawing.kind === "arrow"
        ? distanceBetweenPoints(
            activeDrawing.start,
            activeDrawing.end,
          ) >= 2
        : activeDrawing.points.length >= 2;

    if (isValid) {
      onAddDrawing(activeDrawing);
    }

    setActiveDrawing(null);
  }

  const visibleDrawings = activeDrawing
    ? [...drawings, activeDrawing]
    : drawings;

  return (
    <div
      ref={setCombinedRef}
      className={`relative mx-auto aspect-[3/4] w-full max-w-[820px] touch-none select-none overflow-hidden rounded-2xl border-4 border-green-950 bg-[#37a823] shadow-2xl shadow-black/40 ${
        drawingMode === "move"
          ? ""
          : drawingMode === "eraser"
            ? "cursor-crosshair"
            : "cursor-crosshair"
      }`}
      onPointerDown={handlePitchPointerDown}
      onPointerMove={handlePitchPointerMove}
      onPointerUp={finishDrawing}
      onPointerCancel={finishDrawing}
    >
      <PitchLines />

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 w-[72%] -translate-x-1/2 -translate-y-1/2 text-center text-white/20">
        <p className="text-4xl font-black italic sm:text-6xl lg:text-7xl">
          FootBattle
        </p>
        <p className="mt-2 text-xs font-black sm:text-lg">
          {squadName ||
            "arkadaşına fifada değil burada koy :)"}
        </p>
      </div>

      <DrawingSvg
        drawings={visibleDrawings}
        markerId="pitch-arrow-head"
        className="pointer-events-none absolute inset-0 z-[15] h-full w-full"
      />

      {players.map((player, index) => {
        const position =
          positions[index] ??
          getFormationPositions("balanced", 7)[index];

        return (
          <div
            key={index}
            className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 text-center ${
              drawingMode === "move"
                ? "cursor-grab active:cursor-grabbing"
                : "pointer-events-none"
            }`}
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
            }}
            onPointerDown={(event) => {
              if (drawingMode !== "move") return;

              event.stopPropagation();
              event.currentTarget.setPointerCapture(
                event.pointerId,
              );
              handlePlayerPointerMove(event, index);
            }}
            onPointerMove={(event) => {
              if (
                drawingMode === "move" &&
                event.currentTarget.hasPointerCapture(
                  event.pointerId,
                )
              ) {
                handlePlayerPointerMove(event, index);
              }
            }}
            onPointerUp={(event) => {
              if (
                event.currentTarget.hasPointerCapture(
                  event.pointerId,
                )
              ) {
                event.currentTarget.releasePointerCapture(
                  event.pointerId,
                );
              }
            }}
            onPointerCancel={(event) => {
              if (
                event.currentTarget.hasPointerCapture(
                  event.pointerId,
                )
              ) {
                event.currentTarget.releasePointerCapture(
                  event.pointerId,
                );
              }
            }}
          >
            <Jersey
              number={index + 1}
              bodyColor={bodyColor}
              sleeveColor={sleeveColor}
            />
            <div className="mx-auto mt-1 max-w-24 truncate rounded-md border border-white/10 bg-[#07111f]/90 px-2 py-1 text-[10px] font-black shadow-lg sm:max-w-32 sm:text-sm">
              {player.trim() ||
                `Oyuncu ${index + 1}`}
            </div>
          </div>
        );
      })}
    </div>
  );
});

function DrawingSvg({
  drawings,
  markerId,
  className = "",
}: {
  drawings: DrawingItem[];
  markerId: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <marker
          id={markerId}
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

      {drawings.map((drawing) => {
        if (drawing.kind === "arrow") {
          return (
            <line
              key={drawing.id}
              x1={drawing.start.x}
              y1={drawing.start.y}
              x2={drawing.end.x}
              y2={drawing.end.y}
              stroke={drawing.color}
              strokeWidth={drawing.width}
              strokeLinecap="round"
              markerEnd={`url(#${markerId})`}
              vectorEffect="non-scaling-stroke"
            />
          );
        }

        const points = drawing.points
          .map((point) => `${point.x},${point.y}`)
          .join(" ");

        return (
          <polyline
            key={drawing.id}
            points={points}
            fill="none"
            stroke={drawing.color}
            strokeWidth={drawing.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
}

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
        style={{ backgroundColor: sleeveColor }}
      />
      <div
        className="absolute right-0 top-2 h-6 w-6 rotate-[18deg] rounded-r-md border border-black/30"
        style={{ backgroundColor: sleeveColor }}
      />
      <div
        className="absolute left-1/2 top-1 h-12 w-10 -translate-x-1/2 rounded-b-md border border-black/40 sm:h-14 sm:w-12"
        style={{ backgroundColor: bodyColor }}
      >
        <div className="absolute left-1/2 top-0 h-3 w-5 -translate-x-1/2 -translate-y-1/3 rounded-b-full border-b-2 border-white/80 bg-[#07111f]" />
        <span className="flex h-full items-center justify-center text-lg font-black text-white drop-shadow sm:text-xl">
          {number}
        </span>
      </div>
    </div>
  );
}

function MiniPitchPreview({
  players,
  positions,
  bodyColor,
  sleeveColor,
  drawings,
}: {
  players: string[];
  positions: PlayerPosition[];
  bodyColor: string;
  sleeveColor: string;
  drawings: DrawingItem[];
}) {
  return (
    <div className="mx-auto w-full max-w-[220px] overflow-hidden rounded-2xl border border-white/10 bg-[#07111f] p-2">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl border-2 border-green-950 bg-[#37a823]">
        <div className="absolute inset-[4%] border border-white/70" />
        <div className="absolute left-[4%] right-[4%] top-1/2 h-px bg-white/70" />
        <div className="absolute left-1/2 top-1/2 aspect-square w-[32%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-white/25">
          <p className="text-xs font-black">FootBattle</p>
        </div>

        <DrawingSvg
          drawings={drawings}
          markerId="preview-arrow-head"
          className="pointer-events-none absolute inset-0 z-10 h-full w-full"
        />

        {players.map((player, index) => {
          const position = positions[index] ?? { x: 50, y: 50 };
          return (
            <div
              key={index}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
              title={player}
            >
              <div
                className="h-3 w-3 rounded-sm border border-black/30"
                style={{
                  background: `linear-gradient(90deg, ${sleeveColor} 0 20%, ${bodyColor} 20% 80%, ${sleeveColor} 80% 100%)`,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}