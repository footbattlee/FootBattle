"use client";

import { toPng } from "html-to-image";
import { useEffect } from "react";

declare global {
  interface Window {
    FootBattleAndroid?: {
      shareImage?: (title: string, text: string, url: string, dataUrl: string) => void;
      share?: (title: string, text: string, url: string) => void;
    };
  }
}

type ShareApiResponse = {
  ok?: boolean;
  sharePath?: string;
  error?: string;
};

type PlayerPosition = {
  x: number;
  y: number;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function buttonByExactText(text: string) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.textContent?.trim() === text,
  );
}

function setReactInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function findMainPitch() {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>("div.relative.mx-auto.aspect-\\[3\\/4\\].w-full"),
  ).filter((element) => element.querySelectorAll(".absolute.z-20").length >= 5);

  return (
    candidates
      .map((element) => ({
        element,
        area: element.getBoundingClientRect().width * element.getBoundingClientRect().height,
      }))
      .sort((a, b) => b.area - a.area)[0]?.element ?? null
  );
}

function getSquadName() {
  return (
    document.querySelector<HTMLInputElement>("input[placeholder='Kadro adı']")?.value.trim() ||
    "Halısaha Kadrosu"
  );
}

function getTactic() {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
  const active = buttons.find((button) => {
    const text = button.textContent?.trim();
    return (
      (text === "Dengeli" || text === "Hücum" || text === "Savunma") &&
      (button.className.includes("border-yellow-400") || button.className.includes("bg-yellow-400/15"))
    );
  });

  const label = active?.textContent?.trim();
  if (label === "Hücum") return "offensive" as const;
  if (label === "Savunma") return "defensive" as const;
  return "balanced" as const;
}

function getColors() {
  const colorInputs = Array.from(document.querySelectorAll<HTMLInputElement>("input[type='color']"));
  return {
    bodyColor: colorInputs[0]?.value || "#c8101e",
    sleeveColor: colorInputs[1]?.value || "#ffffff",
  };
}

function getPlayersAndPositions(pitch: HTMLElement) {
  const pitchRect = pitch.getBoundingClientRect();
  const nodes = Array.from(pitch.querySelectorAll<HTMLElement>(".absolute.z-20"));

  const players: string[] = [];
  const positions: PlayerPosition[] = [];

  nodes.forEach((node, index) => {
    const name =
      node.querySelector<HTMLElement>("div.mx-auto.mt-1")?.textContent?.trim() ||
      `Oyuncu ${index + 1}`;
    const rect = node.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    players.push(name);
    positions.push({
      x: clamp(((centerX - pitchRect.left) / pitchRect.width) * 100),
      y: clamp(((centerY - pitchRect.top) / pitchRect.height) * 100),
    });
  });

  return { players, positions };
}

async function createShareUrlFromLivePitch(pitch: HTMLElement) {
  const { players, positions } = getPlayersAndPositions(pitch);
  const { bodyColor, sleeveColor } = getColors();

  const response = await fetch("/api/halisaha-share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      squadName: getSquadName(),
      playerCount: players.length,
      players,
      bodyColor,
      sleeveColor,
      tactic: getTactic(),
      positions,
      drawings: [],
    }),
  });

  const result = (await response.json()) as ShareApiResponse;
  if (!response.ok || !result.ok || !result.sharePath) {
    throw new Error(result.error || "Paylaşım bağlantısı oluşturulamadı.");
  }

  return `${window.location.origin}${result.sharePath}`;
}

async function dataUrlToFile(dataUrl: string, fileName: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName, { type: "image/png" });
}

