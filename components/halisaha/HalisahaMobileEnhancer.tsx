"use client";

import { toPng } from "html-to-image";
import { useEffect } from "react";

declare global {
  interface Window {
    FootBattleAndroid?: {
      shareImage?: (title: string, text: string, url: string, dataUrl: string) => void;
      share?: (title: string, text: string, url: string) => void;
    };
    __footbattleNativeShare?: (data: ShareData) => Promise<void>;
  }
}

type Position = { x: number; y: number };

type ShareApiResponse = {
  ok?: boolean;
  sharePath?: string;
  error?: string;
};

function setReactInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function findMainPitch(): HTMLElement | null {
  return (
    Array.from(
      document.querySelectorAll<HTMLElement>(
        "div.relative.mx-auto.aspect-\\[3\\/4\\].w-full",
      ),
    )
      .filter((element) => element.querySelectorAll(".absolute.z-20").length >= 5)
      .sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return br.width * br.height - ar.width * ar.height;
      })[0] ?? null
  );
}

function getSnapshot(pitch: HTMLElement) {
  const pitchRect = pitch.getBoundingClientRect();
  const nodes = Array.from(pitch.querySelectorAll<HTMLElement>(".absolute.z-20"));

  const players = nodes.map((node, index) =>
    node.querySelector<HTMLElement>("div.mx-auto.mt-1")?.textContent?.trim() ||
    `Oyuncu ${index + 1}`,
  );

  const positions: Position[] = nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(100, ((rect.left + rect.width / 2 - pitchRect.left) / pitchRect.width) * 100),
      ),
      y: Math.max(
        0,
        Math.min(100, ((rect.top + rect.height / 2 - pitchRect.top) / pitchRect.height) * 100),
      ),
    };
  });

  const squadName =
    document.querySelector<HTMLInputElement>("input[placeholder='Kadro adı']")?.value.trim() ||
    "Halısaha Kadrosu";

  const colorInputs = Array.from(
    document.querySelectorAll<HTMLInputElement>("input[type='color']"),
  );

  return {
    squadName,
    players,
    positions,
    bodyColor: colorInputs.at(-2)?.value || "#c8101e",
    sleeveColor: colorInputs.at(-1)?.value || "#ffffff",
  };
}

async function createShortLink(pitch: HTMLElement) {
  const snapshot = getSnapshot(pitch);
  const response = await fetch("/api/halisaha-share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      squadName: snapshot.squadName,
      playerCount: snapshot.players.length,
      players: snapshot.players,
      bodyColor: snapshot.bodyColor,
      sleeveColor: snapshot.sleeveColor,
      tactic: "balanced",
      positions: snapshot.positions,
      drawings: [],
    }),
  });

  const result = (await response.json()) as ShareApiResponse;
  if (!response.ok || !result.ok || !result.sharePath) {
    throw new Error(result.error || "Paylaşım bağlantısı oluşturulamadı.");
  }

  return {
    url: `${window.location.origin}${result.sharePath}`,
    squadName: snapshot.squadName,
  };
}

async function dataUrlToFile(dataUrl: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], "footbattle-halisaha-kadrosu.png", {
    type: "image/png",
  });
}

async function capturePitch(pitch: HTMLElement) {
  return toPng(pitch, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#37a823",
  });
}

async function sharePitch(pitch: HTMLElement) {
  const dataUrl = await capturePitch(pitch);
  const { url, squadName } = await createShortLink(pitch);
  const title = `${squadName} | FootBattle`;
  const message = `Halısaha kadromu FootBattle ile oluşturdum! ⚽\n${url}`;

  // Android app: use our native chooser with the real pitch PNG + exactly one link.
  if (window.FootBattleAndroid?.shareImage) {
    window.FootBattleAndroid.shareImage(
      title,
      "Halısaha kadromu FootBattle ile oluşturdum! ⚽",
      url,
      dataUrl,
    );
    return;
  }

  const file = await dataUrlToFile(dataUrl);
  const nativeShare =
    window.__footbattleNativeShare ?? navigator.share?.bind(navigator);

  // iOS Safari / supported mobile browsers: bypass GlobalShareEnhancer completely.
  if (
    nativeShare &&
    (!navigator.canShare || navigator.canShare({ files: [file] }))
  ) {
    await nativeShare({
      title,
      text: message,
      files: [file],
    });
    return;
  }

  // Old Android shell fallback: one clean short link, no UTM.
  if (window.FootBattleAndroid?.share) {
    window.FootBattleAndroid.share(
      title,
      "Halısaha kadromu FootBattle ile oluşturdum! ⚽",
      url,
    );
    return;
  }

  if (nativeShare) {
    await nativeShare({ title, text: message });
    return;
  }

  await navigator.clipboard.writeText(message);
  window.alert("Paylaşım bağlantısı panoya kopyalandı.");
}

