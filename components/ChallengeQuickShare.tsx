"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type GameConfig = {
  gameCode:
    | "club_clash"
    | "club_nation"
    | "player_quiz"
    | "career_path"
    | "guess_the_player"
    | "tic_tac_toe";
  label: string;
};

const GAME_BY_PATH: Record<string, GameConfig> = {
  "/club-clash": { gameCode: "club_clash", label: "2 Takım 1 Oyuncu" },
  "/club-nation": { gameCode: "club_nation", label: "1 Takım 1 Millet" },
  "/player-quiz": { gameCode: "player_quiz", label: "Player Quiz" },
  "/career-path": { gameCode: "career_path", label: "Career Path" },
  "/guess-the-player": { gameCode: "guess_the_player", label: "Guess the Player" },
  "/tic-tac-toe": { gameCode: "tic_tac_toe", label: "Futbol Tic Tac Toe" },
};

type ChallengeCreateResponse = {
  ok?: boolean;
  error?: string;
  challenge?: {
    shareUrl?: string;
    sharePath?: string;
  };
};

export default function ChallengeQuickShare() {
  const pathname = usePathname();
  const game = useMemo(() => GAME_BY_PATH[pathname] ?? null, [pathname]);
  const [name, setName] = useState("");
  const [loadingName, setLoadingName] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!game) return;

    let cancelled = false;

    async function loadName() {
      setLoadingName(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data } = await supabase
          .from("profiles")
          .select("display_name, username")
          .eq("id", user.id)
          .maybeSingle();

        if (!cancelled) {
          setName(
            String(data?.display_name ?? data?.username ?? "FootBattle Oyuncusu")
              .trim()
              .slice(0, 30),
          );
        }
      } catch {
        // Giriş bilgisi yüklenemezse challenge endpoint misafir olarak devam eder.
      } finally {
        if (!cancelled) setLoadingName(false);
      }
    }

    void loadName();

    return () => {
      cancelled = true;
    };
  }, [game]);

  if (!game) return null;

  async function createAndShareChallenge() {
    if (!game || creating) return;

    setCreating(true);
    setMessage("");

    try {
      let challengerName = name.trim();

      if (!challengerName) {
        const remembered = window.localStorage.getItem("footbattle_challenger_name") ?? "";
        const prompted = window.prompt("Meydan okumada görünecek adın?", remembered || "Misafir");
        if (prompted === null) return;
        challengerName = prompted.trim().replace(/\s+/g, " ").slice(0, 30);
        if (challengerName.length < 2) {
          setMessage("Ad en az 2 karakter olmalı.");
          return;
        }
        window.localStorage.setItem("footbattle_challenger_name", challengerName);
        setName(challengerName);
      }

      const response = await fetch("/api/challenges/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameCode: game.gameCode,
          challengerName,
        }),
      });

      const result = (await response.json()) as ChallengeCreateResponse;
      if (!response.ok || !result.ok || !result.challenge?.shareUrl) {
        throw new Error(result.error ?? "Meydan okuma linki oluşturulamadı.");
      }

      const shareUrl = result.challenge.shareUrl;
      const shareText =
        `⚔️ ${challengerName} sana FootBattle'da meydan okuyor!\n\n` +
        `🎮 ${game.label}\n` +
        `Beni geçebilir misin?\n\n` +
        `${shareUrl}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: `${game.label} · FootBattle Düello`,
            text: shareText,
            url: shareUrl,
          });
          setMessage("Meydan okuma paylaşılmaya hazır ✓");
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      }

      await navigator.clipboard.writeText(shareText);
      setMessage("Meydan okuma linki kopyalandı ✓");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Meydan okuma oluşturulamadı.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-3 z-[65] flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-2 sm:bottom-5 sm:right-5">
      {message && (
        <div className="pointer-events-auto rounded-xl border border-white/10 bg-[#081523]/95 px-3 py-2 text-xs font-bold text-slate-200 shadow-xl backdrop-blur-xl">
          {message}
        </div>
      )}

      <button
        type="button"
        onClick={createAndShareChallenge}
        disabled={creating || loadingName}
        className="pointer-events-auto inline-flex min-h-12 items-center gap-2 rounded-2xl border border-purple-400/25 bg-purple-500/95 px-4 text-sm font-black text-white shadow-2xl shadow-purple-950/30 transition hover:-translate-y-0.5 hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {creating ? "Link hazırlanıyor..." : "⚔️ Arkadaşına Meydan Oku"}
      </button>
    </div>
  );
}
