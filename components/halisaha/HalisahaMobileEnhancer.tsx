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

type Position = { x: number; y: number };

function setReactInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function findMainPitch(): HTMLElement | null {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>("div.relative.mx-auto.aspect-\\[3\\/4\\].w-full"),
  );

  // The real editable pitch is the only large 3:4 field containing the draggable
  // player nodes (.absolute.z-20). Mini previews / share cards are deliberately excluded.
  const realPitch = candidates
    .filter((element) => element.querySelectorAll(".absolute.z-20").length >= 5)
    .filter((element) => !element.closest("[data-hal-mobile-actions='true']"))
    .sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return br.width * br.height - ar.width * ar.height;
    })[0];

  return realPitch ?? null;
}

function getLiveSnapshot(pitch: HTMLElement) {
  const playerNodes = Array.from(pitch.querySelectorAll<HTMLElement>(".absolute.z-20"));
  const pitchRect = pitch.getBoundingClientRect();
  const players: string[] = [];
  const positions: Position[] = [];

  for (const node of playerNodes) {
    const label = node.querySelector<HTMLElement>("div.mx-auto.mt-1");
    players.push(label?.textContent?.trim() || `Oyuncu ${players.length + 1}`);

    const nodeRect = node.getBoundingClientRect();
    const centerX = nodeRect.left + nodeRect.width / 2;
    const centerY = nodeRect.top + nodeRect.height / 2;
    positions.push({
      x: Math.max(0, Math.min(100, ((centerX - pitchRect.left) / pitchRect.width) * 100)),
      y: Math.max(0, Math.min(100, ((centerY - pitchRect.top) / pitchRect.height) * 100)),
    });
  }

  const squadName =
    document.querySelector<HTMLInputElement>("input[placeholder='Kadro adı']")?.value.trim() ||
    "Halısaha Kadrosu";

  const colorInputs = Array.from(document.querySelectorAll<HTMLInputElement>("input[type='color']"));
  const bodyColor = colorInputs.at(-2)?.value || "#c8101e";
  const sleeveColor = colorInputs.at(-1)?.value || "#ffffff";

  return { squadName, players, positions, bodyColor, sleeveColor };
}

async function createShareSnapshot(pitch: HTMLElement) {
  const live = getLiveSnapshot(pitch);
  const response = await fetch("/api/halisaha-share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      squadName: live.squadName,
      playerCount: live.players.length,
      players: live.players,
      bodyColor: live.bodyColor,
      sleeveColor: live.sleeveColor,
      tactic: "balanced",
      positions: live.positions,
      drawings: [],
    }),
  });

  const result = (await response.json()) as { ok?: boolean; sharePath?: string; error?: string };
  if (!response.ok || !result.ok || !result.sharePath) {
    throw new Error(result.error || "Paylaşım bağlantısı oluşturulamadı.");
  }

  return {
    url: `${window.location.origin}${result.sharePath}`,
    squadName: live.squadName,
  };
}

async function dataUrlToFile(dataUrl: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], "footbattle-halisaha-kadrosu.png", { type: "image/png" });
}

async function shareLivePitch(pitch: HTMLElement) {
  // Capture only the actual green pitch DOM. Never capture MiniPitchPreview or OG/share cards.
  const dataUrl = await toPng(pitch, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#37a823",
  });
  const { url, squadName } = await createShareSnapshot(pitch);
  const title = `${squadName} | FootBattle`;
  const text = `Halısaha kadromu FootBattle ile oluşturdum! ⚽\n${url}`;

  if (window.FootBattleAndroid?.shareImage) {
    window.FootBattleAndroid.shareImage(title, "Halısaha kadromu FootBattle ile oluşturdum! ⚽", url, dataUrl);
    return;
  }

  const file = await dataUrlToFile(dataUrl);
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share({ title, text, files: [file] });
    return;
  }

  if (window.FootBattleAndroid?.share) {
    window.FootBattleAndroid.share(title, "Halısaha kadromu FootBattle ile oluşturdum! ⚽", url);
    return;
  }

  if (navigator.share) {
    await navigator.share({ title, text });
    return;
  }

  await navigator.clipboard.writeText(text);
  window.alert("Paylaşım bağlantısı panoya kopyalandı.");
}

