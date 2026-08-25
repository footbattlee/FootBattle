"use client";

import { useEffect } from "react";

function buttonByText(text: string) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
    button.textContent?.includes(text),
  );
}

function setReactInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;

  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function findMainPitch() {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>("div.relative.mx-auto.aspect-\\[3\\/4\\].w-full"),
  );

  return candidates
    .map((element) => ({
      element,
      area: element.getBoundingClientRect().width * element.getBoundingClientRect().height,
    }))
    .sort((a, b) => b.area - a.area)[0]?.element ?? null;
}

function triggerPrimaryShare() {
  const nativeShareButton = buttonByText("Telefon / Uygulama ile Paylaş");
  if (nativeShareButton) {
    nativeShareButton.click();
    return;
  }

  const fallbackShareButton = Array.from(
    document.querySelectorAll<HTMLButtonElement>("button"),
  ).find((button) => button.textContent?.trim() === "Paylaş");

  fallbackShareButton?.click();
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

      // Mobile flow: header -> saha -> compact actions -> controls.
      content.classList.add("order-1");
      sidebar.classList.add("order-2");
      pitch.style.touchAction = "none";

      const playerNodes = Array.from(pitch.querySelectorAll<HTMLElement>(".absolute.z-20"));
      playerNodes.forEach((node) => {
        node.style.touchAction = "none";
      });

      // Full share card is too tall on mobile. Compact actions below the pitch replace it.
      const shareCard = Array.from(content.children).find((child) =>
        child instanceof HTMLElement && child.textContent?.includes("Kadronu Paylaş"),
      ) as HTMLElement | undefined;
      if (shareCard) shareCard.style.display = "none";

      const actions = document.createElement("div");
      actions.dataset.halMobileActions = "true";
      actions.className = "mt-2 grid grid-cols-2 gap-2 xl:hidden";

      const shareButton = document.createElement("button");
      shareButton.type = "button";
      shareButton.className =
        "flex min-h-11 items-center justify-center rounded-xl bg-yellow-400 px-3 py-2.5 text-sm font-black text-[#07111f]";
      shareButton.textContent = "⚽ Paylaş";
      shareButton.addEventListener("click", triggerPrimaryShare);

      const downloadButton = document.createElement("button");
      downloadButton.type = "button";
      downloadButton.className =
        "flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-[#0d1828] px-3 py-2.5 text-sm font-black text-white";
      downloadButton.textContent = "↓ Görsel İndir";
      downloadButton.addEventListener("click", () => {
        const button = buttonByText("Görseli İndir (PNG)") ?? buttonByText("Görseli İndir");
        button?.click();
      });

      actions.append(shareButton, downloadButton);
      pitchCard.insertAdjacentElement("afterend", actions);

      // Replace "Nasıl Kullanılır?" with a top-level share CTA on mobile.
      const howToButton = buttonByText("Nasıl Kullanılır?");
      let topShareButton: HTMLButtonElement | null = null;
      if (howToButton) {
        howToButton.style.display = "none";
        topShareButton = document.createElement("button");
        topShareButton.type = "button";
        topShareButton.dataset.halTopShare = "true";
        topShareButton.className =
          "inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-[#07111f]";
        topShareButton.textContent = "⚽ Paylaş";
        topShareButton.addEventListener("click", triggerPrimaryShare);
        howToButton.insertAdjacentElement("afterend", topShareButton);
      }

      // Tap a player to rename. Press + move keeps the normal free 2D drag behavior.
      type GestureState = {
        playerNode: HTMLElement;
        index: number;
        pointerId: number;
        startX: number;
        startY: number;
        startedAt: number;
        moved: boolean;
      };

      let gesture: GestureState | null = null;

      const onPointerDown = (event: PointerEvent) => {
        if (window.innerWidth >= 1280) return;
        const target = event.target as HTMLElement | null;
        const playerNode = target?.closest<HTMLElement>(".absolute.z-20");
        if (!playerNode || !pitch.contains(playerNode)) return;

        const currentNodes = Array.from(pitch.querySelectorAll<HTMLElement>(".absolute.z-20"));
        const index = currentNodes.indexOf(playerNode);
        if (index < 0) return;

        gesture = {
          playerNode,
          index,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          startedAt: Date.now(),
          moved: false,
        };
      };

      const onPointerMove = (event: PointerEvent) => {
        if (!gesture || gesture.pointerId !== event.pointerId) return;
        const distance = Math.hypot(
          event.clientX - gesture.startX,
          event.clientY - gesture.startY,
        );
        if (distance > 8) gesture.moved = true;
      };

      const onPointerUp = (event: PointerEvent) => {
        if (!gesture || gesture.pointerId !== event.pointerId) return;
        const completedGesture = gesture;
        gesture = null;

        const duration = Date.now() - completedGesture.startedAt;
        if (completedGesture.moved || duration > 500) return;

        const label = completedGesture.playerNode.querySelector<HTMLElement>("div.mx-auto.mt-1");
        const currentName = label?.textContent?.trim() ?? `Oyuncu ${completedGesture.index + 1}`;

        window.setTimeout(() => {
          const nextName = window.prompt("Oyuncu adını düzenle", currentName);
          if (nextName === null) return;

          const playerInputs = Array.from(
            document.querySelectorAll<HTMLInputElement>("input[placeholder^='Oyuncu ']"),
          );
          const input = playerInputs[completedGesture.index];
          if (!input) return;

          setReactInputValue(input, nextName.trim());
        }, 0);
      };

      const onPointerCancel = () => {
        gesture = null;
      };

      pitch.addEventListener("pointerdown", onPointerDown, true);
      pitch.addEventListener("pointermove", onPointerMove, true);
      pitch.addEventListener("pointerup", onPointerUp, true);
      pitch.addEventListener("pointercancel", onPointerCancel, true);

      // Compact mobile header so the pitch reaches the first viewport faster.
      const header = grid.previousElementSibling as HTMLElement | null;
      if (header?.tagName === "HEADER") {
        header.classList.add("mb-3", "gap-2", "pb-3");
        header.querySelector("h1")?.classList.add("!text-2xl");
        const brandBlock = Array.from(header.children).find((node) =>
          node instanceof HTMLElement && node.textContent?.includes("arkadaşına fifada"),
        ) as HTMLElement | undefined;
        brandBlock?.classList.add("!my-0");
      }

      cleanup = () => {
        pitch.removeEventListener("pointerdown", onPointerDown, true);
        pitch.removeEventListener("pointermove", onPointerMove, true);
        pitch.removeEventListener("pointerup", onPointerUp, true);
        pitch.removeEventListener("pointercancel", onPointerCancel, true);
        shareButton.removeEventListener("click", triggerPrimaryShare);
        topShareButton?.removeEventListener("click", triggerPrimaryShare);
        actions.remove();
        topShareButton?.remove();
        if (howToButton) howToButton.style.removeProperty("display");
        pitch.style.removeProperty("touch-action");
        playerNodes.forEach((node) => node.style.removeProperty("touch-action"));
        content.classList.remove("order-1");
        sidebar.classList.remove("order-2");
        if (shareCard) shareCard.style.removeProperty("display");
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
