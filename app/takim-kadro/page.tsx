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
  Search,
  Share2,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { toPng } from "html-to-image";
import {
  PointerEvent as ReactPointerEvent,
  RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Team = {
  id: number;
  name: string;
  logoUrl: string | null;
  country: string | null;
  competitionId: string | null;
};

type Player = {
  id: number;
  squadId?: number;
  fullName: string;
  squadNumber?: number | null;
  nationality: string | null;
  age: number | null;
  position: string | null;
  subPosition: string | null;
  club: string | null;
  competitionId: string | null;
  preferredFoot: string | null;
  imageUrl: string | null;
  popularityScore: number | null;
  isCurrentTeamPlayer?: boolean;
  isPotentialTransfer?: boolean;
};

type Position = { x: number; y: number };

type LineupPlayer = {
  slot: number;
  player: Player;
  position: Position;
  isPotentialTransfer: boolean;
};

type FormationCode =
  | "4-2-3-1"
  | "4-3-3"
  | "4-4-2"
  | "3-5-2"
  | "free";

type DrawingMode = "move" | "arrow" | "pen" | "eraser";

type PlayerInfoMode = "club" | "country" | "age";

type ArrowDrawing = {
  id: string;
  kind: "arrow";
  start: Position;
  end: Position;
  color: string;
  width: number;
};

type PenDrawing = {
  id: string;
  kind: "pen";
  points: Position[];
  color: string;
  width: number;
};

type DrawingItem = ArrowDrawing | PenDrawing;

type TeamSearchResponse = {
  ok?: boolean;
  error?: string;
  teams?: Team[];
};

type SquadResponse = {
  ok?: boolean;
  error?: string;
  team?: Team;
  players?: Player[];
  defaultLineup?: {
    formationCode?: string;
    slots?: Array<{
      slot: number;
      playerId: number;
      x: number;
      y: number;
    }>;
  };
};

type PlayerSearchResponse = {
  ok?: boolean;
  error?: string;
  players?: Player[];
};

const FORMATIONS: Record<
  Exclude<FormationCode, "free">,
  Position[]
> = {
  "4-2-3-1": [
    { x: 50, y: 91 },
    { x: 14, y: 73 },
    { x: 38, y: 77 },
    { x: 62, y: 77 },
    { x: 86, y: 73 },
    { x: 38, y: 54 },
    { x: 62, y: 54 },
    { x: 18, y: 31 },
    { x: 50, y: 36 },
    { x: 82, y: 31 },
    { x: 50, y: 15 },
  ],
  "4-3-3": [
    { x: 50, y: 91 },
    { x: 14, y: 73 },
    { x: 38, y: 77 },
    { x: 62, y: 77 },
    { x: 86, y: 73 },
    { x: 24, y: 50 },
    { x: 50, y: 54 },
    { x: 76, y: 50 },
    { x: 18, y: 21 },
    { x: 50, y: 15 },
    { x: 82, y: 21 },
  ],
  "4-4-2": [
    { x: 50, y: 91 },
    { x: 14, y: 73 },
    { x: 38, y: 77 },
    { x: 62, y: 77 },
    { x: 86, y: 73 },
    { x: 14, y: 47 },
    { x: 38, y: 52 },
    { x: 62, y: 52 },
    { x: 86, y: 47 },
    { x: 36, y: 18 },
    { x: 64, y: 18 },
  ],
  "3-5-2": [
    { x: 50, y: 91 },
    { x: 24, y: 76 },
    { x: 50, y: 80 },
    { x: 76, y: 76 },
    { x: 12, y: 50 },
    { x: 34, y: 56 },
    { x: 50, y: 48 },
    { x: 66, y: 56 },
    { x: 88, y: 50 },
    { x: 36, y: 18 },
    { x: 64, y: 18 },
  ],
};

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
      .replace(/^-+|-+$/g, "") || "takim-kadrosu"
  );
}

function normalizeFormation(value?: string): FormationCode {
  return value === "4-3-3" ||
    value === "4-4-2" ||
    value === "3-5-2"
    ? value
    : "4-2-3-1";
}

function shortName(value: string) {
  const pieces = value.trim().split(/\s+/);
  return pieces.at(-1) || value;
}

function pointDistance(a: Position, b: Position) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distanceToSegment(
  point: Position,
  start: Position,
  end: Position,
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return pointDistance(point, start);
  }

  const projection = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx +
        (point.y - start.y) * dy) /
        lengthSquared,
    ),
  );

  return pointDistance(point, {
    x: start.x + projection * dx,
    y: start.y + projection * dy,
  });
}

