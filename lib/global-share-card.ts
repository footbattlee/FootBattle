"use client";

export async function createGlobalFootBattleShareCard(data: ShareData) {
  const raw = [data.title, data.text].filter(Boolean).join("\n").trim();
  if (!raw || !/footbattle/i.test(raw)) return null;

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createLinearGradient(0, 0, 1080, 1350);
  gradient.addColorStop(0, "#07111f");
  gradient.addColorStop(0.6, "#0a1a2b");
  gradient.addColorStop(1, "#123126");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1350);

  ctx.fillStyle = "rgba(74,222,128,.10)";
  ctx.beginPath();
  ctx.arc(930, 170, 270, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(168,85,247,.10)";
  ctx.beginPath();
  ctx.arc(100, 1190, 310, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#86efac";
  ctx.font = "900 46px system-ui, -apple-system, sans-serif";
  ctx.fillText("FOOTBATTLE", 78, 108);
  ctx.fillStyle = "#64748b";
  ctx.font = "800 24px system-ui, -apple-system, sans-serif";
  ctx.fillText("FUTBOLU BİLİYORSAN, KANITLA.", 78, 150);

  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line, index, all) => index === 0 || line !== all[index - 1])
    .slice(0, 9);

  let y = 300;
  lines.forEach((line, index) => {
    const isFirst = index === 0;
    ctx.font = `${isFirst ? "900 64px" : "800 38px"} system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = isFirst ? "#ffffff" : index === 1 ? "#fde68a" : "#cbd5e1";
    const maxWidth = 900;
    const words = line.split(/\s+/);
    let current = "";
    const wrapped: string[] = [];
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && current) {
        wrapped.push(current);
        current = word;
      } else current = next;
    }
    if (current) wrapped.push(current);
    wrapped.slice(0, 2).forEach((part) => {
      ctx.fillText(part, 78, y);
      y += isFirst ? 78 : 56;
    });
    y += isFirst ? 28 : 18;
  });

  const url = typeof data.url === "string" ? data.url : window.location.href;
  ctx.fillStyle = "#4ade80";
  ctx.fillRect(78, 1140, 924, 4);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "800 30px system-ui, -apple-system, sans-serif";
  ctx.fillText("Sen de oyna ve sonucunu paylaş.", 78, 1205);
  ctx.fillStyle = "#86efac";
  ctx.font = "700 25px system-ui, -apple-system, sans-serif";
  const cleanUrl = url.replace(/^https?:\/\//, "");
  ctx.fillText(cleanUrl.length > 62 ? `${cleanUrl.slice(0, 59)}...` : cleanUrl, 78, 1260);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 0.96));
  if (!blob) return null;
  return new File([blob], "footbattle-paylasim.png", { type: "image/png" });
}