export default function HalisahaMobileEnhancer() {
  useEffect(() => {
    if (
      window.location.pathname !== "/halisaha-kadro" ||
      window.innerWidth >= 1280
    ) {
      return;
    }

    let timer: number | undefined;
    let cleanup: (() => void) | undefined;

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

      const oldShareCard = Array.from(content.children).find(
        (node) =>
          node instanceof HTMLElement && node.textContent?.includes("Kadronu Paylaş"),
      ) as HTMLElement | undefined;
      if (oldShareCard) oldShareCard.style.display = "none";

      let busy = false;
      const runShare = async () => {
        if (busy) return;
        busy = true;
        try {
          await sharePitch(pitch);
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
          console.error("Halısaha paylaşımı başarısız:", error);
          window.alert(
            error instanceof Error
              ? error.message
              : "Paylaşım hazırlanırken hata oluştu.",
          );
        } finally {
          busy = false;
        }
      };

      const actions = document.createElement("div");
      actions.dataset.halMobileActions = "true";
      actions.className = "mt-2 grid grid-cols-2 gap-2 xl:hidden";
      actions.innerHTML = `
        <button type="button" data-hal-share="true" class="flex min-h-11 items-center justify-center rounded-xl bg-yellow-400 px-3 py-2.5 text-sm font-black text-[#07111f]">⚽ Paylaş</button>
        <button type="button" data-hal-download="true" class="flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-[#0d1828] px-3 py-2.5 text-sm font-black text-white">↓ Görsel İndir</button>
      `;

      const shareButton = actions.querySelector<HTMLButtonElement>("[data-hal-share='true']");
      const downloadButton = actions.querySelector<HTMLButtonElement>("[data-hal-download='true']");

      shareButton?.addEventListener("click", () => void runShare());
      downloadButton?.addEventListener("click", async () => {
        const dataUrl = await capturePitch(pitch);
        const anchor = document.createElement("a");
        anchor.href = dataUrl;
        anchor.download = "footbattle-halisaha-kadrosu.png";
        anchor.click();
      });

      pitchCard.insertAdjacentElement("afterend", actions);

      // Replace the old React help button node completely. This removes its old
      // onClick/share/help handlers instead of trying to intercept them.
      let replacedHeaderButton: HTMLButtonElement | undefined;
      let originalHeaderButton: HTMLButtonElement | undefined;
      if (header) {
        originalHeaderButton = Array.from(
          header.querySelectorAll<HTMLButtonElement>("button"),
        ).find((button) => button.textContent?.includes("Nasıl Kullanılır?"));
      }

      if (originalHeaderButton) {
        replacedHeaderButton = originalHeaderButton.cloneNode(false) as HTMLButtonElement;
        replacedHeaderButton.type = "button";
        replacedHeaderButton.textContent = "⚽ Paylaş";
        replacedHeaderButton.className = originalHeaderButton.className;
        replacedHeaderButton.classList.add(
          "!border-yellow-400/60",
          "!bg-yellow-400",
          "!text-[#07111f]",
        );
        replacedHeaderButton.addEventListener("click", () => void runShare());
        originalHeaderButton.replaceWith(replacedHeaderButton);
      }

      const starts = new Map<
        number,
        { x: number; y: number; player: HTMLElement }
      >();

      const down = (event: PointerEvent) => {
        const player = (event.target as HTMLElement | null)?.closest<HTMLElement>(
          ".absolute.z-20",
        );
        if (player && pitch.contains(player)) {
          starts.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
            player,
          });
        }
      };

      const up = (event: PointerEvent) => {
        const start = starts.get(event.pointerId);
        starts.delete(event.pointerId);
        if (!start) return;

        const moved = Math.hypot(
          event.clientX - start.x,
          event.clientY - start.y,
        );
        if (moved > 7) return;

        const nodes = Array.from(
          pitch.querySelectorAll<HTMLElement>(".absolute.z-20"),
        );
        const index = nodes.indexOf(start.player);
        if (index < 0) return;

        const current =
          start.player
            .querySelector<HTMLElement>("div.mx-auto.mt-1")
            ?.textContent?.trim() || "";
        const next = window.prompt("Oyuncu adını düzenle", current);
        if (next === null) return;

        const input = Array.from(
          document.querySelectorAll<HTMLInputElement>(
            "input[placeholder^='Oyuncu ']",
          ),
        )[index];
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
        if (oldShareCard) oldShareCard.style.removeProperty("display");
        if (replacedHeaderButton && originalHeaderButton) {
          replacedHeaderButton.replaceWith(originalHeaderButton);
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
