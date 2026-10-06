import { describe, expect, it } from 'vitest';
import {
  aggregateFootballLeaders,
  groupMatches,
  mapFootballScoreboard,
  mapFootballLeaders,
  mergeFootballMatches,
  selectKeyIncidents,
  selectRelevantTable,
  selectLandingMatches,
} from '../src/lib/football-stats';
import type {
  CompetitionSnapshot,
  FootballMatch,
  LeagueTable,
} from '../src/lib/football-types';
import type { MatchEvent } from '../src/lib/types';

const athlete = (id: string, name: string, goals: number, assists: number) => ({
  athlete: {
    id,
    displayName: name,
    team: { id: `team-${id}`, displayName: `${name} FC`, abbreviation: name.slice(0, 3) },
    statistics: [
      { name: 'totalGoals', value: goals },
      { name: 'goalAssists', value: assists },
    ],
  },
});

const scoreboardEvent = (
  id: string,
  state: 'pre' | 'in' | 'post',
  shortDetail: string,
  homeScore = '0',
  awayScore = '0'
) => ({
  id,
  date: '2026-10-06T18:45Z',
  season: { type: { name: 'League Phase' } },
  status: { type: { state, shortDetail } },
  competitions: [{
    venue: { fullName: 'Stadion Poljud', address: { city: 'Split' } },
    competitors: [
      {
        homeAway: 'home',
        score: homeScore,
        team: { id: '477', shortDisplayName: 'Croatia', abbreviation: 'CRO' },
      },
      {
        homeAway: 'away',
        score: awayScore,
        team: { id: '164', shortDisplayName: 'Spain', abbreviation: 'ESP' },
      },
    ],
  }],
});

describe('mapFootballScoreboard', () => {
  it('maps provider live state, score, clock, teams, and venue', () => {
    const [match] = mapFootballScoreboard({
      events: [scoreboardEvent('401861137', 'in', "81'", '1', '1')],
    });

    expect(match).toEqual({
      id: '401861137',
      utc: '2026-10-06T18:45Z',
      phase: 'League Phase',
      home: { id: '477', name: 'Croatia', abbreviation: 'CRO' },
      away: { id: '164', name: 'Spain', abbreviation: 'ESP' },
      venue: 'Stadion Poljud, Split',
      status: 'live',
      score: { home: 1, away: 1 },
      note: "81'",
    });
  });

  it('omits scores before kickoff and ignores malformed events', () => {
    const matches = mapFootballScoreboard({
      events: [{ id: 'bad' }, scoreboardEvent('next', 'pre', '6:45 PM')],
    });

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ id: 'next', status: 'upcoming', note: '6:45 PM' });
    expect(matches[0]).not.toHaveProperty('score');
  });
});

describe('mergeFootballMatches', () => {
  const match = (
    status: FootballMatch['status'],
    score?: FootballMatch['score']
  ): FootballMatch => ({
    id: '401861137',
    utc: '2026-10-06T18:45Z',
    phase: 'League Phase',
    home: { id: '477', name: 'Croatia', abbreviation: 'CRO', logo: '/cro.png' },
    away: { id: '164', name: 'Spain', abbreviation: 'ESP', logo: '/esp.png' },
    venue: 'Split',
    status,
    ...(score ? { score } : {}),
  });

  it('overlays refreshed status and score while preserving saved team assets', () => {
    const saved = match('upcoming');
    const refreshed = {
      ...match('live', { home: 1, away: 1 }),
      home: { id: '477', name: 'Croatia', abbreviation: 'CRO' },
      away: { id: '164', name: 'Spain', abbreviation: 'ESP' },
      note: "81'",
    };

    const [merged] = mergeFootballMatches([saved], [refreshed]);

    expect(merged).toMatchObject({
      status: 'live',
      score: { home: 1, away: 1 },
      note: "81'",
      home: { logo: '/cro.png' },
      away: { logo: '/esp.png' },
    });
    expect(saved.status).toBe('upcoming');
  });

  it('adds newly discovered games and clears an obsolete score for pre-match state', () => {
    const formerlyLive = match('live', { home: 0, away: 0 });
    const postponed = match('upcoming');
    const other = { ...match('finished', { home: 2, away: 0 }), id: 'other' };

    const merged = mergeFootballMatches([formerlyLive], [postponed, other]);

    expect(merged.find((item) => item.id === '401861137')).not.toHaveProperty('score');
    expect(merged.find((item) => item.id === 'other')?.status).toBe('finished');
  });
});

describe('mapFootballLeaders', () => {
  it('deduplicates categories and sorts scorer and assist boards', () => {
    const alpha = athlete('1', 'Alpha', 5, 1);
    const bravo = athlete('2', 'Bravo', 2, 6);
    const leaders = mapFootballLeaders({
      stats: [
        { name: 'goalsLeaders', leaders: [alpha, bravo] },
        { name: 'assistsLeaders', leaders: [bravo, alpha] },
      ],
    });

    expect(leaders.scorers.map((player) => player.name)).toEqual(['Alpha', 'Bravo']);
    expect(leaders.assists.map((player) => player.name)).toEqual(['Bravo', 'Alpha']);
    expect(leaders.scorers[0]).toMatchObject({ goals: 5, assists: 1 });
  });

  it('ignores malformed entries and respects the result limit', () => {
    const leaders = mapFootballLeaders(
      { stats: [{ name: 'goalsLeaders', leaders: [{}, athlete('1', 'Alpha', 2, 0)] }] },
      1
    );
    expect(leaders.scorers).toHaveLength(1);
    expect(leaders.assists).toEqual([]);
  });
});

