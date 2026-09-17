"use client";

import { useEffect, useState } from "react";
import UnifiedHomePage from "@/components/UnifiedHomePage";
import type { Locale } from "@/lib/i18n/config";

type DesktopMenuItem = { icon: string; labelTr: string; labelEn: string; href: string };

const gameMenuItems: DesktopMenuItem[] = [
  { icon: "🟩", labelTr: "Wordle", labelEn: "Wordle", href: "/wordle" },
  { icon: "🕵️", labelTr: "Guess The Player", labelEn: "Guess The Player", href: "/guess-the-player" },
  { icon: "🧠", labelTr: "Player Quiz", labelEn: "Player Quiz", href: "/player-quiz" },
  { icon: "⭕", labelTr: "Futbol Tic Tac Toe", labelEn: "Football Tic Tac Toe", href: "/tic-tac-toe" },
  { icon: "⚔️", labelTr: "2 Takım 1 Oyuncu", labelEn: "2 Clubs 1 Player", href: "/club-clash" },
  { icon: "🌍", labelTr: "1 Takım 1 Millet", labelEn: "1 Club 1 Nation", href: "/club-nation" },
  { icon: "🛣️", labelTr: "Career Path", labelEn: "Career Path", href: "/career-path" },
  { icon: "⚽", labelTr: "Penaltı", labelEn: "Penalty Challenge", href: "/penalty" },
];

