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

export default function HalisahaMobileEnhancer() {
  useEffect(() => {
    if (window.location.pathname !== "/halisaha-kadro") return;

    let cleanup: (() => void) | undefined;
    let retryTimer: number | undefined;

    const install = () => {
      if (window.innerWidth >= 1280) return;
      if (document.querySelector("[data-hal-mobile-actions='true']")) return;

      const pitch = document.querySelector<HTMLElement>(
        "div.relative.mx-auto.aspect-\\[3\\/4\\].w-full",
      );

      if (!pitch) {
        retryTimer = window.setTimeout(install, 350);
        return;
      }

      const pitchCard = pitch.parentElement;
      if (!pitchCard) return;

      const actions = document.createElement("div");
      actions.dataset.halMobileActions = "true";
      actions.className =
        "mt-3 grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-[#0d1828] p-3 xl:hidden";

      const shareButton = document.createElement("button");
      shareButton.type = "button";
      shareButton.className =
        "flex min-h-12 items-center justify-center rounded-xl bg-yellow-400 px-3 py-3 text-sm font-black text-[#07111f]";
      shareButton.textContent = "⚽ Paylaş";
      shareButton.addEventListener("click", () => {
        buttonByText("Telefon / Uygulama ile Paylaş")?.click() ??
          buttonByText("Paylaş")?.click();
      });

      const downloadButton = document.createElement("button");
      downloadButton.type = "button";
      downloadButton.className =
        "flex min-h-12 items-center justify-center rounded-xl border border-white/10 px-3 py-3 text-sm font-black text-white";
      downloadButton.textContent = "↓ PNG İndir";
      downloadButton.addEventListener("click", () => {
        buttonByText("Görseli İndir")?.click();
      });

      actions.append(shareButton, downloadButton);
      pitchCard.insertAdjacentElement("afterend", actions);

      const editPlayer = (event: Event) => {
        if (window.innerWidth >= 1280) return;

        const target = event.target as HTMLElement | null;
        const playerNode = target?.closest<HTMLElement>(".absolute.z-20");
        if (!playerNode || !pitch.contains(playerNode)) return;

        const playerNodes = Array.from(pitch.querySelectorAll<HTMLElement>(".absolute.z-20"));
        const index = playerNodes.indexOf(playerNode);
        if (index < 0) return;

        const currentName =
          playerNode.querySelector<HTMLElement>("div.mx-auto.mt-1")?.textContent?.trim() ?? "";
        const nextName = window.prompt("Oyuncu adını düzenle", currentName);
        if (nextName === null) return;

        const playerInputs = Array.from(
          document.querySelectorAll<HTMLInputElement>("input[placeholder^='Oyuncu ']")
        );
        const input = playerInputs[index];
        if (!input) return;

        setReactInputValue(input, nextName.trim());
      };

      pitch.addEventListener("click", editPlayer);

      const hint = document.createElement("p");
      hint.dataset.halMobileHint = "true";
      hint.className = "mt-2 px-1 text-center text-xs font-semibold text-slate-500 xl:hidden";
      hint.textContent = "İsmini değiştirmek için sahadaki oyuncuya dokun.";
      actions.insertAdjacentElement("afterend", hint);

      cleanup = () => {
        pitch.removeEventListener("click", editPlayer);
        actions.remove();
        hint.remove();
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
