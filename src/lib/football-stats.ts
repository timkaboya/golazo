import type {
  Club,
  CompetitionSnapshot,
  FootballLeader,
  FootballLeaders,
  FootballMatch,
  LeagueTable,
} from './football-types';
import type { MatchEvent } from './types';

const text = (value: unknown) => (typeof value === 'string' ? value : '');
const number = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function mapClub(raw: any): Club {
  return {
    id: text(raw?.id) || text(raw?.uid) || text(raw?.slug) || text(raw?.abbreviation),
    name: text(raw?.shortDisplayName) || text(raw?.displayName) || text(raw?.name) || 'TBD',
    abbreviation: text(raw?.abbreviation),
    logo: text(raw?.logo) || text(raw?.logos?.[0]?.href) || undefined,
  };
}

export function mapFootballScoreboard(json: any): FootballMatch[] {
  const matches = (json?.events ?? []).flatMap((event: any) => {
    const competition = event?.competitions?.[0];
    const competitors = competition?.competitors ?? [];
    const home = competitors.find((entry: any) => entry.homeAway === 'home');
    const away = competitors.find((entry: any) => entry.homeAway === 'away');
    if (!home || !away || !event?.date) return [];

    const state = text(event?.status?.type?.state);
    const status = state === 'post' ? 'finished' : state === 'in' ? 'live' : 'upcoming';
    const score =
      status === 'upcoming'
        ? undefined
        : { home: number(home.score), away: number(away.score) };
    const phase =
      text(event?.season?.type?.name) ||
      text(event?.season?.slug)
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase()) ||
      'Matchday';
    const venue = [text(competition?.venue?.fullName), text(competition?.venue?.address?.city)]
      .filter(Boolean)
      .join(', ');
    const note =
      text(event?.status?.type?.shortDetail) ||
      text(competition?.notes?.[0]?.headline);

    return [{
      id: String(event.id),
      utc: event.date,
      phase,
      home: mapClub(home.team),
      away: mapClub(away.team),
      venue,
      status,
      ...(score ? { score } : {}),
      ...(note ? { note } : {}),
    } satisfies FootballMatch];
  });

  return matches.sort((a: FootballMatch, b: FootballMatch) => a.utc.localeCompare(b.utc));
}

export function mergeFootballMatches<T extends FootballMatch>(
  saved: T[],
  refreshed: T[]
): T[] {
  const byId = new Map(saved.map((match) => [match.id, match]));

  for (const match of refreshed) {
    const current = byId.get(match.id);
    const merged = {
      ...current,
      ...match,
      home: { ...current?.home, ...match.home },
      away: { ...current?.away, ...match.away },
    } as T;
    if (!Object.prototype.hasOwnProperty.call(match, 'score')) delete merged.score;
    byId.set(match.id, merged);
  }

  return [...byId.values()].sort((a, b) => a.utc.localeCompare(b.utc));
}

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

export interface KeyIncident {
  minute: string;
  type: 'goal' | 'red';
  player: string;
}

export function selectKeyIncidents(
  events: MatchEvent[],
  side: 'home' | 'away'
): KeyIncident[] {
  return events
    .filter(
      (event): event is MatchEvent & { type: KeyIncident['type'] } =>
        event.side === side && (event.type === 'goal' || event.type === 'red')
    )
    .map((event) => ({
      minute: event.min,
      type: event.type,
      player: event.players[0] || event.text || (event.type === 'goal' ? 'Goal' : 'Red card'),
    }));
}
