"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Side = "challenger" | "opponent";
type ChallengeResponse = {
  ok?: boolean;
  role?: Side | "visitor";
  completed?: boolean;
  result?: "win" | "loss" | "draw" | null;
  challenge?: {
    gameCode?: string;
    status?: string;
    challenger?: { name?: string | null; score?: number };
    opponent?: { name?: string | null; score?: number } | null;
  };
};

export default function ClubNationResultUX() {
  const pathname = usePathname();
  const router = useRouter();
  const token = useMemo(() => pathname.match(/^\/challenge\/([a-zA-Z0-9]+)$/)?.[1] ?? null, [pathname]);
  const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);
  const [shareMessage, setShareMessage] = useState("");

  useEffect(() => {
    if (!token) { setChallenge(null); return; }
    const challengeToken = token;
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/challenges/${encodeURIComponent(challengeToken)}`, { cache: "no-store" });
        const result = await response.json() as ChallengeResponse;
        if (cancelled || !response.ok || !result.ok || result.challenge?.gameCode !== "club_nation") return;
        setChallenge(result);
      } catch { /* existing game UI handles errors */ }
    }

    void load();
    const id = window.setInterval(load, 1000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [token]);

  useEffect(() => {
    if (!challenge?.completed) return;

    const hideLegacyActions = () => {
      const all = Array.from(document.querySelectorAll<HTMLElement>("button,a,p,div"));
      for (const node of all) {
        const text = node.textContent?.trim() ?? "";
        if (text === "⚔️ Rövanş?" || /^FootBattle['’]?a Dön$/i.test(text) || /^Back to FootBattle$/i.test(text)) {
          const target = (text === "⚔️ Rövanş?" ? node.closest("div.rounded-2xl") : node) as HTMLElement | null;
          if (target) target.style.setProperty("display", "none", "important");
        }
      }
    };

    hideLegacyActions();
    const observer = new MutationObserver(hideLegacyActions);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [challenge?.completed]);

  async function fallbackCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setShareMessage("Sonuç bağlantısı panoya kopyalandı.");
    } catch {
      setShareMessage("Paylaşım açılamadı. Tekrar deneyebilirsin.");
    }
  }

  async function shareResult() {
    if (!token || !challenge) return;

    const cName = challenge.challenge?.challenger?.name ?? "Oyuncu 1";
    const oName = challenge.challenge?.opponent?.name ?? "Oyuncu 2";
    const cScore = Number(challenge.challenge?.challenger?.score ?? 0);
    const oScore = Number(challenge.challenge?.opponent?.score ?? 0);
    const title = challenge.result === "win" ? "Kazandım!" : challenge.result === "loss" ? "Bu kez rakip aldı." : "Berabere!";
    const text = `🌍 FootBattle 1 Takım 1 Millet düellosu: ${title}\n${cName} ${cScore} - ${oScore} ${oName}`;
    const url = `https://playfootbattle.com/challenge/${token}`;
    const fullText = `${text}\n${url}`;

    setShareMessage("");

    if (navigator.share) {
      try {
        await navigator.share({ title: "1 Takım 1 Millet · FootBattle", text, url });
        setShareMessage("Sonuç paylaşımı açıldı.");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    await fallbackCopy(fullText);
  }

  if (!token || !challenge?.completed || challenge.challenge?.gameCode !== "club_nation") return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(14px+env(safe-area-inset-bottom))] z-[80] mx-auto max-w-xl rounded-2xl border border-white/15 bg-[#101c2c]/95 p-2 shadow-2xl backdrop-blur-xl md:bottom-5">
      {shareMessage ? (
        <div className="mb-2 rounded-xl border border-green-400/20 bg-green-400/10 px-3 py-2 text-center text-xs font-bold text-green-100">
          {shareMessage}
        </div>
      ) : null}
      <button type="button" onClick={() => void shareResult()} className="min-h-12 w-full rounded-xl border border-green-400/30 bg-green-400/10 px-3 font-black text-green-200">↗ Sonucu Paylaş</button>
      <button type="button" onClick={() => router.push("/")} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-white/5 px-3 font-black text-white">⌂ Ana Sayfa</button>
    </div>
  );
}
