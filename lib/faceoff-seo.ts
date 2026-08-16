export type FaceoffSeoSource = {
  match_date: string;
  left_name: string;
  right_name: string;
};

export function slugifyFaceoffPart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function faceoffSlug(faceoff: FaceoffSeoSource) {
  const left = slugifyFaceoffPart(faceoff.left_name) || "sol";
  const right = slugifyFaceoffPart(faceoff.right_name) || "sag";
  return `${left}-vs-${right}-${faceoff.match_date}`;
}