async function shareSquad(pitch: HTMLElement) {
  const dataUrl = await toPng(pitch, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#37a823",
  });

  const shareUrl = await createShareUrlFromLivePitch(pitch);
  const squadName = getSquadName();
  const title = `${squadName} | FootBattle`;
  const text = `Halısaha kadromu FootBattle ile oluşturdum! ⚽\n${shareUrl}`;

  // New Android shell: native chooser receives the real PNG + exactly one short link.
  if (window.FootBattleAndroid?.shareImage) {
    window.FootBattleAndroid.shareImage(
      title,
      "Halısaha kadromu FootBattle ile oluşturdum! ⚽",
      shareUrl,
      dataUrl,
    );
    return;
  }

  const file = await dataUrlToFile(dataUrl, "footbattle-halisaha-kadrosu.png");

  // iOS Safari: Web Share API with a real file attachment. Do NOT pass a separate
  // `url` field, otherwise some targets append the current page / create a second preview.
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share({ title, text, files: [file] });
    return;
  }

  // If file sharing is unsupported but the Android native text chooser exists, use it.
  if (window.FootBattleAndroid?.share) {
    window.FootBattleAndroid.share(
      title,
      "Halısaha kadromu FootBattle ile oluşturdum! ⚽",
      shareUrl,
    );
    return;
  }

  // Browser fallback: open the system share sheet with the short link only.
  if (navigator.share) {
    await navigator.share({ title, text });
    return;
  }

  await navigator.clipboard.writeText(text);
  window.alert("Bu cihaz doğrudan paylaşımı desteklemiyor. Bağlantı panoya kopyalandı.");
}

