export type CompetitionKind = 'league' | 'club-cup' | 'international' | 'archive';

export interface CompetitionConfig {
  slug: string;
  espn: string;
  name: string;
  shortName: string;
  region: string;
  description: string;
  kind: CompetitionKind;
  group: 'featured' | 'top-five' | 'international' | 'north-america' | 'archive';
  color: string;
  accent: string;
  logo: string;
  transfers: boolean;
  archiveHref?: string;
}

const logo = (id: number) => `https://a.espncdn.com/i/leaguelogos/soccer/500/${id}.png`;

export const COMPETITIONS: CompetitionConfig[] = [
  {
    slug: 'champions-league',
    espn: 'uefa.champions',
    name: 'UEFA Champions League',
    shortName: 'Champions League',
    region: 'Europe',
    description: 'Europe’s elite clubs, from the league phase through the final.',
    kind: 'club-cup',
    group: 'featured',
    color: '#071d49',
    accent: '#4f7cff',
    logo: logo(2),
    transfers: true,
  },
  {
    slug: 'europa-league',
    espn: 'uefa.europa',
    name: 'UEFA Europa League',
    shortName: 'Europa League',
    region: 'Europe',
    description: 'Fixtures, table, knockout race and stories from the Europa League.',
    kind: 'club-cup',
    group: 'featured',
    color: '#1d1d1b',
    accent: '#ff6b00',
    logo: logo(2310),
    transfers: true,
  },
  {
    slug: 'premier-league',
    espn: 'eng.1',
    name: 'Premier League',
    shortName: 'Premier League',
    region: 'England',
    description: 'Every matchday, the title race, European places and relegation battle.',
    kind: 'league',
    group: 'top-five',
    color: '#37003c',
    accent: '#00ff85',
    logo: logo(23),
    transfers: true,
  },
  {
    slug: 'la-liga',
    espn: 'esp.1',
    name: 'La Liga',
    shortName: 'La Liga',
    region: 'Spain',
    description: 'Spanish football’s title race, club form, fixtures and transfer stories.',
    kind: 'league',
    group: 'top-five',
    color: '#111827',
    accent: '#ff4b44',
    logo: logo(15),
    transfers: true,
  },
  {
    slug: 'serie-a',
    espn: 'ita.1',
    name: 'Serie A',
    shortName: 'Serie A',
    region: 'Italy',
    description: 'The Scudetto race, European qualification and every Serie A round.',
    kind: 'league',
    group: 'top-five',
    color: '#072a52',
    accent: '#00a7e1',
    logo: logo(12),
    transfers: true,
  },
  {
    slug: 'bundesliga',
    espn: 'ger.1',
    name: 'Bundesliga',
    shortName: 'Bundesliga',
    region: 'Germany',
    description: 'Fast football, packed grounds and the race for the Meisterschale.',
    kind: 'league',
    group: 'top-five',
    color: '#d20515',
    accent: '#ffffff',
    logo: logo(10),
    transfers: true,
  },
  {
    slug: 'ligue-1',
    espn: 'fra.1',
    name: 'Ligue 1',
    shortName: 'Ligue 1',
    region: 'France',
    description: 'French top-flight fixtures, standings, talent and transfer movement.',
    kind: 'league',
    group: 'top-five',
    color: '#10184b',
    accent: '#d9ff43',
    logo: logo(9),
    transfers: true,
  },
  {
    slug: 'nations-league',
    espn: 'uefa.nations',
    name: 'UEFA Nations League',
    shortName: 'Nations League',
    region: 'Europe',
    description: 'National teams, promotion and relegation, finals and matchday stories.',
    kind: 'international',
    group: 'international',
    color: '#16205b',
    accent: '#e91e63',
    logo: logo(2395),
    transfers: false,
  },
  {
    slug: 'mls',
    espn: 'usa.1',
    name: 'Major League Soccer',
    shortName: 'MLS',
    region: 'USA & Canada',
    description: 'Eastern and Western Conference action through the MLS Cup playoffs.',
    kind: 'league',
    group: 'north-america',
    color: '#111827',
    accent: '#e2231a',
    logo: logo(19),
    transfers: true,
  },
  {
    slug: 'world-cup-2026',
    espn: 'fifa.world',
    name: 'FIFA World Cup 2026',
    shortName: 'World Cup 2026',
    region: 'USA · Canada · Mexico',
    description: 'The complete 104-match tournament archive, results, tables and bracket.',
    kind: 'archive',
    group: 'archive',
    color: '#0d1b3e',
    accent: '#c8860a',
    logo: logo(4),
    transfers: false,
    archiveHref: '/world-cup',
  },
];

export const competitionBySlug = (slug: string) => COMPETITIONS.find((c) => c.slug === slug);

