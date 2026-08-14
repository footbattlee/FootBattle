export type PlayerRatings = {
  overall: number;
  keeper: number;
  defence: number;
  attack: number;
  stamina: number;
};

export type BalancePlayer = {
  id: string;
  name: string;
  ratings: PlayerRatings;
};

export type BalancedTeams = {
  teamA: BalancePlayer[];
  teamB: BalancePlayer[];
  difference: number;
  scoreA: number;
  scoreB: number;
};

function clamp(value: number) {
  return Number.isFinite(value) ? Math.min(5, Math.max(1, Math.round(value))) : 3;
}

function power(player: BalancePlayer) {
  const r = player.ratings;
  return clamp(r.overall) * 3 + clamp(r.defence) * 1.5 + clamp(r.attack) * 1.5 + clamp(r.stamina) + clamp(r.keeper) * 0.75;
}

function metrics(team: BalancePlayer[]) {
  return {
    total: team.reduce((sum, player) => sum + power(player), 0),
    defence: team.reduce((sum, player) => sum + clamp(player.ratings.defence), 0),
    attack: team.reduce((sum, player) => sum + clamp(player.ratings.attack), 0),
    stamina: team.reduce((sum, player) => sum + clamp(player.ratings.stamina), 0),
    keeper: team.reduce((best, player) => Math.max(best, clamp(player.ratings.keeper)), 0),
  };
}

function cost(a: BalancePlayer[], b: BalancePlayer[]) {
  const ma = metrics(a);
  const mb = metrics(b);
  return Math.abs(ma.total - mb.total) * 4 + Math.abs(ma.defence - mb.defence) * 2 + Math.abs(ma.attack - mb.attack) * 2 + Math.abs(ma.stamina - mb.stamina) + Math.abs(ma.keeper - mb.keeper) * 5 + Math.abs(a.length - b.length) * 50;
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

export function balanceTeams(players: BalancePlayer[]): BalancedTeams {
  if (players.length < 4) throw new Error("Takım dengelemek için en az 4 oyuncu gerekli.");

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
    const currentCost = cost(teamA, teamB);
    if (currentCost < bestCost) {
      bestCost = currentCost;
      bestA = teamA;
      bestB = teamB;
    }
  }

  const scoreA = Math.round(metrics(bestA).total * 10) / 10;
  const scoreB = Math.round(metrics(bestB).total * 10) / 10;
  return { teamA: bestA, teamB: bestB, scoreA, scoreB, difference: Math.round(Math.abs(scoreA - scoreB) * 10) / 10 };
}
