// Cloudflare Pages Function: GET /api/match?event=<id>
// Returns rich per-match detail (lineups, stats, timeline, commentary,
// recent form and head-to-head) from ESPN's match-summary endpoint.

import { COMPETITIONS } from '../../src/lib/competitions';
import { espnCompetitionSummaryUrl, mapSummary } from '../../src/lib/espn';

const ALLOWED_LEAGUES = new Set(COMPETITIONS.map((competition) => competition.espn));
const RESPONSE_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
};

async function fetchJson(url: string, timeoutMs = 7000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'golazo/1.0' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

export const onRequestGet: PagesFunction = async ({ request }) => {
  const event = new URL(request.url).searchParams.get('event');
  const league = new URL(request.url).searchParams.get('league') || 'fifa.world';
  if (!event || !/^\d+$/.test(event)) {
    return new Response(JSON.stringify({ error: 'missing or invalid event id' }), {
      status: 400,
      headers: RESPONSE_HEADERS,
    });
  }
  if (!ALLOWED_LEAGUES.has(league)) {
    return new Response(JSON.stringify({ error: 'unsupported competition' }), {
      status: 400,
      headers: RESPONSE_HEADERS,
    });
  }
  const json = await fetchJson(espnCompetitionSummaryUrl(league, event)).catch(() => null);
  if (!json) {
    return new Response(JSON.stringify({ error: 'upstream unavailable' }), {
      status: 502,
      headers: RESPONSE_HEADERS,
    });
  }
  const detail = mapSummary(json, event);
  return new Response(JSON.stringify(detail), {
    headers: {
      ...RESPONSE_HEADERS,
      'cache-control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=120',
    },
  });
};
