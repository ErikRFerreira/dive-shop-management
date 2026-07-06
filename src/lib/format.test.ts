import { expect, test } from 'vitest';

import { formatRecentActivityTime } from './format';

test('formats same-day updates in minutes', () => {
  expect(
    formatRecentActivityTime(new Date('2026-07-03T11:48:00.000Z'), {
      now: new Date('2026-07-03T12:00:00.000Z'),
    }),
  ).toBe('12 min ago');
});

test('formats same-day updates in whole hours', () => {
  expect(
    formatRecentActivityTime(new Date('2026-07-03T08:30:00.000Z'), {
      now: new Date('2026-07-03T12:00:00.000Z'),
    }),
  ).toBe('3 hours ago');
});

test('formats yesterday updates with a 24-hour time label', () => {
  expect(
    formatRecentActivityTime(new Date('2026-07-02T06:20:00.000Z'), {
      now: new Date('2026-07-03T12:00:00.000Z'),
    }),
  ).toBe('Yesterday at 14:20');
});

test('formats older updates using day distance and 24-hour time', () => {
  expect(
    formatRecentActivityTime(new Date('2026-07-01T06:20:00.000Z'), {
      now: new Date('2026-07-03T12:00:00.000Z'),
    }),
  ).toBe('2 days ago at 14:20');
});

test('returns fallback text when no value is provided', () => {
  expect(formatRecentActivityTime(null)).toBe('—');
  expect(
    formatRecentActivityTime(undefined, { emptyValue: 'No updates yet' }),
  ).toBe('No updates yet');
});
