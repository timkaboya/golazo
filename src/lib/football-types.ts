import type { CompetitionConfig } from './competitions';

export interface Club {
  id: string;
  name: string;
  abbreviation: string;
  logo?: string;
}

export interface FootballMatch {
  id: string;
  utc: string;
  phase: string;
  home: Club;
  away: Club;
  venue: string;
  status: 'upcoming' | 'live' | 'finished';
  score?: { home: number; away: number };
  note?: string;
}

export interface LeagueTableRow {
  team: Club;
  rank: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

export interface LeagueTable {
  name: string;
  rows: LeagueTableRow[];
}

export interface FootballStory {
  id: string;
  title: string;
  description?: string;
  url: string;
  imageUrl?: string;
  publishedUtc: string;
  source: string;
  transfer: boolean;
}

export interface FootballLeader {
  id: string;
  name: string;
  team: Club;
  headshot?: string;
  goals: number;
  assists: number;
  competitions?: string[];
}

export interface FootballLeaders {
  scorers: FootballLeader[];
  assists: FootballLeader[];
}

export interface CompetitionSnapshot {
  config: CompetitionConfig;
  updatedUtc: string;
  matches: FootballMatch[];
  tables: LeagueTable[];
  news: FootballStory[];
  leaders: FootballLeaders;
}

export interface FootballSnapshot {
  version: number;
  updatedUtc: string;
  competitions: CompetitionSnapshot[];
}
