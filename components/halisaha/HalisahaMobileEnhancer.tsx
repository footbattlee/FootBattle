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
    .map((element) => ({ element, area: element.getBoundingClientRect().width * element.getBoundingClientRect().height }))
    .sort((a, b) => b.area - a.area)[0]?.element ?? null;
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

      // Mobile flow: header -> saha -> quick actions -> controls.
      content.classList.add("order-1");
      sidebar.classList.add("order-2");
      pitch.style.touchAction = "none";

      const playerNodes = Array.from(pitch.querySelectorAll<HTMLElement>(".absolute.z-20"));
      playerNodes.forEach((node) => {
        node.style.touchAction = "none";
      });

      // Full share card is too tall on mobile. Quick actions below the pitch replace it.
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
      shareButton.addEventListener("click", () => {
        buttonByText("Telefon / Uygulama ile Paylaş")?.click() ?? buttonByText("Paylaş")?.click();
      });

      const downloadButton = document.createElement("button");
      downloadButton.type = "button";
      downloadButton.className =
        "flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-[#0d1828] px-3 py-2.5 text-sm font-black text-white";
      downloadButton.textContent = "↓ Görsel İndir";
      downloadButton.addEventListener("click", () => {
        buttonByText("Görseli İndir")?.click();
      });

      actions.append(shareButton, downloadButton);
      pitchCard.insertAdjacentElement("afterend", actions);

      // Only tapping the name label edits it. Dragging the jersey remains pure 2D movement.
      const editPlayer = (event: Event) => {
        if (window.innerWidth >= 1280) return;

        const target = event.target as HTMLElement | null;
        const nameLabel = target?.closest<HTMLElement>("div.mx-auto.mt-1");
        if (!nameLabel || !pitch.contains(nameLabel)) return;

        event.stopPropagation();

        const playerNode = nameLabel.closest<HTMLElement>(".absolute.z-20");
        if (!playerNode) return;

        const currentNodes = Array.from(pitch.querySelectorAll<HTMLElement>(".absolute.z-20"));
        const index = currentNodes.indexOf(playerNode);
        if (index < 0) return;

        const currentName = nameLabel.textContent?.trim() ?? "";
        const nextName = window.prompt("Oyuncu adını düzenle", currentName);
        if (nextName === null) return;

        const playerInputs = Array.from(
          document.querySelectorAll<HTMLInputElement>("input[placeholder^='Oyuncu ']"),
        );
        const input = playerInputs[index];
        if (!input) return;

        setReactInputValue(input, nextName.trim());
      };

      pitch.addEventListener("click", editPlayer);

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
        pitch.removeEventListener("click", editPlayer);
        actions.remove();
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
