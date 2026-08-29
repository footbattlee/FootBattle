"use client";

import { useEffect, useState } from "react";
import UnifiedHomePage from "@/components/UnifiedHomePage";
import type { Locale } from "@/lib/i18n/config";

export default function DesktopHomeOnly({ locale }: { locale: Locale }) {
  const [showDesktopHome, setShowDesktopHome] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setShowDesktopHome(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!showDesktopHome) return;

    const rankedHref = `/${locale}/rank`;
    const duelsHref = `/${locale}/duels`;

    const decorateDesktopParity = () => {
      const nav = document.querySelector("header nav");
      if (nav && !nav.querySelector('[data-desktop-ranked-nav="true"]')) {
        const link = document.createElement("a");
        link.href = rankedHref;
        link.dataset.desktopRankedNav = "true";
        link.className = "transition hover:text-yellow-300 text-yellow-300";
        link.textContent = "🏆 Ranked";
        const gamesButton = Array.from(nav.children).find((child) => {
          const text = child.textContent?.trim().toLocaleLowerCase("tr-TR");
          return text === "oyunlar" || text === "games";
        });
        if (gamesButton?.nextSibling) nav.insertBefore(link, gamesButton.nextSibling);
        else nav.appendChild(link);
      }

      const gameSection = document.querySelector("#oyunlar");
      const firstCard = gameSection?.querySelector("article");
      if (firstCard && !gameSection?.querySelector('[data-desktop-shooter-card="true"]')) {
        const shooterCard = firstCard.cloneNode(true) as HTMLElement;
        shooterCard.dataset.desktopShooterCard = "true";

        const title = shooterCard.querySelector("h3");
        if (title) title.textContent = locale === "tr" ? "Şutör" : "Shot Challenge";

        const paragraphs = Array.from(shooterCard.querySelectorAll("p"));
        if (paragraphs[0]) {
          paragraphs[0].textContent = locale === "tr"
            ? "Topu geri ve yana çek, hedefini belirle ve kaleciyi geç. 10 şutta en yüksek skoru yap."
            : "Pull the ball back and sideways, pick your target and beat the keeper. Score as high as you can in 10 shots.";
        }

        const emoji = Array.from(shooterCard.querySelectorAll("span")).find((span) => span.textContent?.trim() === "🟩");
        if (emoji) emoji.textContent = "⚽";

        const modeBadge = Array.from(shooterCard.querySelectorAll("span")).find((span) => {
          const text = span.textContent?.trim().toLocaleLowerCase("tr-TR") ?? "";
          return text.includes("tek oyuncu") || text === "solo";
        });
        if (modeBadge) modeBadge.textContent = locale === "tr" ? "TEK OYUNCU" : "SOLO";

        const actionLinks = Array.from(shooterCard.querySelectorAll("a"));
        actionLinks.forEach((link, index) => {
          if (index === 0) {
            link.setAttribute("href", "/penalty");
            link.textContent = locale === "tr" ? "Oyna" : "Play";
          } else {
            link.remove();
          }
        });

        firstCard.parentElement?.insertBefore(shooterCard, firstCard);
      }

      const rankedGameTitles = new Set(["Futbol Tic Tac Toe", "Football Tic Tac Toe", "2 Takım 1 Oyuncu", "2 Clubs 1 Player"]);
      const unsupportedDuelTitles = new Set(["Player Quiz", "1 Takım 1 Millet", "1 Club 1 Nation"]);
      const clubClashTitles = new Set(["2 Takım 1 Oyuncu", "2 Clubs 1 Player"]);

      document.querySelectorAll("#oyunlar article").forEach((card) => {
        const title = card.querySelector("h3")?.textContent?.trim() ?? "";
        const actionLinks = Array.from(card.querySelectorAll("a"));
        const duelLinks = actionLinks.filter((link) => link.textContent?.includes("Düello") || link.textContent?.includes("Duel"));

        if (unsupportedDuelTitles.has(title)) {
          duelLinks.forEach((link) => link.remove());
          const modeBadge = Array.from(card.querySelectorAll("span")).find((span) => span.textContent?.includes("Düello") || span.textContent?.includes("Duel"));
          if (modeBadge) modeBadge.textContent = locale === "tr" ? "TEK OYUNCU" : "SOLO";
        }

        if (clubClashTitles.has(title)) duelLinks.forEach((link) => link.setAttribute("href", duelsHref));

        if (!rankedGameTitles.has(title) || card.querySelector('[data-desktop-ranked-card="true"]')) return;
        const actionRows = Array.from(card.querySelectorAll("div")).filter((node) => node.className.includes("flex") && node.className.includes("flex-wrap") && node.className.includes("gap-2"));
        const actions = actionRows[actionRows.length - 1];
        if (!actions) return;
        const link = document.createElement("a");
        link.href = rankedHref;
        link.dataset.desktopRankedCard = "true";
        link.className = "rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-2.5 text-sm font-black text-yellow-300 transition hover:bg-yellow-400/20";
        link.textContent = "🏆 Ranked";
        actions.appendChild(link);
      });

      document.querySelectorAll("p").forEach((node) => {
        const text = node.textContent ?? "";
        if (text.includes("Tic Tac Toe düello modu") || text.includes("Tic Tac Toe duel mode")) {
          node.textContent = locale === "tr"
            ? "Yeni rekabetçi oyun modları ve FootBattle özellikleri geliştirmeye devam ediyor."
            : "New competitive game modes and FootBattle features are continuing to grow.";
        }
      });
    };

    decorateDesktopParity();
    const firstRetry = window.setTimeout(decorateDesktopParity, 50);
    const secondRetry = window.setTimeout(decorateDesktopParity, 300);
    return () => {
      window.clearTimeout(firstRetry);
      window.clearTimeout(secondRetry);
      document.querySelectorAll('[data-desktop-ranked-nav="true"], [data-desktop-ranked-card="true"], [data-desktop-shooter-card="true"]').forEach((node) => node.remove());
    };
  }, [locale, showDesktopHome]);

  if (!showDesktopHome) return null;
  return <UnifiedHomePage locale={locale} />;
}
