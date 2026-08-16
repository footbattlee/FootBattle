"use client";

type ShareCardStat = { label: string; value: string };

type ShareCardInput = {
  title: string;
  subtitle?: string;
  badge?: string;
  stats?: ShareCardStat[];
  footer?: string;
  url: string;
  fileName?: string;
  shareText: string;
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

async function buildPng(input: ShareCardInput) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createLinearGradient(0, 0, 1080, 1350);
  gradient.addColorStop(0, "#07111f");
  gradient.addColorStop(0.55, "#0b1b2d");
  gradient.addColorStop(1, "#0f2a25");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1350);

  ctx.fillStyle = "rgba(74,222,128,.12)";
  ctx.beginPath();
  ctx.arc(920, 160, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(168,85,247,.10)";
  ctx.beginPath();
  ctx.arc(120, 1180, 300, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = "900 44px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#86efac";
  ctx.fillText("FOOTBATTLE", 76, 105);

  if (input.badge) {
    ctx.font = "800 28px system-ui, -apple-system, sans-serif";
    const badgeWidth = Math.min(620, ctx.measureText(input.badge).width + 54);
    roundRect(ctx, 76, 160, badgeWidth, 58, 20);
    ctx.fillStyle = "rgba(250,204,21,.12)";
    ctx.fill();
    ctx.fillStyle = "#fde68a";
    ctx.fillText(input.badge, 103, 199);
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 76px system-ui, -apple-system, sans-serif";
  const titleLines = wrapText(ctx, input.title, 920).slice(0, 3);
  titleLines.forEach((line, index) => ctx.fillText(line, 76, 330 + index * 88));

  let y = 330 + titleLines.length * 88 + 24;
  if (input.subtitle) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 34px system-ui, -apple-system, sans-serif";
    const lines = wrapText(ctx, input.subtitle, 900).slice(0, 3);
    lines.forEach((line, index) => ctx.fillText(line, 76, y + index * 48));
    y += lines.length * 48 + 48;
  }

  const stats = (input.stats ?? []).slice(0, 4);
  if (stats.length) {
    const gap = 20;
    const columns = 2;
    const boxWidth = (928 - gap) / columns;
    const boxHeight = 150;
    stats.forEach((stat, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = 76 + col * (boxWidth + gap);
      const boxY = y + row * (boxHeight + gap);
      roundRect(ctx, x, boxY, boxWidth, boxHeight, 28);
      ctx.fillStyle = "rgba(255,255,255,.055)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.10)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = "800 24px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.fillText(stat.label.toUpperCase(), x + 28, boxY + 45);
      ctx.font = "900 50px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "#f8fafc";
      ctx.fillText(stat.value, x + 28, boxY + 105);
    });
  }

  ctx.fillStyle = "#4ade80";
  roundRect(ctx, 76, 1140, 928, 4, 2);
  ctx.fill();
  ctx.font = "800 28px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText(input.footer ?? "Futbolu biliyorsan, kanıtla.", 76, 1205);
  ctx.font = "700 25px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#86efac";
  ctx.fillText(input.url.replace(/^https?:\/\//, ""), 76, 1260);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 0.96));
  if (!blob) return null;
  return new File([blob], input.fileName ?? "footbattle-sonuc.png", { type: "image/png" });
}

export async function shareFootBattleCard(input: ShareCardInput) {
  const file = await buildPng(input);
  try {
    if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: input.title, text: input.shareText, url: input.url, files: [file] });
      return "shared" as const;
    }
    if (navigator.share) {
      await navigator.share({ title: input.title, text: input.shareText, url: input.url });
      return "shared" as const;
    }
    await navigator.clipboard.writeText(`${input.shareText}\n${input.url}`);
    return "copied" as const;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled" as const;
    try {
      await navigator.clipboard.writeText(`${input.shareText}\n${input.url}`);
      return "copied" as const;
    } catch {
      return "failed" as const;
    }
  }
}
