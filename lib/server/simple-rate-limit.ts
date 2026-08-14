type Bucket = {
  count: number;
  resetAt: number;
};

const globalStore = globalThis as typeof globalThis & {
  __footbattleRateLimit?: Map<string, Bucket>;
};

const store =
  globalStore.__footbattleRateLimit ??
  (globalStore.__footbattleRateLimit = new Map<string, Bucket>());

export function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
) {
  const now = Date.now();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + options.windowMs };
    store.set(key, next);
    return {
      allowed: true,
      remaining: Math.max(0, options.limit - 1),
      resetAt: next.resetAt,
    };
  }

  current.count += 1;
  store.set(key, current);

  return {
    allowed: current.count <= options.limit,
    remaining: Math.max(0, options.limit - current.count),
    resetAt: current.resetAt,
  };
}

export function getRequestFingerprint(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  return `${ip}:${userAgent.slice(0, 80)}`;
}