export default function HalisahaMobileEnhancer() {
  useEffect(() => {
    if (window.location.pathname !== "/halisaha-kadro") return;

    let cleanup: (() => void) | undefined;
    let retryTimer: number | undefined;

    const install = () => {
      if (window.innerWidth >= 1280) return;
      if (document.querySelector("[data-hal-mobile-actions='true']")) return;

      const pitch = findMainPitch();
      if (!pitch) {
        retryTimer = window.setTimeout(install, 300);
        return;
      }

      const pitchCard = pitch.parentElement;
      const content = pitchCard?.parentElement;
      const grid = content?.parentElement;
      const sidebar = grid?.querySelector<HTMLElement>(":scope > aside");
      if (!pitchCard || !content || !grid || !sidebar) {
        retryTimer = window.setTimeout(install, 300);
        return;
      }

      content.classList.add("order-1");
      sidebar.classList.add("order-2");
      pitch.style.touchAction = "none";

      const playerNodes = Array.from(pitch.querySelectorAll<HTMLElement>(".absolute.z-20"));
      playerNodes.forEach((node) => {
        node.style.touchAction = "none";
      });

      const shareCard = Array.from(content.children).find(
        (child) => child instanceof HTMLElement && child.textContent?.includes("Kadronu Paylaş"),
      ) as HTMLElement | undefined;
      if (shareCard) shareCard.style.display = "none";

      let shareBusy = false;
      const runShare = async () => {
        if (shareBusy) return;
        shareBusy = true;
        try {
          await shareSquad(pitch);
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
          console.error("Halısaha paylaşımı başarısız:", error);
          window.alert(error instanceof Error ? error.message : "Paylaşım hazırlanırken bir hata oluştu.");
        } finally {
          shareBusy = false;
        }
      };

      const actions = document.createElement("div");
      actions.dataset.halMobileActions = "true";
      actions.className = "mt-2 grid grid-cols-2 gap-2 xl:hidden";

      const shareButton = document.createElement("button");
      shareButton.type = "button";
      shareButton.className =
        "flex min-h-11 items-center justify-center rounded-xl bg-yellow-400 px-3 py-2.5 text-sm font-black text-[#07111f]";
      shareButton.textContent = "⚽ Paylaş";
      shareButton.addEventListener("click", () => void runShare());

      const downloadButton = document.createElement("button");
      downloadButton.type = "button";
      downloadButton.className =
        "flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-[#0d1828] px-3 py-2.5 text-sm font-black text-white";
      downloadButton.textContent = "↓ Görsel İndir";
      downloadButton.addEventListener("click", () => {
        buttonByExactText("Görseli İndir")?.click() ??
          buttonByExactText("Görseli İndir (PNG)")?.click();
      });

      actions.append(shareButton, downloadButton);
      pitchCard.insertAdjacentElement("afterend", actions);

      const header = grid.previousElementSibling as HTMLElement | null;
      const helpButton = header
        ? Array.from(header.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
            button.textContent?.includes("Nasıl Kullanılır?"),
          )
        : undefined;

      let helpButtonOriginalHtml = "";
      const interceptHeaderShare = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        void runShare();
      };

      if (helpButton) {
        helpButtonOriginalHtml = helpButton.innerHTML;
        helpButton.innerHTML = "⚽ Paylaş";
        helpButton.classList.add("!border-yellow-400/60", "!bg-yellow-400", "!text-[#07111f]");
        helpButton.addEventListener("click", interceptHeaderShare, true);
      }

      const pointerStarts = new Map<number, { x: number; y: number; player: HTMLElement }>();
      const onPointerDown = (event: PointerEvent) => {
        const target = event.target as HTMLElement | null;
        const player = target?.closest<HTMLElement>(".absolute.z-20");
        if (!player || !pitch.contains(player)) return;
        pointerStarts.set(event.pointerId, { x: event.clientX, y: event.clientY, player });
      };

      const onPointerUp = (event: PointerEvent) => {
        const start = pointerStarts.get(event.pointerId);
        pointerStarts.delete(event.pointerId);
        if (!start) return;
        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7) return;

        const currentNodes = Array.from(pitch.querySelectorAll<HTMLElement>(".absolute.z-20"));
        const index = currentNodes.indexOf(start.player);
        if (index < 0) return;

        const currentName =
          start.player.querySelector<HTMLElement>("div.mx-auto.mt-1")?.textContent?.trim() ?? "";
        const nextName = window.prompt("Oyuncu adını düzenle", currentName);
        if (nextName === null) return;

        const input = Array.from(
          document.querySelectorAll<HTMLInputElement>("input[placeholder^='Oyuncu ']"),
        )[index];
        if (input) setReactInputValue(input, nextName.trim());
      };

      const onPointerCancel = (event: PointerEvent) => pointerStarts.delete(event.pointerId);
      pitch.addEventListener("pointerdown", onPointerDown, true);
      pitch.addEventListener("pointerup", onPointerUp, true);
      pitch.addEventListener("pointercancel", onPointerCancel, true);

      if (header?.tagName === "HEADER") {
        header.classList.add("mb-3", "gap-2", "pb-3");
        header.querySelector("h1")?.classList.add("!text-2xl");
      }

      cleanup = () => {
        pitch.removeEventListener("pointerdown", onPointerDown, true);
        pitch.removeEventListener("pointerup", onPointerUp, true);
        pitch.removeEventListener("pointercancel", onPointerCancel, true);
        actions.remove();
        pitch.style.removeProperty("touch-action");
        playerNodes.forEach((node) => node.style.removeProperty("touch-action"));
        content.classList.remove("order-1");
        sidebar.classList.remove("order-2");
        if (shareCard) shareCard.style.removeProperty("display");
        if (helpButton) {
          helpButton.removeEventListener("click", interceptHeaderShare, true);
          helpButton.innerHTML = helpButtonOriginalHtml;
          helpButton.classList.remove("!border-yellow-400/60", "!bg-yellow-400", "!text-[#07111f]");
        }
      };
    };

    install();

    const onResize = () => {
      if (window.innerWidth >= 1280) {
        cleanup?.();
        cleanup = undefined;
      } else {
        install();
      }
    };

    window.addEventListener("resize", onResize);
    return () => {
      if (retryTimer) window.clearTimeout(retryTimer);
      window.removeEventListener("resize", onResize);
      cleanup?.();
    };
  }, []);

  return null;
}