const competitionMenuItems: DesktopMenuItem[] = [
  { icon: "🇹🇷", labelTr: "Süper Lig", labelEn: "Turkish Süper Lig", href: "/super-lig" },
  { icon: "⭐", labelTr: "Şampiyonlar Ligi", labelEn: "Champions League", href: "/champions-league" },
  { icon: "🏴", labelTr: "Premier League", labelEn: "Premier League", href: "/premier-league" },
  { icon: "🟠", labelTr: "Avrupa Ligi", labelEn: "Europa League", href: "/europa-league" },
  { icon: "🟢", labelTr: "Konferans Ligi", labelEn: "Conference League", href: "/conference-league" },
];

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
    const localizedHref = (href: string) => `/${locale}${href}`;

    const makeDropdown = (label: string, items: DesktopMenuItem[], allLabel: string, allHref: string) => {
      const wrapper = document.createElement("div");
      wrapper.className = "relative";
      wrapper.dataset.desktopDropdown = "true";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "flex items-center gap-1.5 py-3 font-bold text-slate-400 transition hover:text-white";
      button.innerHTML = `${label}<span class="text-[10px]">⌄</span>`;
      button.setAttribute("aria-expanded", "false");

      const panel = document.createElement("div");
      panel.className = "invisible absolute left-1/2 top-full z-[100] mt-1 w-72 -translate-x-1/2 translate-y-2 rounded-2xl border border-white/10 bg-[#0b1626]/[0.98] p-2 opacity-0 shadow-2xl backdrop-blur-xl transition-all duration-150";

      items.forEach((item) => {
        const link = document.createElement("a");
        link.href = item.href.startsWith("/player-") || item.href.startsWith("/club-") || item.href === "/penalty" ? item.href : localizedHref(item.href);
        link.className = "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-emerald-400/10 hover:text-emerald-300";
        const icon = document.createElement("span");
        icon.className = "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-base";
        icon.textContent = item.icon;
        const text = document.createElement("span");
        text.textContent = locale === "tr" ? item.labelTr : item.labelEn;
        link.append(icon, text);
        panel.appendChild(link);
      });

      const divider = document.createElement("div");
      divider.className = "my-1 border-t border-white/10";
      panel.appendChild(divider);

      const allLink = document.createElement("a");
      allLink.href = allHref;
      allLink.className = "flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-yellow-300 transition hover:bg-yellow-400/10";
      allLink.innerHTML = `<span>${allLabel}</span><span>→</span>`;
      panel.appendChild(allLink);

      const open = () => {
        panel.classList.remove("invisible", "opacity-0", "translate-y-2");
        panel.classList.add("visible", "opacity-100", "translate-y-0");
        button.setAttribute("aria-expanded", "true");
      };
      const close = () => {
        panel.classList.add("invisible", "opacity-0", "translate-y-2");
        panel.classList.remove("visible", "opacity-100", "translate-y-0");
        button.setAttribute("aria-expanded", "false");
      };
      wrapper.addEventListener("mouseenter", open);
      wrapper.addEventListener("mouseleave", close);
      button.addEventListener("click", () => button.getAttribute("aria-expanded") === "true" ? close() : open());
      wrapper.append(button, panel);
      return wrapper;
    };

    const decorateDesktopParity = () => {
      const nav = document.querySelector("header nav");
      if (nav && !nav.querySelector('[data-desktop-dropdown="true"]')) {
        const gamesButton = Array.from(nav.children).find((child) => {
          const text = child.textContent?.trim().toLocaleLowerCase("tr-TR");
          return text === "oyunlar" || text === "games";
        });
        if (gamesButton) {
          const gamesDropdown = makeDropdown(
            locale === "tr" ? "Oyunlar" : "Games",
            gameMenuItems,
            locale === "tr" ? "Tüm oyunları gör" : "View all games",
            "#oyunlar",
          );
          nav.replaceChild(gamesDropdown, gamesButton);

          const rankedLink = document.createElement("a");
          rankedLink.href = rankedHref;
          rankedLink.dataset.desktopRankedNav = "true";
          rankedLink.className = "transition hover:text-yellow-300 text-yellow-300";
          rankedLink.textContent = "🏆 Ranked";
          gamesDropdown.after(rankedLink);

          const competitionsDropdown = makeDropdown(
            locale === "tr" ? "Turnuvalar" : "Competitions",
            competitionMenuItems,
            locale === "tr" ? "Tüm turnuvalar" : "All competitions",
            localizedHref("/competitions"),
          );
          rankedLink.after(competitionsDropdown);
        }
      }

      const gameSection = document.querySelector("#oyunlar");
      const firstCard = gameSection?.querySelector("article");
      if (firstCard && !gameSection?.querySelector('[data-desktop-shooter-card="true"]')) {
        const shooterCard = firstCard.cloneNode(true) as HTMLElement;
        shooterCard.dataset.desktopShooterCard = "true";
        const title = shooterCard.querySelector("h3");
        if (title) title.textContent = locale === "tr" ? "Penaltı" : "Penalty Challenge";
        const paragraphs = Array.from(shooterCard.querySelectorAll("p"));
        if (paragraphs[0]) paragraphs[0].textContent = locale === "tr" ? "Topu geri ve yana çek, hedefini belirle ve kaleciyi geç. 10 şutta en yüksek skoru yap." : "Pull the ball back and sideways, pick your target and beat the keeper. Score as high as you can in 10 shots.";
        const emoji = Array.from(shooterCard.querySelectorAll("span")).find((span) => span.textContent?.trim() === "🟩");
        if (emoji) emoji.textContent = "⚽";
        const modeBadge = Array.from(shooterCard.querySelectorAll("span")).find((span) => {
          const text = span.textContent?.trim().toLocaleLowerCase("tr-TR") ?? "";
          return text.includes("tek oyuncu") || text === "solo";
        });
        if (modeBadge) modeBadge.textContent = locale === "tr" ? "TEK OYUNCU" : "SOLO";
        const actionLinks = Array.from(shooterCard.querySelectorAll("a"));
        actionLinks.forEach((link, index) => {
          if (index === 0) { link.setAttribute("href", "/penalty"); link.textContent = locale === "tr" ? "Oyna" : "Play"; }
          else link.remove();
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
            ? "Futbol Tic Tac Toe artık Ranked Arena'da gerçek rakiplere karşı oynanabiliyor. ELO sıralamasında yüksel, arkadaşlarınla düello yap ve rekabetçi futbol bilgini kanıtla."
            : "Football Tic Tac Toe is now playable against real opponents in Ranked Arena. Climb the ELO rankings, challenge friends and prove your competitive football knowledge.";
        }
      });
    };

    decorateDesktopParity();
    const firstRetry = window.setTimeout(decorateDesktopParity, 50);
    const secondRetry = window.setTimeout(decorateDesktopParity, 300);
    return () => {
      window.clearTimeout(firstRetry);
      window.clearTimeout(secondRetry);
      document.querySelectorAll('[data-desktop-ranked-card="true"], [data-desktop-shooter-card="true"]').forEach((node) => node.remove());
    };
  }, [locale, showDesktopHome]);

  if (!showDesktopHome) return null;
  return <UnifiedHomePage locale={locale} />;
}
