import type {
  CompetitionSnapshot,
  FootballLeader,
  FootballLeaders,
  FootballMatch,
  LeagueTable,
} from './football-types';

const text = (value: unknown) => (typeof value === 'string' ? value : '');
const number = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sortScorers = (a: FootballLeader, b: FootballLeader) =>
  b.goals - a.goals || b.assists - a.assists || a.name.localeCompare(b.name);

const sortAssists = (a: FootballLeader, b: FootballLeader) =>
  b.assists - a.assists || b.goals - a.goals || a.name.localeCompare(b.name);

export function mapFootballLeaders(json: any, limit = 30): FootballLeaders {
  const byId = new Map<string, FootballLeader>();

  for (const category of json?.stats ?? []) {
    if (!/goal|assist/i.test(text(category?.name))) continue;
    for (const entry of category?.leaders ?? []) {
      const athlete = entry?.athlete;
      const name = text(athlete?.displayName) || text(athlete?.shortName);
      if (!name) continue;
      const id = String(athlete?.id ?? name);
      if (byId.has(id)) continue;
      const stat = (statName: string) =>
        number(athlete?.statistics?.find((item: any) => item?.name === statName)?.value);
      const team = athlete?.team ?? {};
      byId.set(id, {
        id,
        name,
        team: {
          id: String(team?.id ?? team?.uid ?? team?.abbreviation ?? ''),
          name: text(team?.displayName) || text(team?.name) || text(team?.abbreviation) || 'Unknown team',
          abbreviation: text(team?.abbreviation),
          logo: text(team?.logo) || text(team?.logos?.[0]?.href) || undefined,
        },
        headshot: text(athlete?.headshot?.href) || undefined,
        goals: stat('totalGoals'),
        assists: stat('goalAssists'),
      });
    }
  }

  const players = [...byId.values()];
  return {
    scorers: players.filter((player) => player.goals > 0).sort(sortScorers).slice(0, limit),
    assists: players.filter((player) => player.assists > 0).sort(sortAssists).slice(0, limit),
  };
}

export function aggregateFootballLeaders(
  competitions: Pick<CompetitionSnapshot, 'config' | 'leaders'>[],
  limit = 30
): FootballLeaders {
  const byId = new Map<string, FootballLeader>();

  for (const competition of competitions) {
    const players = new Map(
      [...competition.leaders.scorers, ...competition.leaders.assists].map((player) => [
        player.id,
        player,
      ])
    );
    for (const player of players.values()) {
      const current = byId.get(player.id);
      if (!current) {
        byId.set(player.id, {
          ...player,
          competitions: [competition.config.shortName],
        });
        continue;
      }
      current.goals += player.goals;
      current.assists += player.assists;
      if (!current.competitions?.includes(competition.config.shortName)) {
        current.competitions?.push(competition.config.shortName);
      }
    }
  }

  const players = [...byId.values()];
  return {
    scorers: players.filter((player) => player.goals > 0).sort(sortScorers).slice(0, limit),
    assists: players.filter((player) => player.assists > 0).sort(sortAssists).slice(0, limit),
  };
}

export function groupMatches(matches: FootballMatch[], limit = 12) {
  const ordered = [...matches].sort((a, b) => a.utc.localeCompare(b.utc));
  return {
    live: ordered.filter((match) => match.status === 'live').slice(0, limit),
    upcoming: ordered.filter((match) => match.status === 'upcoming').slice(0, limit),
    recent: ordered.filter((match) => match.status === 'finished').slice(-limit).reverse(),
  };
}

export function selectLandingMatches(
  matches: FootballMatch[],
  now = new Date(),
  limit = 10
) {
  const ordered = [...matches].sort((a, b) => a.utc.localeCompare(b.utc));
  const today = now.toISOString().slice(0, 10);

  return {
    liveToday: ordered
      .filter((match) => match.status === 'live' || match.utc.slice(0, 10) === today)
      .sort((a, b) => Number(b.status === 'live') - Number(a.status === 'live') || a.utc.localeCompare(b.utc))
      .slice(0, limit),
    recent: ordered.filter((match) => match.status === 'finished').slice(-limit).reverse(),
    upcoming: ordered.filter((match) => match.status === 'upcoming').slice(0, limit),
  };
}

export function selectRelevantTable(
  tables: LeagueTable[],
  homeTeamId: string,
  awayTeamId: string
): LeagueTable | null {
  let best: LeagueTable | null = null;
  let bestScore = 0;

  for (const table of tables) {
    const ids = new Set(table.rows.map((row) => row.team.id));
    const score = Number(ids.has(homeTeamId)) + Number(ids.has(awayTeamId));
    if (score > bestScore) {
      best = table;
      bestScore = score;
    }
  }

  return best;
}
