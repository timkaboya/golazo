import { useEffect, useState } from 'preact/hooks';
import { fetchFootballScores } from '../lib/api';
import type { FootballScoresSnapshot } from '../lib/football-types';

const REFRESH_INTERVAL_MS = 60_000;

export type LiveScoreState = 'loading' | 'current' | 'stale';

export function useFootballScores(league?: string) {
  const [snapshot, setSnapshot] = useState<FootballScoresSnapshot | null>(null);
  const [state, setState] = useState<LiveScoreState>('loading');

  useEffect(() => {
    let disposed = false;
    let inFlight = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    const refresh = async () => {
      if (inFlight || document.visibilityState !== 'visible') return;
      inFlight = true;
      const next = await fetchFootballScores(league);
      if (!disposed) {
        if (next) {
          setSnapshot(next);
          setState('current');
        } else {
          setState('stale');
        }
      }
      inFlight = false;
    };
    const start = () => {
      if (!interval) interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    };
    const stop = () => {
      if (interval) clearInterval(interval);
      interval = undefined;
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (document.visibilityState === 'visible') {
          void refresh();
          start();
        }
      } else {
        stop();
      }
    };

    void refresh();
    start();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      disposed = true;
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [league]);

  return { snapshot, state };
}
