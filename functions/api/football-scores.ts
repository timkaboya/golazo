// Cloudflare Pages Function: GET /api/football-scores?league=<allowlisted ESPN code>
// Returns a rolling recent/upcoming score window for one competition, or all
// active competitions when league is omitted.

import { COMPETITIONS } from '../../src/lib/competitions';
import {
  footballScoreboardYears,
  mapFootballScoreboard,
  mergeFootballMatches,
  selectFootballMatchWindow,
} from '../../src/lib/football-stats';
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

  const now = new Date();
  const years = footballScoreboardYears(now);
  const competitions = await Promise.all(
    selected.map(async (competition) => {
      const scoreboards = await Promise.all(
        years.map((year) =>
          fetchJson(`${ESPN}/${competition.espn}/scoreboard?dates=${year}&limit=1000`)
            .catch(() => null)
        )
      );
      const available = scoreboards.filter((scoreboard) => scoreboard !== null);
      return available.length
        ? {
            slug: competition.slug,
            name: competition.shortName,
            espn: competition.espn,
            matches: selectFootballMatchWindow(
              mergeFootballMatches([], available.flatMap(mapFootballScoreboard)),
              now
            ),
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
