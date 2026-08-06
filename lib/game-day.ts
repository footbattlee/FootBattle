const GAME_SWITCH_HOUR = 2;

export function getActiveGameDateKey(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(now);

  const year = Number(
    parts.find((part) => part.type === "year")?.value,
  );

  const month = Number(
    parts.find((part) => part.type === "month")?.value,
  );

  const day = Number(
    parts.find((part) => part.type === "day")?.value,
  );

  const hour = Number(
    parts.find((part) => part.type === "hour")?.value,
  );

  const activeDate = new Date(
    Date.UTC(year, month - 1, day),
  );

  if (hour < GAME_SWITCH_HOUR) {
    activeDate.setUTCDate(
      activeDate.getUTCDate() - 1,
    );
  }

  return activeDate.toISOString().slice(0, 10);
}