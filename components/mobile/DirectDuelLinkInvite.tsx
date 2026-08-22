"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type GameCode = "tic_tac_toe" | "club_clash";

type CreateResponse = {
  ok?: boolean;
  error?: string;
  challenge?: {
    shareUrl?: string;
    sharePath?: string;
  };
};

const GAME_LABEL: Record<GameCode, string> = {
  tic_tac_toe: "Futbol Tic Tac Toe",
  club_clash: "2 Takım 1 Oyuncu",
};

export default function DirectDuelLinkInvite() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const startedRef = useRef(false);
  const [error, setError] = useState("");

  const gameCode = useMemo<GameCode | null>(() => {
    if (pathname === "/tic-tac-toe/duel") return "tic_tac_toe";
    if (pathname === "/duels/challenge" && searchParams.get("game") === "club_clash") return "club_clash";
    return null;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!gameCode || startedRef.current) return;
    startedRef.current = true;

    async function createAndShare() {
      try {
        setError("");
        const response = await fetch("/api/challenges/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameCode }),
        });
        const result = (await response.json()) as CreateResponse;
        if (!response.ok || !result.ok || !result.challenge?.shareUrl || !result.challenge.sharePath) {
          throw new Error(result.error ?? "Düello linki oluşturulamadı.");
        }

        const shareUrl = result.challenge.shareUrl;
        const sharePath = result.challenge.sharePath;
        const text = `⚔️ FootBattle'da ${GAME_LABEL[gameCode]} düellosuna davetlisin!\n${shareUrl}`;

        if (navigator.share) {
          try {
            await navigator.share({
              title: `${GAME_LABEL[gameCode]} · FootBattle`,
              text,
              url: shareUrl,
            });
          } catch (shareError) {
            if (!(shareError instanceof DOMException && shareError.name === "AbortError")) {
              try { await navigator.clipboard.writeText(text); } catch { /* paylaşım ekranı yeterli */ }
            }
          }
        } else {
          await navigator.clipboard.writeText(text);
        }

        router.replace(sharePath);
      } catch (reason) {
        startedRef.current = false;
        setError(reason instanceof Error ? reason.message : "Düello linki oluşturulamadı.");
      }
    }

    void createAndShare();
  }, [gameCode, router]);

  if (!gameCode) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#07111f] px-5 text-white">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#101c2c] p-6 text-center shadow-2xl">
        {error ? (
          <>
            <p className="text-lg font-black text-red-300">Link oluşturulamadı</p>
            <p className="mt-2 text-sm text-slate-400">{error}</p>
            <button
              type="button"
              onClick={() => { startedRef.current = false; setError(""); router.refresh(); }}
              className="mt-5 min-h-12 w-full rounded-xl bg-green-500 font-black text-[#07111f]"
            >
              Tekrar Dene
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-white/10 border-t-green-400" />
            <p className="mt-5 text-lg font-black">Davet linki hazırlanıyor...</p>
            <p className="mt-2 text-sm text-slate-500">Birazdan paylaşım ekranı otomatik açılacak.</p>
          </>
        )}
      </div>
    </div>
  );
}
