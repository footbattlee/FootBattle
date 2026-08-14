export type PlayerRatings = {
  overall: number;
  keeper: number;
  defence: number;
  attack: number;
  stamina: number;
};

export type PlayerRole = "any" | "keeper" | "defence" | "attack";

export type BalancePlayer = {
  id: string;
  name: string;
  ratings: PlayerRatings;
  preferredRole?: PlayerRole;
  keeperLocked?: boolean;
};

export type BalancePair = [string, string];

export type BalanceOptions = {
  together?: BalancePair[];
  apart?: BalancePair[];
};

export type BalancedTeams = {
  teamA: BalancePlayer[];
  teamB: BalancePlayer[];
  difference: number;
  balancePercent: number;
  scoreA: number;
  scoreB: number;
};

function clamp(value: number) {
  return Number.isFinite(value) ? Math.min(5, Math.max(1, Math.round(value))) : 3;
}

export function playerPower(player: BalancePlayer) {
  const r = player.ratings;
  const roleBonus =
    player.preferredRole === "defence"
      ? clamp(r.defence) * 0.25
      : player.preferredRole === "attack"
        ? clamp(r.attack) * 0.25
        : player.preferredRole === "keeper"
          ? clamp(r.keeper) * 0.25
          : 0;

  return (
    clamp(r.overall) * 3 +
    clamp(r.defence) * 1.5 +
    clamp(r.attack) * 1.5 +
    clamp(r.stamina) +
    clamp(r.keeper) * 0.75 +
    roleBonus
  );
}

function metrics(team: BalancePlayer[]) {
  return {
    total: team.reduce((sum, player) => sum + playerPower(player), 0),
    defence: team.reduce((sum, player) => sum + clamp(player.ratings.defence), 0),
    attack: team.reduce((sum, player) => sum + clamp(player.ratings.attack), 0),
    stamina: team.reduce((sum, player) => sum + clamp(player.ratings.stamina), 0),
    keeper: team.reduce((best, player) => Math.max(best, clamp(player.ratings.keeper)), 0),
    lockedKeepers: team.filter((player) => player.keeperLocked).length,
  };
}

function hasPair(team: BalancePlayer[], pair: BalancePair) {
  const ids = new Set(team.map((player) => player.id));
  return ids.has(pair[0]) && ids.has(pair[1]);
}

function splitPair(a: BalancePlayer[], b: BalancePlayer[], pair: BalancePair) {
  const aIds = new Set(a.map((player) => player.id));
  const bIds = new Set(b.map((player) => player.id));
  return (
    (aIds.has(pair[0]) && bIds.has(pair[1])) ||
    (aIds.has(pair[1]) && bIds.has(pair[0]))
  );
}

function cost(a: BalancePlayer[], b: BalancePlayer[], options: BalanceOptions) {
  const ma = metrics(a);
  const mb = metrics(b);
  let total =
    Math.abs(ma.total - mb.total) * 4 +
    Math.abs(ma.defence - mb.defence) * 2 +
    Math.abs(ma.attack - mb.attack) * 2 +
    Math.abs(ma.stamina - mb.stamina) +
    Math.abs(ma.keeper - mb.keeper) * 5 +
    Math.abs(a.length - b.length) * 50;

  for (const pair of options.together ?? []) {
    if (splitPair(a, b, pair)) total += 10_000;
  }

  for (const pair of options.apart ?? []) {
    if (hasPair(a, pair) || hasPair(b, pair)) total += 10_000;
  }

  const lockedKeeperCount = ma.lockedKeepers + mb.lockedKeepers;
  if (lockedKeeperCount >= 2 && (ma.lockedKeepers === 0 || mb.lockedKeepers === 0)) {
    total += 20_000;
  }

  return total;
}

function choose<T>(items: T[], size: number) {
  const output: T[][] = [];
  const walk = (start: number, current: T[]) => {
    if (current.length === size) {
      output.push([...current]);
      return;
    }
    for (let i = start; i < items.length; i += 1) {
      current.push(items[i]);
      walk(i + 1, current);
      current.pop();
    }
  };
  walk(0, []);
  return output;
}

export function balanceTeams(
  players: BalancePlayer[],
  options: BalanceOptions = {},
): BalancedTeams {
  if (players.length < 4) {
    throw new Error("Takım dengelemek için en az 4 oyuncu gerekli.");
  }
  if (players.length > 22) {
    throw new Error("Takım dengeleme en fazla 22 oyuncuyu destekliyor.");
  }

  const teamASize = Math.ceil(players.length / 2);
  const fixed = players[0];
  const candidates = choose(players.slice(1), teamASize - 1);
  let bestA: BalancePlayer[] = [];
  let bestB: BalancePlayer[] = [];
  let bestCost = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const teamA = [fixed, ...candidate];
    const ids = new Set(teamA.map((player) => player.id));
    const teamB = players.filter((player) => !ids.has(player.id));
    const currentCost = cost(teamA, teamB, options);
    if (currentCost < bestCost) {
      bestCost = currentCost;
      bestA = teamA;
      bestB = teamB;
    }
  }

  const scoreA = Math.round(metrics(bestA).total * 10) / 10;
  const scoreB = Math.round(metrics(bestB).total * 10) / 10;
  const difference = Math.round(Math.abs(scoreA - scoreB) * 10) / 10;
  const average = Math.max(1, (scoreA + scoreB) / 2);
  const balancePercent = Math.max(0, Math.round((1 - difference / average) * 100));

  return {
    teamA: bestA,
    teamB: bestB,
    scoreA,
    scoreB,
    difference,
    balancePercent,
  };
}
