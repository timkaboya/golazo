import { describe, it, expect } from 'vitest';
import {
  dayKey,
  formatClock,
  formatDayHeading,
  formatTime,
  kickoffMs,
  LIVE_BUFFER_MS,
  partsInTz,
  statusOf,
  timeBucket,
  todayKey,
} from '../src/lib/time';

const KO = '2026-06-12T19:00:00Z';
const koMs = new Date(KO).getTime();

describe('statusOf', () => {
  it('converts kickoff time to epoch milliseconds', () => {
    expect(kickoffMs({ utc: KO })).toBe(koMs);
  });

  it('is upcoming before kickoff', () => {
    expect(statusOf({ utc: KO }, koMs - 1000)).toBe('upcoming');
  });
  it('is live at kickoff', () => {
    expect(statusOf({ utc: KO }, koMs)).toBe('live');
  });
  it('is live within the buffer', () => {
    expect(statusOf({ utc: KO }, koMs + LIVE_BUFFER_MS - 1)).toBe('live');
  });
  it('is finished after the buffer', () => {
    expect(statusOf({ utc: KO }, koMs + LIVE_BUFFER_MS)).toBe('finished');
  });
});

describe('timeBucket', () => {
  it('buckets by part of day', () => {
    expect(timeBucket(6)).toBe('t-mo');
    expect(timeBucket(13)).toBe('t-af');
    expect(timeBucket(19)).toBe('t-ev');
    expect(timeBucket(23)).toBe('t-ni');
    expect(timeBucket(2)).toBe('t-ni');
  });
});

describe('timezone conversion', () => {
  it('converts UTC to the correct wall-clock day across timezones', () => {
    // 01:00 UTC on Jun 12 is still Jun 11 in New York.
    expect(dayKey('2026-06-12T01:00:00Z', 'America/New_York')).toBe('2026-06-11');
    // ...but Jun 12 in Nairobi (UTC+3).
    expect(dayKey('2026-06-12T01:00:00Z', 'Africa/Nairobi')).toBe('2026-06-12');
  });
  it('extracts local hour correctly (DST-aware)', () => {
    // 19:00 UTC in New York in June (EDT, UTC-4) => 15:00.
    expect(partsInTz('2026-06-12T19:00:00Z', 'America/New_York').hour).toBe(15);
    // 19:00 UTC in Nairobi (UTC+3) => 22:00.
    expect(partsInTz('2026-06-12T19:00:00Z', 'Africa/Nairobi').hour).toBe(22);
  });

  it('builds today keys from an injected clock', () => {
    expect(todayKey('America/New_York', new Date('2026-06-12T01:00:00Z').getTime())).toBe(
      '2026-06-11'
    );
  });

  it('formats match and update times in the selected timezone', () => {
    expect(formatTime(KO, 'America/New_York')).toBe('3:00 PM');
    expect(formatDayHeading(KO, 'America/New_York')).toBe('Fri, Jun 12');
    expect(formatClock(koMs, 'America/New_York')).toBe('03:00 PM');
  });
});
