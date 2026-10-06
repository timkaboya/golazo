// Cloudflare Pages Function: GET /api/football-scores?league=<allowlisted ESPN code>
// Returns today's normalized scores for one competition, or all active
// competitions when league is omitted.

import { COMPETITIONS } from '../../src/lib/competitions';
import { mapFootballScoreboard } from '../../src/lib/football-stats';
import type { FootballScoresSnapshot } from '../../src/lib/football-types';

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const RESPONSE_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
};

async function fetchJson(url: string, timeoutMs = 7000): Promise<any> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'golazo/1.0 (+https://github.com/timkaboya/golazo)' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export const onRequestGet: PagesFunction = async ({ request }) => {
  const requestedLeague = new URL(request.url).searchParams.get('league');
  const selected = requestedLeague
    ? COMPETITIONS.filter((competition) => competition.espn === requestedLeague)
    : COMPETITIONS.filter((competition) => competition.kind !== 'archive');

  if (requestedLeague && selected.length === 0) {
    return new Response(JSON.stringify({ error: 'unsupported competition' }), {
      status: 400,
      headers: RESPONSE_HEADERS,
    });
  }

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const competitions = await Promise.all(
    selected.map(async (competition) => {
      const url = `${ESPN}/${competition.espn}/scoreboard?dates=${date}&limit=100`;
      const json = await fetchJson(url).catch(() => null);
      return json
        ? {
            slug: competition.slug,
            name: competition.shortName,
            espn: competition.espn,
            matches: mapFootballScoreboard(json),
          }
        : null;
    })
  );
  const available = competitions.filter((competition) => competition !== null);

  if (available.length === 0) {
    return new Response(JSON.stringify({ error: 'upstream unavailable' }), {
      status: 502,
      headers: RESPONSE_HEADERS,
    });
  }

  const snapshot: FootballScoresSnapshot = {
    version: 1,
    updatedUtc: new Date().toISOString(),
    competitions: available,
  };
  return new Response(JSON.stringify(snapshot), {
    headers: {
      ...RESPONSE_HEADERS,
      'cache-control': 'public, max-age=20, s-maxage=30, stale-while-revalidate=90',
    },
  });
};