export default function HalisahaMobileEnhancer() {
  useEffect(() => {
    if (window.location.pathname !== "/halisaha-kadro" || window.innerWidth >= 1280) return;

    let cleanup: (() => void) | undefined;
    let timer: number | undefined;

    const install = () => {
      if (document.querySelector("[data-hal-mobile-actions='true']")) return;
      const pitch = findMainPitch();
      if (!pitch) {
        timer = window.setTimeout(install, 250);
        return;
      }

      const pitchCard = pitch.parentElement;
      const content = pitchCard?.parentElement;
      const grid = content?.parentElement;
      const sidebar = grid?.querySelector<HTMLElement>(":scope > aside");
      const header = grid?.previousElementSibling as HTMLElement | null;
      if (!pitchCard || !content || !grid || !sidebar) return;

      content.classList.add("order-1");
      sidebar.classList.add("order-2");
      pitch.style.touchAction = "none";
      pitch.querySelectorAll<HTMLElement>(".absolute.z-20").forEach((node) => {
        node.style.touchAction = "none";
      });

      const shareCard = Array.from(content.children).find(
        (node) => node instanceof HTMLElement && node.textContent?.includes("Kadronu Paylaş"),
      ) as HTMLElement | undefined;
      if (shareCard) shareCard.style.display = "none";

      let busy = false;
      const runShare = async () => {
        if (busy) return;
        busy = true;
        try {
          await shareLivePitch(pitch);
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
          console.error("Halısaha paylaşımı başarısız:", error);
          window.alert(error instanceof Error ? error.message : "Paylaşım hazırlanırken hata oluştu.");
        } finally {
          busy = false;
        }
      };

      const actions = document.createElement("div");
      actions.dataset.halMobileActions = "true";
      actions.className = "mt-2 grid grid-cols-2 gap-2 xl:hidden";
      actions.innerHTML = `
        <button type="button" data-action="share" class="flex min-h-11 items-center justify-center rounded-xl bg-yellow-400 px-3 py-2.5 text-sm font-black text-[#07111f]">⚽ Paylaş</button>
        <button type="button" data-action="download" class="flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-[#0d1828] px-3 py-2.5 text-sm font-black text-white">↓ Görsel İndir</button>`;
      actions.querySelector<HTMLButtonElement>("[data-action='share']")?.addEventListener("click", () => void runShare());
      actions.querySelector<HTMLButtonElement>("[data-action='download']")?.addEventListener("click", async () => {
        const dataUrl = await toPng(pitch, { cacheBust: true, pixelRatio: 2, backgroundColor: "#37a823" });
        const anchor = document.createElement("a");
        anchor.href = dataUrl;
        anchor.download = "footbattle-halisaha-kadrosu.png";
        anchor.click();
      });
      pitchCard.insertAdjacentElement("afterend", actions);

      const helpButton = header
        ? Array.from(header.querySelectorAll<HTMLButtonElement>("button")).find((button) => button.textContent?.includes("Nasıl Kullanılır?"))
        : undefined;
      const oldHelpHtml = helpButton?.innerHTML ?? "";
      const interceptShare = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        void runShare();
      };
      if (helpButton) {
        helpButton.innerHTML = "⚽ Paylaş";
        helpButton.classList.add("!border-yellow-400/60", "!bg-yellow-400", "!text-[#07111f]");
        helpButton.addEventListener("click", interceptShare, true);
      }

      const starts = new Map<number, { x: number; y: number; player: HTMLElement }>();
      const down = (event: PointerEvent) => {
        const player = (event.target as HTMLElement | null)?.closest<HTMLElement>(".absolute.z-20");
        if (player && pitch.contains(player)) starts.set(event.pointerId, { x: event.clientX, y: event.clientY, player });
      };
      const up = (event: PointerEvent) => {
        const start = starts.get(event.pointerId);
        starts.delete(event.pointerId);
        if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7) return;
        const nodes = Array.from(pitch.querySelectorAll<HTMLElement>(".absolute.z-20"));
        const index = nodes.indexOf(start.player);
        if (index < 0) return;
        const current = start.player.querySelector<HTMLElement>("div.mx-auto.mt-1")?.textContent?.trim() || "";
        const next = window.prompt("Oyuncu adını düzenle", current);
        if (next === null) return;
        const input = Array.from(document.querySelectorAll<HTMLInputElement>("input[placeholder^='Oyuncu ']"))[index];
        if (input) setReactInputValue(input, next.trim());
      };
      const cancel = (event: PointerEvent) => starts.delete(event.pointerId);
      pitch.addEventListener("pointerdown", down, true);
      pitch.addEventListener("pointerup", up, true);
      pitch.addEventListener("pointercancel", cancel, true);

      if (header?.tagName === "HEADER") {
        header.classList.add("mb-3", "gap-2", "pb-3");
        header.querySelector("h1")?.classList.add("!text-2xl");
      }

      cleanup = () => {
        pitch.removeEventListener("pointerdown", down, true);
        pitch.removeEventListener("pointerup", up, true);
        pitch.removeEventListener("pointercancel", cancel, true);
        actions.remove();
        content.classList.remove("order-1");
        sidebar.classList.remove("order-2");
        if (shareCard) shareCard.style.removeProperty("display");
        if (helpButton) {
          helpButton.removeEventListener("click", interceptShare, true);
          helpButton.innerHTML = oldHelpHtml;
          helpButton.classList.remove("!border-yellow-400/60", "!bg-yellow-400", "!text-[#07111f]");
        }
      };
    };

    install();
    return () => {
      if (timer) window.clearTimeout(timer);
      cleanup?.();
    };
  }, []);

  return null;
}