function drawingDistance(point: Position, drawing: DrawingItem) {
  if (drawing.kind === "arrow") {
    return distanceToSegment(point, drawing.start, drawing.end);
  }

  let closest = Number.POSITIVE_INFINITY;

  for (let index = 1; index < drawing.points.length; index += 1) {
    closest = Math.min(
      closest,
      distanceToSegment(
        point,
        drawing.points[index - 1],
        drawing.points[index],
      ),
    );
  }

  return closest;
}

export default function TeamLineupBuilderPage() {
  const pitchRef = useRef<HTMLDivElement | null>(null);

  const [teamQuery, setTeamQuery] = useState("");
  const [teamResults, setTeamResults] = useState<Team[]>([]);
  const [teamSearchLoading, setTeamSearchLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [squadPlayers, setSquadPlayers] = useState<Player[]>([]);
  const [lineup, setLineup] = useState<LineupPlayer[]>([]);
  const [formation, setFormation] =
    useState<FormationCode>("4-2-3-1");
  const [playerInfoMode, setPlayerInfoMode] =
    useState<PlayerInfoMode>("club");
  const [message, setMessage] = useState(
    "Bir takım seçerek kadroyu otomatik yükle.",
  );

  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [playerQuery, setPlayerQuery] = useState("");
  const [playerResults, setPlayerResults] = useState<Player[]>([]);
  const [playerSearchLoading, setPlayerSearchLoading] = useState(false);
  const [showOnlySquad, setShowOnlySquad] = useState(true);
  const [positionFilter, setPositionFilter] = useState("");
  const [ageFilter, setAgeFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [clubFilter, setClubFilter] = useState("");

  const [drawingMode, setDrawingMode] =
    useState<DrawingMode>("move");
  const [drawings, setDrawings] = useState<DrawingItem[]>([]);
  const [drawingColor, setDrawingColor] = useState("#ffffff");
  const [drawingWidth, setDrawingWidth] = useState(4);

  const [downloadLoading, setDownloadLoading] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    const query = teamQuery.trim();

    if (query.length < 2 || selectedTeam) {
      setTeamResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setTeamSearchLoading(true);
        const response = await fetch(
          `/api/lineup-builder/search-team?q=${encodeURIComponent(query)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const result = (await response.json()) as TeamSearchResponse;

        if (!response.ok || !result.ok) {
          throw new Error(result.error ?? "Takımlar aranamadı.");
        }

        setTeamResults(result.teams ?? []);
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(error);
        setTeamResults([]);
      } finally {
        setTeamSearchLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [selectedTeam, teamQuery]);

  useEffect(() => {
    if (editingSlot === null) {
      return;
    }

    if (showOnlySquad) {
      setPlayerResults(squadPlayers);
      return;
    }

    const query = playerQuery.trim();

    if (query.length < 3) {
      setPlayerResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setPlayerSearchLoading(true);
        const teamId = selectedTeam
          ? `&teamId=${selectedTeam.id}`
          : "";

        const response = await fetch(
          `/api/lineup-builder/search-player?q=${encodeURIComponent(
            query,
          )}${teamId}`,
          { cache: "no-store", signal: controller.signal },
        );
        const result = (await response.json()) as PlayerSearchResponse;

        if (!response.ok || !result.ok) {
          throw new Error(result.error ?? "Oyuncular aranamadı.");
        }

        setPlayerResults(result.players ?? []);
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(error);
        setPlayerResults([]);
      } finally {
        setPlayerSearchLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    editingSlot,
    playerQuery,
    selectedTeam,
    showOnlySquad,
    squadPlayers,
  ]);

  const filteredPlayers = useMemo(
    () =>
      playerResults.filter((player) => {
        if (
          positionFilter &&
          player.position !== positionFilter
        ) {
          return false;
        }

        if (
          countryFilter &&
          !(player.nationality ?? "")
            .toLocaleLowerCase("tr-TR")
            .includes(countryFilter.toLocaleLowerCase("tr-TR"))
        ) {
          return false;
        }

        if (
          clubFilter &&
          !(player.club ?? "")
            .toLocaleLowerCase("tr-TR")
            .includes(clubFilter.toLocaleLowerCase("tr-TR"))
        ) {
          return false;
        }

        if (ageFilter && player.age !== null) {
          if (
            ageFilter === "18-23" &&
            (player.age < 18 || player.age > 23)
          ) {
            return false;
          }

          if (
            ageFilter === "24-29" &&
            (player.age < 24 || player.age > 29)
          ) {
            return false;
          }

          if (ageFilter === "30+" && player.age < 30) {
            return false;
          }
        }

        return true;
      }),
    [
      ageFilter,
      clubFilter,
      countryFilter,
      playerResults,
      positionFilter,
    ],
  );

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }

    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set(
      "kadro",
      window.btoa(
        encodeURIComponent(
          JSON.stringify({
            selectedTeam,
            formation,
            playerInfoMode,
            lineup,
            drawings,
          }),
        ),
      ),
    );

    return url.toString();
  }, [drawings, formation, lineup, playerInfoMode, selectedTeam]);

  function automaticLineup(
    players: Player[],
    code: FormationCode,
  ) {
    const positions =
      code === "free"
        ? FORMATIONS["4-2-3-1"]
        : FORMATIONS[code];

    const sorted = [...players].sort(
      (a, b) =>
        (b.popularityScore ?? 0) -
        (a.popularityScore ?? 0),
    );

    const goalkeeper =
      sorted.find((player) => player.position === "Goalkeeper") ??
      sorted[0];

    const selected = [
      goalkeeper,
      ...sorted
        .filter((player) => player.id !== goalkeeper?.id)
        .slice(0, 10),
    ].filter(Boolean) as Player[];

    return selected.map((player, index) => ({
      slot: index + 1,
      player,
      position: positions[index],
      isPotentialTransfer: false,
    }));
  }

  async function selectTeam(team: Team) {
    try {
      setSelectedTeam(team);
      setTeamQuery(team.name);
      setTeamResults([]);
      setMessage(`${team.name} kadrosu yükleniyor...`);

      const response = await fetch(
        `/api/lineup-builder/team-squad?teamId=${team.id}`,
        { cache: "no-store" },
      );
      const result = (await response.json()) as SquadResponse;

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "Takım kadrosu yüklenemedi.");
      }

      const players = result.players ?? [];
      setSquadPlayers(players);

      const nextFormation = normalizeFormation(
        result.defaultLineup?.formationCode,
      );
      setFormation(nextFormation);

      const playerMap = new Map(
        players.map((player) => [player.id, player]),
      );

      const loaded = (result.defaultLineup?.slots ?? [])
        .map((slot) => {
          const player = playerMap.get(slot.playerId);

          return player
            ? {
                slot: slot.slot,
                player,
                position: { x: slot.x, y: slot.y },
                isPotentialTransfer: false,
              }
            : null;
        })
        .filter((value): value is LineupPlayer => value !== null)
        .sort((a, b) => a.slot - b.slot);

      setLineup(
        loaded.length === 11
          ? loaded
          : automaticLineup(players, nextFormation),
      );

      setMessage(
        `${team.name} kadrosu hazır. Oyuncuya tıklayarak değiştirebilirsin.`,
      );
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Takım kadrosu yüklenemedi.",
      );
      setSelectedTeam(null);
      setTeamQuery("");
    }
  }

  function applyFormation(code: FormationCode) {
    setFormation(code);

    if (code === "free") {
      return;
    }

    setLineup((current) =>
      current.map((entry, index) => ({
        ...entry,
        position: FORMATIONS[code][index] ?? entry.position,
      })),
    );
  }

  function updatePosition(slot: number, position: Position) {
    setLineup((current) =>
      current.map((entry) =>
        entry.slot === slot ? { ...entry, position } : entry,
      ),
    );
  }

  function openPlayerPicker(slot: number) {
    setEditingSlot(slot);
    setPlayerQuery("");
    setShowOnlySquad(true);
    setPlayerResults(squadPlayers);
    setPositionFilter("");
    setAgeFilter("");
    setCountryFilter("");
    setClubFilter("");
  }

  function replacePlayer(player: Player) {
    if (editingSlot === null) {
      return;
    }

    setLineup((current) =>
      current.map((entry) =>
        entry.slot === editingSlot
          ? {
              ...entry,
              player,
              isPotentialTransfer: !squadPlayers.some(
                (squadPlayer) => squadPlayer.id === player.id,
              ),
            }
          : entry,
      ),
    );

    setEditingSlot(null);
  }

  function resetBuilder() {
    setSelectedTeam(null);
    setTeamQuery("");
    setTeamResults([]);
    setSquadPlayers([]);
    setLineup([]);
    setFormation("4-2-3-1");
    setPlayerInfoMode("club");
    setDrawings([]);
    setDrawingMode("move");
    setMessage("Bir takım seçerek kadroyu otomatik yükle.");
  }

  async function downloadImage() {
    if (!pitchRef.current) {
      return;
    }

    try {
      setDownloadLoading(true);
      const dataUrl = await toPng(pitchRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#059669",
      });

      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = `${safeFileName(
        selectedTeam?.name ?? "takim-kadrosu",
      )}.png`;
      anchor.click();
    } catch (error) {
      console.error(error);
      window.alert("Görsel oluşturulurken hata oluştu.");
    } finally {
      setDownloadLoading(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyMessage("Link kopyalandı!");
      window.setTimeout(() => setCopyMessage(""), 2000);
    } catch {
      setCopyMessage("Link kopyalanamadı.");
    }
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-[1550px] px-4 py-6">
        <header className="mb-6 flex flex-col gap-5 border-b border-white/10 pb-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <Link
              href="/"
              className="mb-4 inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-400"
            >
              ← Ana Sayfa
            </Link>
            <h1 className="text-3xl font-black sm:text-4xl">
              TAKIM{" "}
              <span className="text-yellow-400">
                KADRO OLUŞTURUCU
              </span>
            </h1>
            <p className="mt-2 text-slate-400">
              Takımını seç, ilk 11’i düzenle, transferlerini ekle ve paylaş.
            </p>
          </div>

          <div className="text-center">
            <p className="text-3xl font-black italic">
              Foot<span className="text-yellow-400">Battle</span>
            </p>
            <p className="text-xs text-slate-500">
              hayalindeki kadroyu kur
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() =>
                window.alert(
                  "Takım ara, seç, oyuncuya tıklayarak değiştir ve sahada sürükle.",
                )
              }
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold"
            >
              <HelpCircle size={18} />
              Nasıl Kullanılır?
            </button>

            <button
              type="button"
              onClick={resetBuilder}
              className="inline-flex items-center gap-2 rounded-xl border border-yellow-400/50 bg-yellow-400/10 px-5 py-3 font-black text-yellow-300"
            >
              <RotateCcw size={18} />
              Yeni Kadro
            </button>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)_300px]">
          <aside className="h-fit rounded-3xl border border-white/10 bg-[#0d1828] p-5 xl:sticky xl:top-4">
            <h2 className="font-black uppercase text-yellow-300">
              Takım Seç
            </h2>

            <div className="relative mt-4">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                value={teamQuery}
                onChange={(event) => {
                  setTeamQuery(event.target.value);
                  setSelectedTeam(null);
                }}
                placeholder="Takım ara..."
                className="w-full rounded-xl border border-white/10 bg-[#07111f] py-3 pl-11 pr-4 outline-none"
              />

              {(teamSearchLoading || teamResults.length > 0) && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-[#07111f] shadow-2xl">
                  {teamSearchLoading ? (
                    <p className="px-4 py-3 text-sm text-slate-500">
                      Takımlar aranıyor...
                    </p>
                  ) : (
                    teamResults.map((team) => (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => void selectTeam(team)}
                        className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left hover:bg-white/5"
                      >
                        <TeamLogo team={team} />
                        <div>
                          <p className="font-bold">{team.name}</p>
                          <p className="text-xs text-slate-500">
                            {team.country ?? "—"}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="mt-6">
              <h3 className="font-black uppercase">Çizim Araçları</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
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
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-black ${
                      drawingMode === mode
                        ? "border-yellow-400 bg-yellow-400/15 text-yellow-300"
                        : "border-white/10 text-slate-300"
                    }`}
                  >
                    <Icon size={17} />
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-[auto_1fr] items-center gap-4">
                <input
                  type="color"
                  value={drawingColor}
                  onChange={(event) =>
                    setDrawingColor(event.target.value)
                  }
                  className="h-11 w-14 rounded-lg bg-transparent"
                />
                <input
                  type="range"
                  min="2"
                  max="10"
                  value={drawingWidth}
                  onChange={(event) =>
                    setDrawingWidth(Number(event.target.value))
                  }
                  className="accent-yellow-400"
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setDrawings((current) => current.slice(0, -1))
                  }
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-3 text-sm font-bold"
                >
                  <Undo2 size={16} />
                  Geri Al
                </button>

                <button
                  type="button"
                  onClick={() => setDrawings([])}
                  className="flex items-center justify-center gap-2 rounded-xl border border-red-400/20 px-3 py-3 text-sm font-bold text-red-300"
                >
                  <Trash2 size={16} />
                  Temizle
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-400">
              {message}
            </div>

            <button
              type="button"
              disabled={lineup.length === 0}
              onClick={() => void downloadImage()}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-4 font-black text-[#07111f] disabled:opacity-40"
            >
              <Download size={19} />
              {downloadLoading ? "Hazırlanıyor..." : "PNG İndir"}
            </button>
          </aside>

          <section className="min-w-0 space-y-5">
            <div className="rounded-3xl border border-white/10 bg-[#0d1828] p-3 sm:p-5">
              {lineup.length > 0 ? (
                <TeamPitch
                  pitchRef={pitchRef}
                  team={selectedTeam}
                  lineup={lineup}
                  drawings={drawings}
                  drawingMode={drawingMode}
                  drawingColor={drawingColor}
                  drawingWidth={drawingWidth}
                  playerInfoMode={playerInfoMode}
                  onPositionChange={updatePosition}
                  onPlayerClick={openPlayerPicker}
                  onDrawingsChange={setDrawings}
                />
              ) : (
                <div className="flex aspect-[3/4] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#07111f] text-center text-slate-500">
                  Takım seçildiğinde ilk 11 burada görünecek.
                </div>
              )}
            </div>

            {lineup.length > 0 && (
              <div className="rounded-3xl border border-white/10 bg-[#0d1828] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <label className="flex items-center gap-3">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                      Diziliş
                    </span>
                    <select
                      value={formation}
                      onChange={(event) =>
                        applyFormation(event.target.value as FormationCode)
                      }
                      className="rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 text-sm font-black outline-none transition focus:border-yellow-400/50"
                    >
                      <option value="free">Serbest diziliş</option>
                      <option value="4-2-3-1">4-2-3-1</option>
                      <option value="4-3-3">4-3-3</option>
                      <option value="4-4-2">4-4-2</option>
                      <option value="3-5-2">3-5-2</option>
                    </select>
                  </label>

                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["club", "Kulüp"],
                        ["country", "Ülke"],
                        ["age", "Yaş"],
                      ] as const
                    ).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPlayerInfoMode(mode)}
                        className={`rounded-full border px-5 py-2.5 text-sm font-black transition ${
                          playerInfoMode === mode
                            ? "border-yellow-400 bg-yellow-400 text-[#07111f]"
                            : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {lineup.length > 0 && (
              <div className="rounded-3xl border border-white/10 bg-[#0d1828] p-5">
                <div className="flex items-center gap-3">
                  <Share2 className="text-yellow-300" size={21} />
                  <h2 className="font-black uppercase">Kadronu Paylaş</h2>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/10 bg-[#07111f] px-4 py-3">
                    <Link2 size={17} className="text-slate-500" />
                    <input
                      readOnly
                      value={shareUrl}
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => void copyLink()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-400/50 bg-yellow-400/10 px-5 py-3 font-black text-yellow-300"
                  >
                    <Copy size={17} />
                    Kopyala
                  </button>
                </div>

                {copyMessage && (
                  <p className="mt-3 text-sm font-bold text-green-400">
                    {copyMessage}
                  </p>
                )}
              </div>
            )}
          </section>

          <aside className="h-fit rounded-3xl border border-white/10 bg-[#0d1828] p-5 xl:sticky xl:top-4">
            <h2 className="font-black uppercase">Kadro Havuzu</h2>
            <p className="mt-2 text-sm text-slate-500">
              Sahadaki oyuncuya tıklayarak bu havuzdan değiştir.
            </p>

            <div className="mt-4 max-h-[720px] space-y-2 overflow-y-auto pr-1">
              {squadPlayers.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#07111f] p-3"
                >
                  <PlayerAvatar player={player} />
                  <div className="min-w-0">
                    <p className="truncate font-bold">
                      {player.fullName}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {player.subPosition ?? player.position}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      {editingSlot !== null && (
        <PlayerPickerModal
          query={playerQuery}
          onQueryChange={setPlayerQuery}
          showOnlySquad={showOnlySquad}
          onToggleSource={setShowOnlySquad}
          players={filteredPlayers}
          loading={playerSearchLoading}
          positionFilter={positionFilter}
          onPositionFilterChange={setPositionFilter}
          ageFilter={ageFilter}
          onAgeFilterChange={setAgeFilter}
          countryFilter={countryFilter}
          onCountryFilterChange={setCountryFilter}
          clubFilter={clubFilter}
          onClubFilterChange={setClubFilter}
          onSelect={replacePlayer}
          onClose={() => setEditingSlot(null)}
        />
      )}
    </main>
  );
}

function TeamLogo({ team }: { team: Team }) {
  return team.logoUrl ? (
    <img
      src={team.logoUrl}
      alt=""
      className="h-11 w-11 rounded-full object-contain"
    />
  ) : (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-yellow-400 font-black text-[#07111f]">
      {team.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function PlayerAvatar({ player }: { player: Player }) {
  return player.imageUrl ? (
    <img
      src={player.imageUrl}
      alt=""
      className="h-11 w-11 shrink-0 rounded-full border-2 border-white object-cover"
    />
  ) : (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white bg-slate-700 font-black">
      {player.fullName.slice(0, 1)}
    </div>
  );
}

function TeamPitch({
  pitchRef,
  team,
  lineup,
  drawings,
  drawingMode,
  drawingColor,
  drawingWidth,
  playerInfoMode,
  onPositionChange,
  onPlayerClick,
  onDrawingsChange,
}: {
  pitchRef: RefObject<HTMLDivElement | null>;
  team: Team | null;
  lineup: LineupPlayer[];
  drawings: DrawingItem[];
  drawingMode: DrawingMode;
  drawingColor: string;
  drawingWidth: number;
  playerInfoMode: PlayerInfoMode;
  onPositionChange: (slot: number, position: Position) => void;
  onPlayerClick: (slot: number) => void;
  onDrawingsChange: (drawings: DrawingItem[]) => void;
}) {
  const [activeDrawing, setActiveDrawing] =
    useState<DrawingItem | null>(null);

  function pointerPosition(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (!pitchRef.current) {
      return null;
    }

    const bounds = pitchRef.current.getBoundingClientRect();

    return {
      x: Math.min(
        98,
        Math.max(
          2,
          ((event.clientX - bounds.left) / bounds.width) * 100,
        ),
      ),
      y: Math.min(
        98,
        Math.max(
          2,
          ((event.clientY - bounds.top) / bounds.height) * 100,
        ),
      ),
    };
  }

  function onPointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (drawingMode === "move") {
      return;
    }

    const point = pointerPosition(event);

    if (!point) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);

    if (drawingMode === "eraser") {
      const closest = drawings
        .map((drawing) => ({
          drawing,
          distance: drawingDistance(point, drawing),
        }))
        .sort((a, b) => a.distance - b.distance)[0];

      if (closest && closest.distance <= 5) {
        onDrawingsChange(
          drawings.filter(
            (drawing) => drawing.id !== closest.drawing.id,
          ),
        );
      }

      return;
    }

    setActiveDrawing(
      drawingMode === "arrow"
        ? {
            id: makeId(),
            kind: "arrow",
            start: point,
            end: point,
            color: drawingColor,
            width: drawingWidth,
          }
        : {
            id: makeId(),
            kind: "pen",
            points: [point],
            color: drawingColor,
            width: drawingWidth,
          },
    );
  }

  function onPointerMove(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (
      !activeDrawing ||
      !event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      return;
    }

    const point = pointerPosition(event);

    if (!point) {
      return;
    }

    if (activeDrawing.kind === "arrow") {
      setActiveDrawing({ ...activeDrawing, end: point });
      return;
    }

    const last = activeDrawing.points.at(-1);

    if (last && pointDistance(last, point) < 0.8) {
      return;
    }

    setActiveDrawing({
      ...activeDrawing,
      points: [...activeDrawing.points, point],
    });
  }

  function finishDrawing(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!activeDrawing) {
      return;
    }

    const valid =
      activeDrawing.kind === "arrow"
        ? pointDistance(activeDrawing.start, activeDrawing.end) >= 2
        : activeDrawing.points.length >= 2;

    if (valid) {
      onDrawingsChange([...drawings, activeDrawing]);
    }

    setActiveDrawing(null);
  }

  return (
    <div
      ref={pitchRef}
      className="relative mx-auto aspect-[3/4] w-full max-w-[800px] touch-none select-none overflow-hidden rounded-3xl border-4 border-emerald-900 bg-emerald-600 shadow-2xl"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishDrawing}
      onPointerCancel={finishDrawing}
    >
      <PitchLines />

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-center text-white/15">
        <p className="text-5xl font-black italic sm:text-7xl">
          FootBattle
        </p>
        <p className="font-bold">{team?.name ?? ""}</p>
      </div>

      <DrawingLayer
        drawings={
          activeDrawing ? [...drawings, activeDrawing] : drawings
        }
      />

      {lineup.map((entry) => (
        <DraggablePlayer
          key={entry.slot}
          entry={entry}
          disabled={drawingMode !== "move"}
          pitchRef={pitchRef}
          onPositionChange={onPositionChange}
          onClick={onPlayerClick}
          infoMode={playerInfoMode}
        />
      ))}
    </div>
  );
}

function DraggablePlayer({
  entry,
  disabled,
  pitchRef,
  onPositionChange,
  onClick,
  infoMode,
}: {
  entry: LineupPlayer;
  disabled: boolean;
  pitchRef: RefObject<HTMLDivElement | null>;
  onPositionChange: (slot: number, position: Position) => void;
  onClick: (slot: number) => void;
  infoMode: PlayerInfoMode;
}) {
  const pointerStart = useRef<{
    x: number;
    y: number;
  } | null>(null);
  const hasDragged = useRef(false);
  const suppressClick = useRef(false);

  function secondaryInfo() {
    if (infoMode === "country") {
      return entry.player.nationality || "Ülke bilinmiyor";
    }

    if (infoMode === "age") {
      return entry.player.age === null
        ? "Yaş bilinmiyor"
        : `${entry.player.age} yaş`;
    }

    return entry.player.club || "Kulüpsüz";
  }

  return (
    <button
      type="button"
      className={`absolute z-20 flex w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center ${
        disabled
          ? "pointer-events-none"
          : "cursor-grab active:cursor-grabbing"
      }`}
      style={{
        left: `${entry.position.x}%`,
        top: `${entry.position.y}%`,
        touchAction: "none",
      }}
      onClick={() => {
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }

        onClick(entry.slot);
      }}
      onPointerDown={(event) => {
        if (disabled) {
          return;
        }

        event.stopPropagation();
        pointerStart.current = {
          x: event.clientX,
          y: event.clientY,
        };
        hasDragged.current = false;
        suppressClick.current = false;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (
          !pitchRef.current ||
          !event.currentTarget.hasPointerCapture(event.pointerId) ||
          !pointerStart.current
        ) {
          return;
        }

        const movement = Math.hypot(
          event.clientX - pointerStart.current.x,
          event.clientY - pointerStart.current.y,
        );

        if (movement < 5 && !hasDragged.current) {
          return;
        }

        hasDragged.current = true;
        suppressClick.current = true;

        const bounds = pitchRef.current.getBoundingClientRect();

        onPositionChange(entry.slot, {
          x: Math.min(
            94,
            Math.max(
              6,
              ((event.clientX - bounds.left) / bounds.width) * 100,
            ),
          ),
          y: Math.min(
            94,
            Math.max(
              6,
              ((event.clientY - bounds.top) / bounds.height) * 100,
            ),
          ),
        });
      }}
      onPointerUp={(event) => {
        if (
          event.currentTarget.hasPointerCapture(event.pointerId)
        ) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }

        pointerStart.current = null;

        if (hasDragged.current) {
          window.setTimeout(() => {
            suppressClick.current = false;
          }, 0);
        }
      }}
      onPointerCancel={(event) => {
        if (
          event.currentTarget.hasPointerCapture(event.pointerId)
        ) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }

        pointerStart.current = null;
        hasDragged.current = false;
        suppressClick.current = false;
      }}
    >
      <div
        className={`relative flex h-16 w-16 items-center justify-center overflow-visible rounded-full ${
          entry.isPotentialTransfer
            ? "ring-4 ring-yellow-300"
            : "ring-4 ring-white"
        }`}
      >
        {entry.player.imageUrl ? (
          <img
            src={entry.player.imageUrl}
            alt={entry.player.fullName}
            draggable={false}
            className="h-16 w-16 rounded-full object-cover object-top"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-700 text-xl font-black">
            {entry.player.fullName.slice(0, 1)}
          </div>
        )}

        {entry.isPotentialTransfer && (
          <span className="absolute -right-3 -top-2 rounded-full bg-yellow-400 px-2 py-1 text-[8px] font-black text-[#07111f] shadow">
            TRANSFER
          </span>
        )}
      </div>

      <div className="mt-2 w-full truncate rounded-lg bg-[#07111f]/95 px-2 py-1 text-xs font-black shadow-lg">
        {shortName(entry.player.fullName)}
      </div>

      <div className="mt-1 w-full truncate rounded-md bg-black/35 px-2 py-1 text-[10px] font-bold text-white/85 backdrop-blur-sm">
        {secondaryInfo()}
      </div>
    </button>
  );
}

function PitchLines() {
  return (
    <>
      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.04)_12.5%,rgba(0,0,0,0.025)_12.5%,rgba(0,0,0,0.025)_25%)]" />
      <div className="absolute inset-[3%] border-[3px] border-white/60" />
      <div className="absolute left-[3%] right-[3%] top-1/2 h-[3px] bg-white/60" />
      <div className="absolute left-1/2 top-1/2 aspect-square w-[31%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white/60" />
      <div className="absolute left-1/2 top-[3%] h-[17%] w-[50%] -translate-x-1/2 border-x-[3px] border-b-[3px] border-white/60" />
      <div className="absolute bottom-[3%] left-1/2 h-[17%] w-[50%] -translate-x-1/2 border-x-[3px] border-t-[3px] border-white/60" />
    </>
  );
}

function DrawingLayer({ drawings }: { drawings: DrawingItem[] }) {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 z-[15] h-full w-full"
    >
      <defs>
        <marker
          id="team-arrow-head"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill="context-stroke" />
        </marker>
      </defs>

      {drawings.map((drawing) =>
        drawing.kind === "arrow" ? (
          <line
            key={drawing.id}
            x1={drawing.start.x}
            y1={drawing.start.y}
            x2={drawing.end.x}
            y2={drawing.end.y}
            stroke={drawing.color}
            strokeWidth={drawing.width}
            markerEnd="url(#team-arrow-head)"
            vectorEffect="non-scaling-stroke"
          />
        ) : (
          <polyline
            key={drawing.id}
            points={drawing.points
              .map((point) => `${point.x},${point.y}`)
              .join(" ")}
            fill="none"
            stroke={drawing.color}
            strokeWidth={drawing.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ),
      )}
    </svg>
  );
}

function PlayerPickerModal({
  query,
  onQueryChange,
  showOnlySquad,
  onToggleSource,
  players,
  loading,
  positionFilter,
  onPositionFilterChange,
  ageFilter,
  onAgeFilterChange,
  countryFilter,
  onCountryFilterChange,
  clubFilter,
  onClubFilterChange,
  onSelect,
  onClose,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  showOnlySquad: boolean;
  onToggleSource: (value: boolean) => void;
  players: Player[];
  loading: boolean;
  positionFilter: string;
  onPositionFilterChange: (value: string) => void;
  ageFilter: string;
  onAgeFilterChange: (value: string) => void;
  countryFilter: string;
  onCountryFilterChange: (value: string) => void;
  clubFilter: string;
  onClubFilterChange: (value: string) => void;
  onSelect: (player: Player) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-[#0d1828]">
        <header className="flex items-center justify-between border-b border-white/10 p-5">
          <div>
            <h2 className="text-xl font-black">Oyuncuyu değiştir</h2>
            <p className="text-sm text-slate-500">
              Kulüp kadrosundan seç veya olası transfer ara.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 p-3"
          >
            <X size={20} />
          </button>
        </header>

        <div className="border-b border-white/10 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onToggleSource(true)}
              className={`rounded-xl border px-4 py-3 font-black ${
                showOnlySquad
                  ? "border-yellow-400 bg-yellow-400/15 text-yellow-300"
                  : "border-white/10"
              }`}
            >
              Kulüp Kadrosu
            </button>
            <button
              type="button"
              onClick={() => onToggleSource(false)}
              className={`rounded-xl border px-4 py-3 font-black ${
                !showOnlySquad
                  ? "border-yellow-400 bg-yellow-400/15 text-yellow-300"
                  : "border-white/10"
              }`}
            >
              Olası Transfer Ara
            </button>
          </div>

          {!showOnlySquad && (
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Oyuncu ara... En az 3 harf"
              className="mt-4 w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3"
            />
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select
              value={positionFilter}
              onChange={(event) =>
                onPositionFilterChange(event.target.value)
              }
              className="rounded-xl border border-white/10 bg-[#07111f] px-3 py-3"
            >
              <option value="">Tüm mevkiler</option>
              <option value="Goalkeeper">Goalkeeper</option>
              <option value="Defender">Defender</option>
              <option value="Midfield">Midfield</option>
              <option value="Attack">Attack</option>
            </select>

            <select
              value={ageFilter}
              onChange={(event) =>
                onAgeFilterChange(event.target.value)
              }
              className="rounded-xl border border-white/10 bg-[#07111f] px-3 py-3"
            >
              <option value="">Tüm yaşlar</option>
              <option value="18-23">18-23</option>
              <option value="24-29">24-29</option>
              <option value="30+">30+</option>
            </select>

            <input
              value={countryFilter}
              onChange={(event) =>
                onCountryFilterChange(event.target.value)
              }
              placeholder="Ülke"
              className="rounded-xl border border-white/10 bg-[#07111f] px-3 py-3"
            />

            <input
              value={clubFilter}
              onChange={(event) =>
                onClubFilterChange(event.target.value)
              }
              placeholder="Kulüp"
              className="rounded-xl border border-white/10 bg-[#07111f] px-3 py-3"
            />
          </div>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-5">
          {loading ? (
            <p className="text-center text-slate-500">
              Oyuncular aranıyor...
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {players.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onSelect(player)}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#07111f] p-4 text-left hover:border-yellow-400/40"
                >
                  <PlayerAvatar player={player} />
                  <div className="min-w-0">
                    <p className="truncate font-black">
                      {player.fullName}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {player.club ?? "Kulüpsüz"} ·{" "}
                      {player.subPosition ??
                        player.position ??
                        "Mevki bilinmiyor"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}