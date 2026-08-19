"use client";

import { useEffect } from "react";

function isHomePath(pathname: string) {
  return pathname === "/tr" || pathname === "/en" || pathname === "/tr/" || pathname === "/en/";
}

export default function HomeSuperLigAndMobileOrder() {
  useEffect(() => {
    if (!isHomePath(window.location.pathname)) return;

    const locale = window.location.pathname.startsWith("/en") ? "en" : "tr";
    const mobileQuery = window.matchMedia("(max-width: 1023px)");

    let leaderboard: HTMLElement | null = null;
    let originalLeaderboardParent: Node | null = null;
    let originalLeaderboardNextSibling: Node | null = null;
    let mobileLeaderboardSection: HTMLElement | null = null;

    function ensureSuperLigCard() {
      const gamesSection = document.getElementById("oyunlar");
      if (!gamesSection) return;
      if (gamesSection.querySelector('[data-home-super-lig-card="1"]')) return;

      const grids = Array.from(gamesSection.querySelectorAll("div.grid"));
      const gamesGrid = grids.find((grid) => grid.querySelector("article"));
      if (!gamesGrid) return;

      const card = document.createElement("article");
      card.setAttribute("data-home-super-lig-card", "1");
      card.className = "group relative flex min-h-[260px] flex-col overflow-hidden rounded-2xl border border-red-400/25 bg-red-500/[0.055] p-5 transition hover:-translate-y-1 hover:border-red-300/45";

      const href = `/${locale}/guess-the-player/super-lig`;
      const title = locale === "tr" ? "Süper Lig Guess The Player" : "Süper Lig Guess The Player";
      const description = locale === "tr"
        ? "Süper Lig'de oynayan veya geçmişte oynamış futbolcuyu ipuçlarından bul. Kolay, orta, zor ve karışık modları dene."
        : "Guess a player who plays or previously played in the Süper Lig. Try easy, medium, hard or mixed difficulty.";
      const playable = locale === "tr" ? "oynanabilir" : "playable";
      const solo = locale === "tr" ? "Tek Oyuncu" : "Solo";
      const play = locale === "tr" ? "Oyna" : "Play";

      card.innerHTML = `
        <div class="absolute right-4 top-4 rounded-full border border-yellow-300/25 bg-yellow-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-yellow-200">🔥 YENİ</div>
        <div class="flex items-start justify-between gap-3">
          <div class="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-2xl">🇹🇷</div>
          <div class="mr-16 flex flex-col items-end gap-2">
            <span class="rounded-full border border-green-500/15 bg-green-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-green-400">${playable}</span>
            <span class="rounded-full bg-white/[0.04] px-3 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500">${solo}</span>
          </div>
        </div>
        <h3 class="mt-5 text-xl font-black">${title}</h3>
        <p class="mt-3 flex-1 text-sm leading-6 text-slate-400">${description}</p>
        <div class="mt-6 flex flex-wrap gap-2">
          <a href="${href}" class="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-400">${play} →</a>
        </div>
      `;

      gamesGrid.prepend(card);
    }

    function ensureMobileOrder() {
      const gamesSection = document.getElementById("oyunlar");
      leaderboard = document.getElementById("liderlik");
      if (!gamesSection || !leaderboard) return;

      if (!originalLeaderboardParent) {
        originalLeaderboardParent = leaderboard.parentNode;
        originalLeaderboardNextSibling = leaderboard.nextSibling;
      }

      if (mobileQuery.matches) {
        if (!mobileLeaderboardSection) {
          mobileLeaderboardSection = document.createElement("section");
          mobileLeaderboardSection.setAttribute("data-mobile-leaderboard-section", "1");
          mobileLeaderboardSection.className = "border-t border-white/5 bg-[#081523]";

          const inner = document.createElement("div");
          inner.className = "mx-auto max-w-[1240px] px-5 py-8 lg:px-6";
          mobileLeaderboardSection.appendChild(inner);
        }

        const inner = mobileLeaderboardSection.firstElementChild as HTMLElement | null;
        if (inner && leaderboard.parentNode !== inner) inner.appendChild(leaderboard);

        if (mobileLeaderboardSection.parentNode !== gamesSection.parentNode || mobileLeaderboardSection.previousElementSibling !== gamesSection) {
          gamesSection.insertAdjacentElement("afterend", mobileLeaderboardSection);
        }
      } else if (originalLeaderboardParent && leaderboard.parentNode !== originalLeaderboardParent) {
        if (originalLeaderboardNextSibling && originalLeaderboardNextSibling.parentNode === originalLeaderboardParent) {
          originalLeaderboardParent.insertBefore(leaderboard, originalLeaderboardNextSibling);
        } else {
          originalLeaderboardParent.appendChild(leaderboard);
        }
        mobileLeaderboardSection?.remove();
      }
    }

    function apply() {
      ensureSuperLigCard();
      ensureMobileOrder();
    }

    const timer = window.setTimeout(apply, 50);
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    mobileQuery.addEventListener("change", apply);

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      mobileQuery.removeEventListener("change", apply);
      document.querySelector('[data-home-super-lig-card="1"]')?.remove();

      if (leaderboard && originalLeaderboardParent && leaderboard.parentNode !== originalLeaderboardParent) {
        if (originalLeaderboardNextSibling && originalLeaderboardNextSibling.parentNode === originalLeaderboardParent) {
          originalLeaderboardParent.insertBefore(leaderboard, originalLeaderboardNextSibling);
        } else {
          originalLeaderboardParent.appendChild(leaderboard);
        }
      }
      mobileLeaderboardSection?.remove();
    };
  }, []);

  return null;
}
