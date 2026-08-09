"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import type { KeyboardEvent } from "react";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/* =========================================================
   TYPES
========================================================= */

type DuelStatus =
  | "pending"
  | "accepted"
  | "active"
  | "completed"
  | "rejected"
  | "cancelled";

type DuelPlayer = {
  id: string;

  username: string | null;
  displayName: string;
  avatarUrl: string | null;

  totalScore: number;
  currentStreak: number;
  gamesPlayed: number;
  gamesWon: number;

  online: boolean;
  lastSeenAt: string | null;
  lastSeenText: string;
};

type DuelItem = {
  id: number;

  gameCode: string;
  gameLabel: string;

  status: DuelStatus;

  viewerRole:
    | "challenger"
    | "opponent";

  challenger: DuelPlayer | null;
  opponent: DuelPlayer | null;
  otherPlayer: DuelPlayer | null;

  myScore: number;
  opponentScore: number;

  result:
    | "won"
    | "lost"
    | "draw"
    | null;

  winnerId: string | null;

  createdAt: string;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

type DuelsResponse = {
  ok?: boolean;
  error?: string;

  incoming?: DuelItem[];
  outgoing?: DuelItem[];
  active?: DuelItem[];
  history?: DuelItem[];
};

/* =========================================================
   CLUB CLASH
========================================================= */

type ClubClashRound = {
  id: number;
  duel_id: number;

  round_no: number;

  club_a: string;
  club_b: string;

  winner_user_id:
    | string
    | null;

  challenger_answer:
    | string
    | null;

  opponent_answer:
    | string
    | null;

  challenger_answer_player_id:
    | number
    | null;

  opponent_answer_player_id:
    | number
    | null;

  challenger_answered_at:
    | string
    | null;

  opponent_answered_at:
    | string
    | null;

  completed_at:
    | string
    | null;

  created_at: string;
};

type ClubClashResponse = {
  ok?: boolean;
  error?: string;

  duel?: {
    id: number;

    gameCode: string;
    gameLabel?: string;

    status: DuelStatus;

    challengerScore: number;
    opponentScore: number;

    winnerId:
      | string
      | null;

    startedAt?:
      | string
      | null;

    completedAt?:
      | string
      | null;
  };

  roundCount?: number;

  currentRound:
    | ClubClashRound
    | null;

  rounds?: ClubClashRound[];
};

/* =========================================================
   PLAYER SEARCH
========================================================= */

type SearchPlayer = {
  playerId: number;

  name: string;

  currentClubName:
    | string
    | null;
};

type SearchResponse = {
  ok?: boolean;
  error?: string;

  players?: SearchPlayer[];
};

/* =========================================================
   ANSWER
========================================================= */

type AnswerResponse = {
  ok?: boolean;
  error?: string;

  correct?: boolean;
  won?: boolean;

  roundCompleted?: boolean;
  gameFinished?: boolean;

  message?: string;

  ambiguous?: boolean;

  players?: SearchPlayer[];

  player?: {
    playerId: number;
    name: string;
  };

  score?: {
    challenger: number;
    opponent: number;
  };

  winnerId?:
    | string
    | null;
};

/* =========================================================
   FORFEIT
========================================================= */

type ForfeitResponse = {
  ok?: boolean;
  error?: string;

  forfeited?: boolean;
  alreadyCompleted?: boolean;

  message?: string;

  winnerId?: string;

  duel?: {
    id: number;
    status: DuelStatus;

    challengerScore: number;
    opponentScore: number;

    winnerId:
      | string
      | null;

    completedAt?:
      | string
      | null;
  };
};

/* =========================================================
   HELPERS
========================================================= */

function formatDateTime(
  value: string | null,
) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",

      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(
    new Date(value),
  );
}

function getInitials(
  player: DuelPlayer | null,
) {
  if (!player) {
    return "FB";
  }

  const value =
    player.displayName ||
    player.username ||
    "FootBattle";

  const parts =
    value
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length ===
    0
  ) {
    return "FB";
  }

  if (
    parts.length ===
    1
  ) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0].slice(
      0,
      1,
    ) +
    parts[
      parts.length - 1
    ].slice(
      0,
      1,
    )
  ).toUpperCase();
}

function getStatusLabel(
  status: DuelStatus,
) {
  switch (status) {
    case "pending":
      return "Beklemede";

    case "accepted":
      return "Kabul Edildi";

    case "active":
      return "Devam Ediyor";

    case "completed":
      return "Tamamlandı";

    case "rejected":
      return "Reddedildi";

    case "cancelled":
      return "İptal Edildi";

    default:
      return status;
  }
}

function getGameLabel(
  duel: DuelItem,
) {
  if (
    duel.gameCode ===
    "club_clash"
  ) {
    return "2 Takım 1 Oyuncu";
  }

  return duel.gameLabel;
}

/* =========================================================
   PAGE
========================================================= */

