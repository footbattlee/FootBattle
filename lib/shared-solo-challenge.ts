const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validChallengeId(value: string | null) {
  const candidate = value?.trim() ?? "";
  return UUID_PATTERN.test(candidate) ? candidate : null;
}

export function getSharedSoloChallengeId(request: Request) {
  const direct = validChallengeId(new URL(request.url).searchParams.get("challenge"));
  if (direct) return direct;

  const referer = request.headers.get("referer");
  if (!referer) return null;

  try {
    return validChallengeId(new URL(referer).searchParams.get("challenge"));
  } catch {
    return null;
  }
}
