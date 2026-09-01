export type Side = -1 | 0 | 1;
export type Point = { x: number; y: number };
export type Heat = "normal" | "hot" | "on-fire" | "unstoppable";

export const TOTAL_SHOTS = 10;
export const BALL_START: Point = { x: 50, y: 79 };

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function streakTier(streak: number) {
  const value = Math.max(0, Math.floor(streak));
  if (value >= 8) return 3;
  if (value >= 5) return 2;
  return value >= 3 ? 1 : 0;
}

export function streakHeat(streak: number): Heat {
  const tier = streakTier(streak);
  if (tier === 3) return "unstoppable";
  if (tier === 2) return "on-fire";
  if (tier === 1) return "hot";
  return "normal";
}

export function otherSide(side: Side): Side {
  const options = ([-1, 0, 1] as Side[]).filter((value) => value !== side);
  return options[Math.floor(Math.random() * options.length)];
}

export function shotTarget(side: Side): Point {
  if (side === -1) return { x: 27 + Math.random() * 6, y: 23 + Math.random() * 4 };
  if (side === 1) return { x: 67 + Math.random() * 6, y: 23 + Math.random() * 4 };
  return { x: 47 + Math.random() * 6, y: 24 + Math.random() * 4 };
}

export function chooseKeeperDive(shotSide: Side, readChance = 0.62): Side {
  return Math.random() < readChance ? shotSide : otherSide(shotSide);
}

export function chooseKeeperTell(realSide: Side, accuracy = 0.72): Side {
  return Math.random() < accuracy ? realSide : otherSide(realSide);
}

export function shooterSaved(shotSide: Side, keeperSide: Side, streak: number) {
  if (shotSide !== keeperSide) return false;
  const heat = streakHeat(streak);
  const saveChance = heat === "unstoppable" ? 0.46 : heat === "on-fire" ? 0.52 : heat === "hot" ? 0.58 : 0.64;
  return Math.random() < saveChance;
}

export function keeperSaved(shotSide: Side, keeperSide: Side, reacted: boolean) {
  if (!reacted || shotSide !== keeperSide) return false;
  return Math.random() < 0.86;
}

export function scoreForGoal(streak: number) {
  const tier = streakTier(streak + 1);
  return 100 + tier * 25;
}

export function sideLabel(side: Side) {
  return side === -1 ? "SOL" : side === 1 ? "SAĞ" : "ORTA";
}