export default function DuelRoomPage() {
  const params =
    useParams<{
      id: string;
    }>();

  const duelId =
    Number(params.id);

  /* =======================================================
     DUEL
  ======================================================= */

  const [
    duel,
    setDuel,
  ] =
    useState<DuelItem | null>(
      null,
    );

  /* =======================================================
     CLUB CLASH
  ======================================================= */

  const [
    clubClash,
    setClubClash,
  ] =
    useState<ClubClashResponse | null>(
      null,
    );

  const [
    clubClashLoading,
    setClubClashLoading,
  ] =
    useState(false);

  const [
    clubClashError,
    setClubClashError,
  ] =
    useState("");

  /* =======================================================
     ANSWER
  ======================================================= */

  const [
    playerAnswer,
    setPlayerAnswer,
  ] =
    useState("");

  const [
    selectedPlayer,
    setSelectedPlayer,
  ] =
    useState<SearchPlayer | null>(
      null,
    );

  const [
    answerLoading,
    setAnswerLoading,
  ] =
    useState(false);

  const [
    answerMessage,
    setAnswerMessage,
  ] =
    useState("");

  const [
    answerCorrect,
    setAnswerCorrect,
  ] =
    useState<boolean | null>(
      null,
    );

  const answerInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  /* =======================================================
     AUTOCOMPLETE
  ======================================================= */

  const [
    searchResults,
    setSearchResults,
  ] =
    useState<SearchPlayer[]>([]);

  const [
    searchLoading,
    setSearchLoading,
  ] =
    useState(false);

  const [
    searchOpen,
    setSearchOpen,
  ] =
    useState(false);

  const [
    highlightedIndex,
    setHighlightedIndex,
  ] =
    useState(-1);

  const searchRequestRef =
    useRef(0);

  /* =======================================================
     FORFEIT
  ======================================================= */

  const [
    forfeitLoading,
    setForfeitLoading,
  ] =
    useState(false);

  const [
    forfeitMessage,
    setForfeitMessage,
  ] =
    useState("");

  /* =======================================================
     GENERAL
  ======================================================= */

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  /* =======================================================
     ANSWER RESET
  ======================================================= */

  const resetAnswerField =
    useCallback(() => {
      setPlayerAnswer("");

      setSelectedPlayer(
        null,
      );

      setSearchResults(
        [],
      );

      setSearchOpen(
        false,
      );

      setHighlightedIndex(
        -1,
      );
    }, []);

  const focusAnswerInput =
    useCallback(() => {
      window.setTimeout(
        () => {
          answerInputRef.current?.focus();
        },
        80,
      );
    }, []);

  /* =======================================================
     LOAD DUEL
  ======================================================= */

  const loadDuel =
    useCallback(
      async (
        showLoading =
          true,
      ) => {
        if (
          !Number.isInteger(
            duelId,
          ) ||
          duelId <= 0
        ) {
          setError(
            "Geçersiz düello numarası.",
          );

          setLoading(
            false,
          );

          return;
        }

        try {
          if (
            showLoading
          ) {
            setLoading(
              true,
            );
          }

          setError("");

          const response =
            await fetch(
              "/api/duels",
              {
                cache:
                  "no-store",
              },
            );

          const result =
            (await response.json()) as DuelsResponse;

          if (
            !response.ok ||
            !result.ok
          ) {
            throw new Error(
              result.error ??
                "Düello yüklenemedi.",
            );
          }

          const allDuels = [
            ...(result.incoming ??
              []),

            ...(result.outgoing ??
              []),

            ...(result.active ??
              []),

            ...(result.history ??
              []),
          ];

          const foundDuel =
            allDuels.find(
              (item) =>
                item.id ===
                duelId,
            );

          if (
            !foundDuel
          ) {
            throw new Error(
              "Düello bulunamadı veya bu düelloya erişim yetkin yok.",
            );
          }

          setDuel(
            foundDuel,
          );

          return foundDuel;
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Düello yüklenemedi.",
          );

          return null;
        } finally {
          if (
            showLoading
          ) {
            setLoading(
              false,
            );
          }
        }
      },
      [duelId],
    );

  /* =======================================================
     LOAD CLUB CLASH
  ======================================================= */

  const loadClubClash =
    useCallback(
      async (
        showLoading =
          false,
      ) => {
        if (
          !Number.isInteger(
            duelId,
          ) ||
          duelId <= 0
        ) {
          return null;
        }

        try {
          if (
            showLoading
          ) {
            setClubClashLoading(
              true,
            );
          }

          setClubClashError(
            "",
          );

          const response =
            await fetch(
              `/api/duels/${duelId}/club-clash`,
              {
                cache:
                  "no-store",
              },
            );

          const result =
            (await response.json()) as ClubClashResponse;

          if (
            !response.ok ||
            !result.ok
          ) {
            throw new Error(
              result.error ??
                "2 Takım 1 Oyuncu verisi yüklenemedi.",
            );
          }

          setClubClash(
            result,
          );

          return result;
        } catch (err) {
          setClubClashError(
            err instanceof Error
              ? err.message
              : "2 Takım 1 Oyuncu verisi yüklenemedi.",
          );

          return null;
        } finally {
          if (
            showLoading
          ) {
            setClubClashLoading(
              false,
            );
          }
        }
      },
      [duelId],
    );

  /* =======================================================
     INITIAL
  ======================================================= */

  useEffect(() => {
    void loadDuel();
  }, [loadDuel]);

  useEffect(() => {
    if (
      duel?.gameCode ===
      "club_clash"
    ) {
      void loadClubClash(
        true,
      );
    }
  }, [
    duel?.gameCode,
    loadClubClash,
  ]);

  /* =======================================================
     LIVE POLLING
  ======================================================= */

  useEffect(() => {
    /*
     * Gerçek iki cihaz testine kadar
     * 2 saniyede bir güncelliyoruz.
     *
     * Rakip round kazandığında veya
     * oyunu bitirdiğinde diğer ekran
     * otomatik güncellenecek.
     */

    const intervalId =
      window.setInterval(
        async () => {
          const latestDuel =
            await loadDuel(
              false,
            );

          if (
            latestDuel?.gameCode ===
            "club_clash"
          ) {
            await loadClubClash(
              false,
            );
          }
        },
        2000,
      );

    return () => {
      window.clearInterval(
        intervalId,
      );
    };
  }, [
    loadDuel,
    loadClubClash,
  ]);

  /* =======================================================
     AUTOCOMPLETE
  ======================================================= */

  useEffect(() => {
    /*
     * Maç bittiyse artık
     * oyuncu arama yapma.
     */
    if (
      duel?.status !==
      "active"
    ) {
      setSearchOpen(
        false,
      );

      setSearchResults(
        [],
      );

      return;
    }

    const query =
      playerAnswer.trim();

    if (
      selectedPlayer &&
      query ===
        selectedPlayer.name
    ) {
      setSearchResults(
        [],
      );

      setSearchOpen(
        false,
      );

      return;
    }

    if (
      query.length < 3
    ) {
      setSearchResults(
        [],
      );

      setSearchOpen(
        false,
      );

      setHighlightedIndex(
        -1,
      );

      return;
    }

    const requestId =
      searchRequestRef.current +
      1;

    searchRequestRef.current =
      requestId;

    const timer =
      window.setTimeout(
        async () => {
          try {
            setSearchLoading(
              true,
            );

            const response =
              await fetch(
                `/api/duels/${duelId}/club-clash/search-player?q=${encodeURIComponent(
                  query,
                )}`,
                {
                  cache:
                    "no-store",
                },
              );

            const result =
              (await response.json()) as SearchResponse;

            if (
              requestId !==
              searchRequestRef.current
            ) {
              return;
            }

            if (
              !response.ok ||
              !result.ok
            ) {
              setSearchResults(
                [],
              );

              setSearchOpen(
                false,
              );

              return;
            }

            const players =
              result.players ??
              [];

            setSearchResults(
              players,
            );

            setSearchOpen(
              players.length >
                0,
            );

            setHighlightedIndex(
              -1,
            );
          } catch {
            if (
              requestId ===
              searchRequestRef.current
            ) {
              setSearchResults(
                [],
              );

              setSearchOpen(
                false,
              );
            }
          } finally {
            if (
              requestId ===
              searchRequestRef.current
            ) {
              setSearchLoading(
                false,
              );
            }
          }
        },
        250,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    playerAnswer,
    selectedPlayer,
    duelId,
    duel?.status,
  ]);

  /* =======================================================
     PLAYERS
  ======================================================= */

  const myPlayer =
    useMemo(() => {
      if (!duel) {
        return null;
      }

      return duel.viewerRole ===
        "challenger"
        ? duel.challenger
        : duel.opponent;
    }, [duel]);

  const rivalPlayer =
    useMemo(() => {
      if (!duel) {
        return null;
      }

      return duel.viewerRole ===
        "challenger"
        ? duel.opponent
        : duel.challenger;
    }, [duel]);

  /* =======================================================
     CLUB CLASH COMPUTED
  ======================================================= */

  const currentRound =
    clubClash?.currentRound ??
    null;

  const roundCount =
    clubClash?.roundCount ??
    0;

  const completedRoundCount =
    useMemo(() => {
      return (
        clubClash?.rounds ??
        []
      ).filter(
        (round) =>
          Boolean(
            round.completed_at,
          ),
      ).length;
    }, [clubClash]);

  const currentRoundNumber =
    currentRound?.round_no ??
    Math.min(
      completedRoundCount +
        1,
      roundCount,
    );

  /* =======================================================
     RESULT
  ======================================================= */

  const gameCompleted =
    duel?.status ===
    "completed";

  const didIWin =
    useMemo(() => {
      if (
        !duel ||
        duel.status !==
          "completed"
      ) {
        return false;
      }

      if (
        duel.result ===
        "won"
      ) {
        return true;
      }

      return (
        duel.winnerId !==
          null &&
        duel.winnerId ===
          myPlayer?.id
      );
    }, [
      duel,
      myPlayer,
    ]);

  const didILose =
    useMemo(() => {
      if (
        !duel ||
        duel.status !==
          "completed"
      ) {
        return false;
      }

      if (
        duel.result ===
        "lost"
      ) {
        return true;
      }

      return (
        duel.winnerId !==
          null &&
        duel.winnerId !==
          myPlayer?.id
      );
    }, [
      duel,
      myPlayer,
    ]);

  /* =======================================================
     SELECT PLAYER
  ======================================================= */

  function selectPlayer(
    player: SearchPlayer,
  ) {
    setSelectedPlayer(
      player,
    );

    setPlayerAnswer(
      player.name,
    );

    setSearchOpen(
      false,
    );

    setSearchResults(
      [],
    );

    setHighlightedIndex(
      -1,
    );

    setAnswerMessage(
      "",
    );

    setAnswerCorrect(
      null,
    );
  }

  /* =======================================================
     INPUT CHANGE
  ======================================================= */

  function handleAnswerChange(
    value: string,
  ) {
    setPlayerAnswer(
      value,
    );

    if (
      selectedPlayer &&
      value !==
        selectedPlayer.name
    ) {
      setSelectedPlayer(
        null,
      );
    }

    setAnswerMessage(
      "",
    );

    setAnswerCorrect(
      null,
    );
  }

  /* =======================================================
     SEND ANSWER
  ======================================================= */

  async function submitAnswer(
    forcedPlayer?:
      | SearchPlayer
      | null,
  ) {
    if (
      answerLoading ||
      duel?.status !==
        "active"
    ) {
      return;
    }

    if (
      !currentRound
    ) {
      return;
    }

    const playerToSend =
      forcedPlayer ??
      selectedPlayer;

    const answerText =
      playerToSend?.name ??
      playerAnswer.trim();

    if (!answerText) {
      setAnswerCorrect(
        false,
      );

      setAnswerMessage(
        "Bir futbolcu yazmalısın.",
      );

      focusAnswerInput();

      return;
    }

    try {
      setAnswerLoading(
        true,
      );

      setAnswerMessage(
        "",
      );

      setAnswerCorrect(
        null,
      );

      setSearchOpen(
        false,
      );

      const response =
        await fetch(
          `/api/duels/${duelId}/club-clash/answer`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                playerId:
                  playerToSend?.playerId ??
                  null,

                answer:
                  answerText,
              }),
          },
        );

      const result =
        (await response.json()) as AnswerResponse;

      /* ===================================================
         API ERROR
      =================================================== */

      if (
        !response.ok ||
        !result.ok
      ) {
        setAnswerCorrect(
          false,
        );

        setAnswerMessage(
          result.error ??
            "Cevap kontrol edilemedi.",
        );

        if (
          result.players &&
          result.players.length >
            0
        ) {
          setSearchResults(
            result.players,
          );

          setSearchOpen(
            true,
          );

          setHighlightedIndex(
            0,
          );
        }

        focusAnswerInput();

        return;
      }

      setAnswerCorrect(
        result.correct ??
          false,
      );

      setAnswerMessage(
        result.message ??
          "",
      );

      /* ===================================================
         WRONG
      =================================================== */

      if (
        result.correct ===
        false
      ) {
        resetAnswerField();

        focusAnswerInput();

        return;
      }

      /* ===================================================
         CORRECT
      =================================================== */

      if (
        result.correct ===
        true
      ) {
        resetAnswerField();

        await Promise.all([
          loadDuel(false),
          loadClubClash(
            false,
          ),
        ]);

        if (
          !result.gameFinished
        ) {
          focusAnswerInput();
        }

        return;
      }
    } catch (err) {
      setAnswerCorrect(
        false,
      );

      setAnswerMessage(
        err instanceof Error
          ? err.message
          : "Cevap gönderilemedi.",
      );

      focusAnswerInput();
    } finally {
      setAnswerLoading(
        false,
      );
    }
  }

  /* =======================================================
     FORFEIT
  ======================================================= */

  async function forfeitDuel() {
    if (
      forfeitLoading ||
      duel?.status !==
        "active"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Düellodan pes etmek istediğine emin misin?\n\nRakibin otomatik olarak kazanacak.",
      );

    if (
      !confirmed
    ) {
      return;
    }

    try {
      setForfeitLoading(
        true,
      );

      setForfeitMessage(
        "",
      );

      setAnswerMessage(
        "",
      );

      const response =
        await fetch(
          `/api/duels/${duelId}/forfeit`,
          {
            method:
              "POST",
          },
        );

      const result =
        (await response.json()) as ForfeitResponse;

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
            "Düellodan pes edilemedi.",
        );
      }

      setForfeitMessage(
        result.message ??
          "Düellodan pes ettin.",
      );

      resetAnswerField();

      await Promise.all([
        loadDuel(false),
        loadClubClash(
          false,
        ),
      ]);
    } catch (err) {
      setForfeitMessage(
        err instanceof Error
          ? err.message
          : "Düellodan pes edilemedi.",
      );
    } finally {
      setForfeitLoading(
        false,
      );
    }
  }

  /* =======================================================
     KEYBOARD
  ======================================================= */

  function handleAnswerKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (
      event.key ===
      "ArrowDown"
    ) {
      if (
        searchResults.length ===
        0
      ) {
        return;
      }

      event.preventDefault();

      setSearchOpen(
        true,
      );

      setHighlightedIndex(
        (current) => {
          if (
            current <
            searchResults.length -
              1
          ) {
            return (
              current + 1
            );
          }

          return 0;
        },
      );

      return;
    }

    if (
      event.key ===
      "ArrowUp"
    ) {
      if (
        searchResults.length ===
        0
      ) {
        return;
      }

      event.preventDefault();

      setSearchOpen(
        true,
      );

      setHighlightedIndex(
        (current) => {
          if (
            current > 0
          ) {
            return (
              current - 1
            );
          }

          return (
            searchResults.length -
            1
          );
        },
      );

      return;
    }

    if (
      event.key ===
      "Escape"
    ) {
      setSearchOpen(
        false,
      );

      setHighlightedIndex(
        -1,
      );

      return;
    }

    if (
      event.key ===
      "Enter"
    ) {
      event.preventDefault();

      if (
        answerLoading
      ) {
        return;
      }

      if (
        searchOpen &&
        highlightedIndex >=
          0 &&
        searchResults[
          highlightedIndex
        ]
      ) {
        const player =
          searchResults[
            highlightedIndex
          ];

        selectPlayer(
          player,
        );

        void submitAnswer(
          player,
        );

        return;
      }

      void submitAnswer();
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07111f] text-white">

        <div className="mx-auto max-w-[1120px] px-5 py-10">

          <div className="rounded-3xl border border-white/10 bg-[#101c2c] p-10 text-center">

            <p className="font-bold text-slate-400">
              Düello odası yükleniyor...
            </p>

          </div>

        </div>

      </main>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (
    error ||
    !duel
  ) {
    return (
      <main className="min-h-screen bg-[#07111f] text-white">

        <div className="mx-auto max-w-[1120px] px-5 py-10">

          <Link
            href="/duels"
            className="inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/5"
          >
            ← Düellolara Dön
          </Link>

          <div className="mt-8 rounded-3xl border border-red-500/20 bg-red-500/10 p-10 text-center">

            <div className="text-5xl">
              ⚠️
            </div>

            <h1 className="mt-5 text-3xl font-black">
              Düello açılamadı
            </h1>

            <p className="mt-3 text-red-200">
              {error}
            </p>

          </div>

        </div>

      </main>
    );
  }

  const gameLabel =
    getGameLabel(
      duel,
    );

  const isClubClash =
    duel.gameCode ===
    "club_clash";

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#07111f] text-white">

      <div className="mx-auto max-w-[1120px] px-5 py-8 sm:px-6">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <Link
              href="/duels"
              className="inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/5"
            >
              ← Düellolara Dön
            </Link>

            <p className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-purple-400">
              FootBattle Arena
            </p>

            <h1 className="mt-2 text-4xl font-black">
              {gameLabel}
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Düello #
              {duel.id}
              {" • "}
              İlk 3 puana ulaşan kazanır
            </p>

          </div>

          <div className="flex flex-wrap items-center gap-3">

            {duel.status ===
              "active" && (
              <button
                type="button"
                disabled={
                  forfeitLoading
                }
                onClick={() =>
                  void forfeitDuel()
                }
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
              >
                {forfeitLoading
                  ? "Pes ediliyor..."
                  : "🏳️ Pes Et"}
              </button>
            )}

            <div
              className={`rounded-2xl border px-5 py-4 ${
                duel.status ===
                "active"
                  ? "border-green-500/20 bg-green-500/10"
                  : duel.status ===
                      "completed"
                    ? "border-yellow-400/20 bg-yellow-400/10"
                    : "border-purple-500/20 bg-purple-500/10"
              }`}
            >

              <p
                className={`text-xs font-black uppercase tracking-widest ${
                  duel.status ===
                  "active"
                    ? "text-green-300"
                    : duel.status ===
                        "completed"
                      ? "text-yellow-300"
                      : "text-purple-300"
                }`}
              >
                Durum
              </p>

              <p className="mt-1 text-xl font-black">
                {getStatusLabel(
                  duel.status,
                )}
              </p>

            </div>

          </div>

        </header>

        {/* =================================================
            SCOREBOARD
        ================================================= */}

        <section className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-[#101c2c]">

          <div className="grid gap-px bg-white/10 md:grid-cols-[1fr_auto_1fr]">

            <PlayerPanel
              title="Sen"
              player={
                myPlayer
              }
              score={
                duel.myScore
              }
            />

            <div className="flex flex-col items-center justify-center bg-[#0b1726] px-8 py-7">

              <span className="text-xs font-black uppercase tracking-[0.25em] text-slate-600">
                Düello
              </span>

              <span className="mt-2 text-3xl font-black text-purple-400">
                VS
              </span>

              <span className="mt-2 text-xs text-slate-500">
                İlk 3
              </span>

            </div>

            <PlayerPanel
              title="Rakip"
              player={
                rivalPlayer
              }
              score={
                duel.opponentScore
              }
            />

          </div>

        </section>

        {/* =================================================
            INFO
        ================================================= */}

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <InfoCard
            label="Oyun"
            value={
              gameLabel
            }
          />

          <InfoCard
            label="Kabul"
            value={formatDateTime(
              duel.acceptedAt,
            )}
          />

          <InfoCard
            label="Başlangıç"
            value={formatDateTime(
              duel.startedAt,
            )}
          />

          <InfoCard
            label="Durum"
            value={getStatusLabel(
              duel.status,
            )}
          />

        </section>

        {/* =================================================
            FORFEIT MESSAGE
        ================================================= */}

        {forfeitMessage && (
          <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
            {forfeitMessage}
          </div>
        )}

        {/* =================================================
            FINAL RESULT
        ================================================= */}

        {gameCompleted && (
          <section
            className={`mt-8 rounded-3xl border p-8 text-center ${
              didIWin
                ? "border-green-500/30 bg-green-500/[0.08]"
                : didILose
                  ? "border-red-500/30 bg-red-500/[0.08]"
                  : "border-yellow-400/30 bg-yellow-400/[0.08]"
            }`}
          >

            <div className="text-6xl">
              {didIWin
                ? "🏆"
                : didILose
                  ? "😤"
                  : "🤝"}
            </div>

            <p className="mt-5 text-xs font-black uppercase tracking-[0.25em] text-slate-500">
              Düello Tamamlandı
            </p>

            <h2
              className={`mt-2 text-4xl font-black ${
                didIWin
                  ? "text-green-400"
                  : didILose
                    ? "text-red-300"
                    : "text-yellow-300"
              }`}
            >
              {didIWin
                ? "Kazandın!"
                : didILose
                  ? "Kaybettin!"
                  : "Berabere"}
            </h2>

            <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-6">

              <div className="text-center">

                <p className="text-sm font-black">
                  {myPlayer?.displayName ??
                    "Sen"}
                </p>

                <p className="mt-2 text-5xl font-black text-green-400">
                  {duel.myScore}
                </p>

              </div>

              <div className="text-2xl font-black text-slate-600">
                -
              </div>

              <div className="text-center">

                <p className="text-sm font-black">
                  {rivalPlayer?.displayName ??
                    "Rakip"}
                </p>

                <p className="mt-2 text-5xl font-black text-purple-300">
                  {duel.opponentScore}
                </p>

              </div>

            </div>

            <p className="mx-auto mt-6 max-w-lg text-sm leading-6 text-slate-400">

              {didIWin
                ? "Rakibinden önce 3 puana ulaştın ve düelloyu kazandın."
                : didILose
                  ? "Rakibin düelloyu kazandı. Rövanşta görüşürüz."
                  : "Düello tamamlandı."}

            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3">

              <Link
                href={
                  rivalPlayer?.username
                    ? `/duels/challenge?opponent=${encodeURIComponent(
                        rivalPlayer.username,
                      )}&game=club_clash`
                    : "/duels/challenge?game=club_clash"
                }
                className="rounded-xl bg-purple-500 px-6 py-3 text-sm font-black text-white transition hover:bg-purple-400"
              >
                ⚔️ Rövanş Gönder
              </Link>

              <Link
                href="/duels"
                className="rounded-xl border border-white/10 px-6 py-3 text-sm font-black text-slate-300 transition hover:bg-white/[0.04]"
              >
                Düellolarım
              </Link>

              <Link
                href="/"
                className="rounded-xl border border-white/10 px-6 py-3 text-sm font-black text-slate-300 transition hover:bg-white/[0.04]"
              >
                Ana Sayfa
              </Link>

            </div>

          </section>
        )}

        {/* =================================================
            GAME AREA
        ================================================= */}

        {!gameCompleted && (
          <section className="mt-8 rounded-3xl border border-purple-500/20 bg-purple-500/[0.05] p-6 sm:p-8">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="text-sm font-black uppercase tracking-[0.2em] text-purple-400">
                  Oyun Alanı
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  {gameLabel}
                </h2>

                {isClubClash && (
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                    Her turda iki takım gösterilir.
                    Bu iki takımda da forma giymiş
                    futbolcuyu rakibinden önce bul.
                    İlk 3 puana ulaşan düelloyu kazanır.
                  </p>
                )}

              </div>

              {duel.status ===
              "active" ? (
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm font-black text-green-300">

                  <span className="h-2 w-2 rounded-full bg-green-400" />

                  Oyun aktif

                </span>
              ) : (
                <span className="inline-flex w-fit rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-sm font-black text-yellow-300">
                  Oyun başlamayı bekliyor
                </span>
              )}

            </div>

            {/* =============================================
                CLUB CLASH
            ============================================= */}

            {isClubClash && (
              <div className="mt-6">

                {clubClashLoading ? (
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-8 text-center text-sm font-bold text-slate-500">
                    Round bilgileri yükleniyor...
                  </div>
                ) : clubClashError ? (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-sm font-bold text-red-300">
                    {clubClashError}
                  </div>
                ) : roundCount ===
                  0 ? (
                  <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-6 text-center">

                    <p className="font-black text-yellow-300">
                      Roundlar henüz hazırlanmadı.
                    </p>

                  </div>
                ) : !currentRound ? (
                  <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-8 text-center">

                    <p className="font-black text-yellow-300">
                      Round güncelleniyor...
                    </p>

                  </div>
                ) : (
                  <div className="rounded-3xl border border-purple-400/20 bg-black/10 p-6 sm:p-8">

                    {/* ROUND HEADER */}

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                      <div>

                        <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">
                          Aktif Round
                        </p>

                        <h3 className="mt-1 text-2xl font-black">
                          Round{" "}
                          {currentRoundNumber}
                          {" / "}
                          {roundCount}
                        </h3>

                      </div>

                      <div className="rounded-xl border border-white/10 bg-[#101c2c] px-4 py-2 text-sm font-black text-slate-300">
                        ⚽ 2 Takım 1 Oyuncu
                      </div>

                    </div>

                    {/* CLUBS */}

                    <div className="mt-7 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">

                      <ClubBox
                        label="Takım 1"
                        club={
                          currentRound.club_a
                        }
                      />

                      <div className="text-center text-3xl font-black text-purple-400">
                        +
                      </div>

                      <ClubBox
                        label="Takım 2"
                        club={
                          currentRound.club_b
                        }
                      />

                    </div>

                    <p className="mt-6 text-center text-sm font-bold text-slate-400">
                      Bu iki takımda da oynamış bir futbolcu bul.
                    </p>

                    {/* ANSWER */}

                    <div className="relative mx-auto mt-6 max-w-2xl">

                      <div className="relative">

                        <input
                          ref={
                            answerInputRef
                          }
                          type="text"
                          value={
                            playerAnswer
                          }
                          onChange={(
                            event,
                          ) =>
                            handleAnswerChange(
                              event.target
                                .value,
                            )
                          }
                          onKeyDown={
                            handleAnswerKeyDown
                          }
                          onFocus={() => {
                            if (
                              searchResults.length >
                              0
                            ) {
                              setSearchOpen(
                                true,
                              );
                            }
                          }}
                          disabled={
                            answerLoading ||
                            duel.status !==
                              "active"
                          }
                          placeholder="Futbolcu adı veya soyadı yaz..."
                          autoComplete="off"
                          className="w-full rounded-xl border border-white/10 bg-[#0c1929] px-4 py-4 pr-12 text-white outline-none transition placeholder:text-slate-600 focus:border-purple-400/60 disabled:opacity-50"
                        />

                        {searchLoading && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                            ...
                          </div>
                        )}

                      </div>

                      {/* AUTOCOMPLETE */}

                      {searchOpen &&
                        searchResults.length >
                          0 && (
                          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-white/10 bg-[#101c2c] shadow-2xl">

                            {searchResults.map(
                              (
                                player,
                                index,
                              ) => {
                                const active =
                                  index ===
                                  highlightedIndex;

                                return (
                                  <button
                                    key={
                                      player.playerId
                                    }
                                    type="button"
                                    onMouseDown={(
                                      event,
                                    ) => {
                                      event.preventDefault();

                                      selectPlayer(
                                        player,
                                      );
                                    }}
                                    className={`flex w-full items-center justify-between gap-4 border-b border-white/5 px-4 py-3 text-left transition last:border-b-0 ${
                                      active
                                        ? "bg-purple-500/20"
                                        : "hover:bg-white/5"
                                    }`}
                                  >

                                    <div className="min-w-0">

                                      <p className="truncate font-black text-white">
                                        {player.name}
                                      </p>

                                      {player.currentClubName && (
                                        <p className="mt-0.5 truncate text-xs text-slate-500">
                                          {
                                            player.currentClubName
                                          }
                                        </p>
                                      )}

                                    </div>

                                    {active && (
                                      <span className="text-xs font-black text-purple-300">
                                        ENTER
                                      </span>
                                    )}

                                  </button>
                                );
                              },
                            )}

                          </div>
                        )}

                      {/* SELECTED */}

                      {selectedPlayer && (
                        <div className="mt-2 flex items-center justify-between rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2">

                          <p className="text-xs font-bold text-green-300">
                            Seçildi:{" "}
                            {selectedPlayer.name}
                          </p>

                          <button
                            type="button"
                            onClick={() => {
                              resetAnswerField();

                              setAnswerMessage(
                                "",
                              );

                              setAnswerCorrect(
                                null,
                              );

                              focusAnswerInput();
                            }}
                            className="text-xs font-black text-slate-400 hover:text-white"
                          >
                            ×
                          </button>

                        </div>
                      )}

                      {/* SUBMIT */}

                      <button
                        type="button"
                        disabled={
                          answerLoading ||
                          !playerAnswer.trim() ||
                          duel.status !==
                            "active"
                        }
                        onClick={() =>
                          void submitAnswer()
                        }
                        className="mt-3 w-full rounded-xl bg-green-500 px-5 py-4 font-black text-[#07111f] transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {answerLoading
                          ? "Kontrol ediliyor..."
                          : "Cevabı Gönder"}
                      </button>

                      <p className="mt-3 text-center text-xs text-slate-600">
                        3 harften sonra oyuncu araması başlar.
                        Listeden seçebilir veya tam soyadı yazıp
                        Enter&apos;a basabilirsin.
                      </p>

                      {/* MESSAGE */}

                      {answerMessage && (
                        <div
                          className={`mt-4 rounded-xl border px-4 py-3 text-center text-sm font-black ${
                            answerCorrect ===
                            true
                              ? "border-green-500/20 bg-green-500/10 text-green-300"
                              : "border-red-500/20 bg-red-500/10 text-red-300"
                          }`}
                        >
                          {answerMessage}
                        </div>
                      )}

                    </div>

                    {/* ROUND PROGRESS */}

                    <div className="mt-7 grid grid-cols-5 gap-2">

                      {(
                        clubClash?.rounds ??
                        []
                      ).map(
                        (round) => {
                          const completed =
                            Boolean(
                              round.completed_at,
                            );

                          const active =
                            round.id ===
                            currentRound.id;

                          return (
                            <div
                              key={
                                round.id
                              }
                              className={`rounded-xl border px-2 py-3 text-center ${
                                completed
                                  ? "border-green-500/20 bg-green-500/10"
                                  : active
                                    ? "border-purple-500/40 bg-purple-500/15"
                                    : "border-white/10 bg-white/[0.03]"
                              }`}
                            >

                              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                R
                                {
                                  round.round_no
                                }
                              </p>

                              <p className="mt-1 text-sm font-black">
                                {completed
                                  ? "✓"
                                  : active
                                    ? "●"
                                    : "—"}
                              </p>

                            </div>
                          );
                        },
                      )}

                    </div>

                  </div>
                )}

              </div>
            )}

          </section>
        )}

        {/* =================================================
            PLAYER CARDS
        ================================================= */}

        <section className="mt-8 grid gap-4 md:grid-cols-2">

          <PlayerInfoCard
            label="Meydan Okuyan"
            player={
              duel.challenger
            }
          />

          <PlayerInfoCard
            label="Rakip"
            player={
              duel.opponent
            }
          />

        </section>

      </div>

    </main>
  );
}