describe('aggregateFootballLeaders', () => {
  it('sums the same player across competitions without double counting a board', () => {
    const player = mapFootballLeaders({
      stats: [{ name: 'goalsLeaders', leaders: [athlete('1', 'Alpha', 3, 2)] }],
    }).scorers[0];
    const competition = (shortName: string, goals: number): CompetitionSnapshot =>
      ({
        config: { shortName },
        leaders: {
          scorers: [{ ...player, goals }],
          assists: [{ ...player, goals }],
        },
      }) as CompetitionSnapshot;

    const result = aggregateFootballLeaders([
      competition('Premier League', 3),
      competition('Champions League', 2),
    ]);

    expect(result.scorers[0]).toMatchObject({ name: 'Alpha', goals: 5, assists: 4 });
    expect(result.scorers[0].competitions).toEqual(['Premier League', 'Champions League']);
  });
});

describe('groupMatches', () => {
  const match = (id: string, utc: string, status: FootballMatch['status']) =>
    ({ id, utc, status }) as FootballMatch;

  it('separates live, upcoming, and newest recent games', () => {
    const grouped = groupMatches([
      match('old', '2026-09-01T12:00:00Z', 'finished'),
      match('recent', '2026-10-01T12:00:00Z', 'finished'),
      match('live', '2026-10-05T12:00:00Z', 'live'),
      match('next', '2026-10-06T12:00:00Z', 'upcoming'),
    ]);

    expect(grouped.live.map((item) => item.id)).toEqual(['live']);
    expect(grouped.upcoming.map((item) => item.id)).toEqual(['next']);
    expect(grouped.recent.map((item) => item.id)).toEqual(['recent', 'old']);
  });
});

describe('selectLandingMatches', () => {
  const match = (id: string, utc: string, status: FootballMatch['status']) =>
    ({ id, utc, status }) as FootballMatch;

  it('prioritizes live and today while returning the latest and next ten games', () => {
    const matches = [
      match('yesterday-live', '2026-10-04T23:55:00Z', 'live'),
      match('today-finished', '2026-10-05T08:00:00Z', 'finished'),
      match('today-next', '2026-10-05T18:00:00Z', 'upcoming'),
      ...Array.from({ length: 12 }, (_, index) =>
        match(
          `future-${index}`,
          `2026-10-${String(index + 6).padStart(2, '0')}T12:00:00Z`,
          'upcoming'
        )
      ),
      ...Array.from({ length: 12 }, (_, index) =>
        match(
          `past-${index}`,
          `2026-09-${String(index + 1).padStart(2, '0')}T12:00:00Z`,
          'finished'
        )
      ),
    ];

    const selected = selectLandingMatches(matches, new Date('2026-10-05T12:00:00Z'));

    expect(selected.liveToday.map((item) => item.id)).toEqual([
      'yesterday-live',
      'today-finished',
      'today-next',
    ]);
    expect(selected.recent).toHaveLength(10);
    expect(selected.recent[0].id).toBe('today-finished');
    expect(selected.upcoming).toHaveLength(10);
    expect(selected.upcoming[0].id).toBe('today-next');
  });
});

describe('selectRelevantTable', () => {
  const table = (name: string, teamIds: string[]) =>
    ({
      name,
      rows: teamIds.map((id) => ({ team: { id } })),
    }) as LeagueTable;

  it('prefers the table containing both teams', () => {
    const selected = selectRelevantTable(
      [table('East', ['home']), table('League A', ['home', 'away'])],
      'home',
      'away'
    );
    expect(selected?.name).toBe('League A');
  });

  it('falls back to a table containing either team', () => {
    expect(selectRelevantTable([table('West', ['away'])], 'home', 'away')?.name).toBe('West');
  });

  it('returns null when neither team appears in a table', () => {
    expect(selectRelevantTable([table('Other', ['third'])], 'home', 'away')).toBeNull();
    expect(selectRelevantTable([], 'home', 'away')).toBeNull();
  });
});

describe('selectKeyIncidents', () => {
  const event = (
    type: MatchEvent['type'],
    side: MatchEvent['side'],
    min: string,
    players: string[] = [],
    text = ''
  ): MatchEvent => ({ type, side, min, players, text });

  it('returns goals and red cards for the requested team in event order', () => {
    const incidents = selectKeyIncidents([
      event('goal', 'home', "12'", ['Home Scorer', 'Home Assist']),
      event('yellow', 'home', "20'", ['Booked Player']),
      event('red', 'away', "64'", ['Away Defender']),
      event('goal', 'away', "81'", ['Away Scorer']),
    ], 'away');

    expect(incidents).toEqual([
      { type: 'red', minute: "64'", player: 'Away Defender' },
      { type: 'goal', minute: "81'", player: 'Away Scorer' },
    ]);
  });

  it('uses provider text when a key incident has no player and ignores neutral events', () => {
    expect(selectKeyIncidents([
      event('goal', '', "5'", [], 'Unknown scorer'),
      event('red', 'home', "90+2'", [], 'Bench dismissal'),
    ], 'home')).toEqual([
      { type: 'red', minute: "90+2'", player: 'Bench dismissal' },
    ]);
    expect(selectKeyIncidents([], 'home')).toEqual([]);
  });
});
