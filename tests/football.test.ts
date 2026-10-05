import { describe, expect, it } from 'vitest';
import snapshot from '../src/data/football.json';
import { COMPETITIONS, competitionBySlug } from '../src/lib/competitions';

describe('competition registry', () => {
  it('finds a configured competition by slug', () => {
    expect(competitionBySlug('premier-league')?.espn).toBe('eng.1');
  });

  it('returns undefined for an unknown slug', () => {
    expect(competitionBySlug('unknown-league')).toBeUndefined();
  });
});

describe("Mitty's Football snapshot", () => {
  it('contains every configured competition exactly once', () => {
    expect(snapshot.competitions).toHaveLength(COMPETITIONS.length);
    expect(new Set(snapshot.competitions.map((item) => item.config.slug)).size).toBe(COMPETITIONS.length);
  });

  it('has fixtures, tables, player leaders, news and branded assets for active competitions', () => {
    for (const competition of snapshot.competitions) {
      expect(competition.config.logo).toMatch(/^https:\/\/a\.espncdn\.com\//);
      expect(competition.matches.length).toBeGreaterThan(0);
      expect(competition.tables.length).toBeGreaterThan(0);
      expect(competition.news.length).toBeGreaterThan(0);
      expect(competition.leaders.scorers.length).toBeGreaterThan(0);
      expect(competition.leaders.assists.length).toBeGreaterThan(0);
      expect(competition.leaders.scorers[0].goals).toBeGreaterThan(0);
      expect(competition.leaders.assists[0].assists).toBeGreaterThan(0);
      expect(competition.tables.flatMap((table) => table.rows).some((row) => row.team.logo)).toBe(true);
    }
  });

  it('keeps the completed World Cup archive intact', () => {
    const worldCup = snapshot.competitions.find((item) => item.config.slug === 'world-cup-2026');
    expect(worldCup?.matches).toHaveLength(104);
    expect(worldCup?.matches.every((match) => match.status === 'finished')).toBe(true);
    expect(worldCup?.config.archiveHref).toBe('/world-cup');
  });

  it('enables transfer coverage only where it is relevant', () => {
    const bySlug = new Map(snapshot.competitions.map((item) => [item.config.slug, item.config]));
    for (const slug of ['premier-league', 'la-liga', 'serie-a', 'bundesliga', 'ligue-1', 'mls']) {
      expect(bySlug.get(slug)?.transfers).toBe(true);
    }
    expect(bySlug.get('world-cup-2026')?.transfers).toBe(false);
    expect(bySlug.get('nations-league')?.transfers).toBe(false);
  });
});
