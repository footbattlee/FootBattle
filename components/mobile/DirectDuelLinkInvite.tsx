"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type GameCode = "tic_tac_toe" | "club_clash" | "club_nation";

type CreateResponse = {
  ok?: boolean;
  error?: string;
  challenge?: { shareUrl?: string; sharePath?: string };
};

const GAME_LABEL: Record<GameCode, string> = {
  tic_tac_toe: "Futbol Tic Tac Toe",
  club_clash: "2 Takım 1 Oyuncu",
  club_nation: "1 Takım 1 Millet",
};

export default function DirectDuelLinkInvite() {
  const pathname = usePathname();
  const router = useRouter();
  const startedRef = useRef(false);
  const [gameCode, setGameCode] = useState<GameCode | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let nextGameCode: GameCode | null = null;
    if (pathname === "/tic-tac-toe/duel") nextGameCode = "tic_tac_toe";
    else if (pathname === "/duels/challenge") {
      const game = new URLSearchParams(window.location.search).get("game");
      if (game === "club_clash" || game === "club_nation") nextGameCode = game;
    }
    startedRef.current = false;
    setError("");
    setGameCode(nextGameCode);
  }, [pathname]);

  useEffect(() => {
    if (!gameCode || startedRef.current) return;
    const activeGameCode: GameCode = gameCode;
    startedRef.current = true;

    async function createAndShare() {
      try {
        setError("");
        const response = await fetch("/api/challenges/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameCode: activeGameCode }),
        });
        const result = (await response.json()) as CreateResponse;
        if (!response.ok || !result.ok || !result.challenge?.shareUrl || !result.challenge.sharePath) {
          throw new Error(result.error ?? "Düello linki oluşturulamadı.");
        }

        const shareUrl = result.challenge.shareUrl;
        const sharePath = result.challenge.sharePath;
        const gameLabel = GAME_LABEL[activeGameCode];
        const shareText = `⚔️ FootBattle'da ${gameLabel} düellosuna davetlisin!`;
        const clipboardText = `${shareText}\n${shareUrl}`;

        if (navigator.share) {
          try {
            await navigator.share({ title: `${gameLabel} · FootBattle`, text: shareText, url: shareUrl });
          } catch (shareError) {
            if (!(shareError instanceof DOMException && shareError.name === "AbortError")) {
              try { await navigator.clipboard.writeText(clipboardText); } catch { /* challenge sayfasına devam et */ }
            }
          }
        } else {
          await navigator.clipboard.writeText(clipboardText);
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
        {error ? <>
          <p className="text-lg font-black text-red-300">Link oluşturulamadı</p>
          <p className="mt-2 text-sm text-slate-400">{error}</p>
          <button type="button" onClick={() => { startedRef.current = false; setError(""); const retry = gameCode; setGameCode(null); window.setTimeout(() => setGameCode(retry), 0); }} className="mt-5 min-h-12 w-full rounded-xl bg-green-500 font-black text-[#07111f]">Tekrar Dene</button>
        </> : <>
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-white/10 border-t-green-400" />
          <p className="mt-5 text-lg font-black">Davet linki hazırlanıyor...</p>
          <p className="mt-2 text-sm text-slate-500">Birazdan paylaşım ekranı otomatik açılacak.</p>
        </>}
      </div>
    </div>
  );
}
