import { readFile, writeFile } from "node:fs/promises";

if (process.env.GITHUB_ACTIONS === "true") {
  const encoded = (await readFile("android-ci/play-store-icon.webp.b64", "utf8")).trim();
  if (!encoded) throw new Error("Android Play Store icon asset is empty.");
  await writeFile("public/footbattle-logo.png", Buffer.from(encoded, "base64"));
  console.log("Prepared Play Store logo for Android CI assets.");
}
