import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMPETITIONS } from '../src/lib/competitions.ts';
import { mapFootballLeaders } from '../src/lib/football-stats.ts';
import type {
  Club,
  CompetitionSnapshot,
  FootballMatch,
  FootballSnapshot,
  FootballStory,
  LeagueTable,
} from '../src/lib/football-types.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(root, 'src/data/football.json');
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const STANDINGS = 'https://site.api.espn.com/apis/v2/sports/soccer';
const YEAR = new Date().getUTCFullYear();
const TRANSFER_RE = /\btransfer|sign(?:s|ed|ing)?|deal|loan|contract|window|bid|move|target\b/i;
const ESPN_LEAGUE_NAMES: Record<string, string> = {
  'uefa.champions': 'UEFA Champions League',
  'uefa.europa': 'UEFA Europa League',
  'eng.1': 'English Premier League',
  'ita.1': 'Italian Serie A',
  'esp.1': 'Spanish LALIGA',
  'fra.1': 'French Ligue 1',
  'ger.1': 'German Bundesliga',
  'uefa.nations': 'UEFA Nations League',
  'usa.1': 'MLS',
  'fifa.world': 'FIFA World Cup',
};

async function getJson(url: string, timeoutMs = 15000, tries = 3): Promise<any> {
  let lastError: unknown;
  for (let attempt = 0; attempt < tries; attempt++) {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'user-agent': 'mittys-football/1.0 (+https://github.com/timkaboya/worldcup-site)' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < tries - 1) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

const text = (value: unknown) => (typeof value === 'string' ? value : '');
const number = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function club(raw: any): Club {
  return {
    id: text(raw?.id) || text(raw?.uid) || text(raw?.slug) || text(raw?.abbreviation),
    name: text(raw?.shortDisplayName) || text(raw?.displayName) || text(raw?.name) || 'TBD',
    abbreviation: text(raw?.abbreviation),
    logo: text(raw?.logo) || text(raw?.logos?.[0]?.href) || undefined,
  };
}

function mapMatches(json: any, archive: boolean): FootballMatch[] {
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
    return [{
      id: String(event.id),
      utc: event.date,
      phase,
      home: club(home.team),
      away: club(away.team),
      venue,
      status,
      ...(score ? { score } : {}),
      ...(competition?.notes?.[0]?.headline ? { note: text(competition.notes[0].headline) } : {}),
    } satisfies FootballMatch];
  });

  const sorted = matches.sort((a: FootballMatch, b: FootballMatch) => a.utc.localeCompare(b.utc));
  if (archive) return sorted;

  const now = Date.now();
  const pastCutoff = now - 35 * 86400000;
  const futureCutoff = now + 50 * 86400000;
  const windowed = sorted.filter((match: FootballMatch) => {
    const kickoff = Date.parse(match.utc);
    return kickoff >= pastCutoff && kickoff <= futureCutoff;
  });
  if (windowed.length) return windowed.slice(-80);
  return sorted.slice(-24);
}

function mapTables(json: any): LeagueTable[] {
  return (json?.children ?? []).flatMap((child: any, index: number) => {
    const entries = child?.standings?.entries ?? [];
    if (!entries.length) return [];
    const rows = entries.map((entry: any, rowIndex: number) => {
      const stat = (name: string) => number(entry?.stats?.find((item: any) => item.name === name)?.value);
      const rank = stat('rank') || rowIndex + 1;
      return {
        team: club(entry.team),
        rank,
        played: stat('gamesPlayed'),
        won: stat('wins'),
        drawn: stat('ties'),
        lost: stat('losses'),
        gf: stat('pointsFor'),
        ga: stat('pointsAgainst'),
        gd: stat('pointDifferential'),
        points: stat('points'),
      };
    });
    return [{
      name: text(child?.name) || text(child?.abbreviation) || (index ? `Table ${index + 1}` : 'Standings'),
      rows,
    }];
  });
}

