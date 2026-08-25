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
  return (
    Array.from(document.querySelectorAll<HTMLElement>("div.relative.mx-auto.aspect-\\[3\\/4\\].w-full"))
      .map((element) => ({
        element,
        area: element.getBoundingClientRect().width * element.getBoundingClientRect().height,
      }))
      .sort((a, b) => b.area - a.area)[0]?.element ?? null
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function ensureShareUrl() {
  const shareInput = document.querySelector<HTMLInputElement>("input[placeholder*='Kopyala veya Paylaş']");
  if (shareInput?.value) return shareInput.value;

  const copyButton = buttonByExactText("Kopyala");
  if (!copyButton) throw new Error("Paylaşım bağlantısı oluşturulamadı.");
  copyButton.click();

  for (let attempt = 0; attempt < 30; attempt += 1) {
    await sleep(100);
    if (shareInput?.value) return shareInput.value;
  }

  throw new Error("Paylaşım bağlantısı hazırlanamadı.");
}

async function dataUrlToFile(dataUrl: string, fileName: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName, { type: "image/png" });
}

async function shareSquad(pitch: HTMLElement) {
  const [shareUrl, dataUrl] = await Promise.all([
    ensureShareUrl(),
    toPng(pitch, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#37a823",
    }),
  ]);

  const squadInput = document.querySelector<HTMLInputElement>("input[placeholder='Kadro adı']");
  const squadName = squadInput?.value.trim() || "Halısaha Kadrosu";
  const title = `${squadName} | FootBattle`;
  const text = "Halısaha kadromu FootBattle ile oluşturdum! ⚽";
  const fullText = `${text}\n${shareUrl}`;

  // Native Android app: always use the real Android share chooser with
  // the pitch PNG and the short FootBattle link attached.
  if (window.FootBattleAndroid?.shareImage) {
    window.FootBattleAndroid.shareImage(title, text, shareUrl, dataUrl);
    return;
  }

  // iOS Safari and modern mobile browsers: share the actual image file.
  // Keeping the URL inside text is more reliable on iOS/WhatsApp than
  // combining files + the separate Web Share API `url` field.
  const file = await dataUrlToFile(dataUrl, "footbattle-halisaha-kadrosu.png");
  if (navigator.share) {
    try {
      const canShareFile = !navigator.canShare || navigator.canShare({ files: [file] });
      if (canShareFile) {
        await navigator.share({ title, text: fullText, files: [file] });
        return;
      }

      await navigator.share({ title, text, url: shareUrl });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      throw error;
    }
  }

  // Older Android shell: at least open its native text/link chooser.
  if (window.FootBattleAndroid?.share) {
    window.FootBattleAndroid.share(title, text, shareUrl);
    return;
  }

  await navigator.clipboard.writeText(fullText);
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
      shareButton.className = "flex min-h-11 items-center justify-center rounded-xl bg-yellow-400 px-3 py-2.5 text-sm font-black text-[#07111f]";
      shareButton.textContent = "⚽ Paylaş";
      shareButton.addEventListener("click", () => void runShare());

      const downloadButton = document.createElement("button");
      downloadButton.type = "button";
      downloadButton.className = "flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-[#0d1828] px-3 py-2.5 text-sm font-black text-white";
      downloadButton.textContent = "↓ Görsel İndir";
      downloadButton.addEventListener("click", () => {
        buttonByExactText("Görseli İndir")?.click() ?? buttonByExactText("Görseli İndir (PNG)")?.click();
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

        const currentName = start.player.querySelector<HTMLElement>("div.mx-auto.mt-1")?.textContent?.trim() ?? "";
        const nextName = window.prompt("Oyuncu adını düzenle", currentName);
        if (nextName === null) return;

        const input = Array.from(document.querySelectorAll<HTMLInputElement>("input[placeholder^='Oyuncu ']"))[index];
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
