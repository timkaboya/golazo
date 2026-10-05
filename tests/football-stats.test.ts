import { describe, expect, it } from 'vitest';
import {
  aggregateFootballLeaders,
  groupMatches,
  mapFootballLeaders,
} from '../src/lib/football-stats';
import type { CompetitionSnapshot, FootballMatch } from '../src/lib/football-types';

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