/* =========================================================
   CLUB BOX
========================================================= */

function ClubBox({
  label,
  club,
}: {
  label: string;
  club: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#101c2c] p-6 text-center">

      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>

      <div className="mx-auto mt-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-black/20 text-3xl">
        ⚽
      </div>

      <p className="mt-4 text-xl font-black">
        {club}
      </p>

    </div>
  );
}

/* =========================================================
   PLAYER PANEL
========================================================= */

function PlayerPanel({
  title,
  player,
  score,
}: {
  title: string;
  player: DuelPlayer | null;
  score: number;
}) {
  return (
    <div className="bg-[#101c2c] p-6">

      <div className="flex items-center gap-4">

        <div className="relative">

          <PlayerAvatar
            player={
              player
            }
            size="large"
          />

          <span
            className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#101c2c] ${
              player?.online
                ? "bg-green-400"
                : "bg-slate-600"
            }`}
          />

        </div>

        <div className="min-w-0">

          <p className="text-xs font-black uppercase tracking-widest text-slate-600">
            {title}
          </p>

          <p className="mt-1 truncate text-xl font-black">
            {player?.displayName ??
              "Oyuncu"}
          </p>

          {player?.username && (
            <Link
              href={`/u/${player.username}`}
              className="mt-1 block text-sm font-bold text-green-400 transition hover:text-green-300"
            >
              @{player.username}
            </Link>
          )}

          <p
            className={`mt-2 text-xs font-bold ${
              player?.online
                ? "text-green-300"
                : "text-slate-500"
            }`}
          >
            {player?.lastSeenText ??
              "Çevrimdışı"}
          </p>

        </div>

      </div>

      <div className="mt-6 border-t border-white/10 pt-5">

        <p className="text-xs font-black uppercase tracking-wider text-slate-600">
          Skor
        </p>

        <p className="mt-1 text-5xl font-black text-yellow-300">
          {score}
        </p>

      </div>

    </div>
  );
}

/* =========================================================
   PLAYER INFO CARD
========================================================= */

function PlayerInfoCard({
  label,
  player,
}: {
  label: string;
  player: DuelPlayer | null;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#101c2c] p-5">

      <p className="text-xs font-black uppercase tracking-wider text-purple-400">
        {label}
      </p>

      <div className="mt-4 flex items-center gap-4">

        <PlayerAvatar
          player={
            player
          }
        />

        <div className="min-w-0">

          <p className="truncate font-black">
            {player?.displayName ??
              "Oyuncu"}
          </p>

          {player?.username && (
            <Link
              href={`/u/${player.username}`}
              className="text-sm font-bold text-green-400"
            >
              @{player.username}
            </Link>
          )}

        </div>

      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">

        <MiniStat
          label="Puan"
          value={
            player?.totalScore ??
            0
          }
        />

        <MiniStat
          label="Oyun"
          value={
            player?.gamesPlayed ??
            0
          }
        />

        <MiniStat
          label="Seri"
          value={
            player?.currentStreak ??
            0
          }
        />

      </div>

    </div>
  );
}

/* =========================================================
   AVATAR
========================================================= */

function PlayerAvatar({
  player,
  size = "normal",
}: {
  player: DuelPlayer | null;

  size?:
    | "normal"
    | "large";
}) {
  const sizeClass =
    size === "large"
      ? "h-20 w-20 rounded-3xl text-2xl"
      : "h-12 w-12 rounded-xl text-sm";

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-green-500 font-black text-[#07111f] ${sizeClass}`}
    >
      {player?.avatarUrl ? (
        <img
          src={
            player.avatarUrl
          }
          alt={
            player.displayName
          }
          className="h-full w-full object-cover"
        />
      ) : (
        getInitials(
          player,
        )
      )}
    </div>
  );
}

/* =========================================================
   INFO CARD
========================================================= */

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#101c2c] p-5">

      <p className="text-xs font-black uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p className="mt-2 font-black text-slate-300">
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   MINI STAT
========================================================= */

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-black/20 p-3 text-center">

      <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p className="mt-1 font-black">
        {value}
      </p>

    </div>
  );
}