function mapNews(
  json: any,
  source: string,
  config: (typeof COMPETITIONS)[number]
): FootballStory[] {
  return (json?.articles ?? []).flatMap((article: any) => {
    const leagueCategories = (article?.categories ?? [])
      .filter((category: any) => category?.type === 'league')
      .map((category: any) => text(category.description));
    const expectedLeague = ESPN_LEAGUE_NAMES[config.espn];
    if (expectedLeague && !leagueCategories.includes(expectedLeague)) return [];
    if (leagueCategories.some((name: string) => /women/i.test(name))) return [];
    const url = text(article?.links?.web?.href);
    const title = text(article?.headline);
    if (!url || !title) return [];
    const description = text(article?.description);
    return [{
      id: text(article?.id) || url,
      title,
      ...(description ? { description } : {}),
      url,
      imageUrl: text(article?.images?.[0]?.url) || undefined,
      publishedUtc: text(article?.published) || text(article?.lastModified) || new Date().toISOString(),
      source,
      transfer: TRANSFER_RE.test(`${title} ${description}`),
    } satisfies FootballStory];
  });
}

async function fetchCompetition(
  config: (typeof COMPETITIONS)[number],
  previous?: CompetitionSnapshot
): Promise<CompetitionSnapshot> {
  const scoreboardUrl = `${ESPN}/${config.espn}/scoreboard?dates=${YEAR}&limit=1000`;
  const standingsUrl = `${STANDINGS}/${config.espn}/standings`;
  const newsUrl = `${ESPN}/${config.espn}/news?limit=24`;
  const statisticsUrl = `${ESPN}/${config.espn}/statistics`;
  const [scoreboard, standings, news, statistics] = await Promise.all([
    getJson(scoreboardUrl).catch(() => ({})),
    getJson(standingsUrl).catch(() => ({})),
    getJson(newsUrl).catch(() => ({})),
    getJson(statisticsUrl).catch(() => ({})),
  ]);
  const matches = mapMatches(scoreboard, config.kind === 'archive');
  const tables = mapTables(standings);
  const stories = mapNews(news, 'ESPN', config);
  const fetchedLeaders = mapFootballLeaders(statistics);
  const leaders =
    fetchedLeaders.scorers.length || fetchedLeaders.assists.length
      ? fetchedLeaders
      : previous?.leaders ?? { scorers: [], assists: [] };
  if (!matches.length && !tables.length && !stories.length && previous) {
    console.warn(`  ${config.shortName}: offline, keeping last-known snapshot`);
    return {
      ...previous,
      config,
      leaders: previous.leaders ?? { scorers: [], assists: [] },
    };
  }
  console.log(
    `  ${config.shortName}: ${matches.length} matches, ${tables.length} tables, ${leaders.scorers.length} scorers, ${stories.length} stories`
  );
  return { config, updatedUtc: new Date().toISOString(), matches, tables, news: stories, leaders };
}

async function main() {
  console.log(`Fetching Mitty's Football data for ${YEAR}…`);
  const previous = existsSync(OUT)
    ? (JSON.parse(readFileSync(OUT, 'utf8')) as FootballSnapshot)
    : undefined;
  const previousBySlug = new Map(
    (previous?.competitions ?? []).map((competition) => [competition.config.slug, competition])
  );
  const competitions = await Promise.all(
    COMPETITIONS.map((config) => fetchCompetition(config, previousBySlug.get(config.slug)))
  );
  if (!competitions.some((competition) => competition.matches.length || competition.tables.length)) {
    if (existsSync(OUT)) {
      console.warn('No competition data fetched; keeping existing snapshot.');
      return;
    }
    throw new Error('No competition data returned.');
  }
  const snapshot: FootballSnapshot = {
    version: 2,
    updatedUtc: new Date().toISOString(),
    competitions,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
  console.log(`wrote src/data/football.json (${competitions.length} competitions)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
