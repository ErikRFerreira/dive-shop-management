import { expect, test } from 'vitest';

import {
  addUtcDateOnlyDays,
  getShopDateOnlyKey,
  getShopDateOnlyRange,
  startOfUtcDateOnlyWeek,
} from './operational-date';

test('returns the shop date key for an instant near the UTC day boundary', () => {
  expect(getShopDateOnlyKey(new Date('2026-07-02T18:30:00.000Z'))).toBe(
    '2026-07-03',
  );
});

test('builds UTC date-only bounds for the shop operational day', () => {
  expect(getShopDateOnlyRange(new Date('2026-07-02T18:30:00.000Z'))).toEqual({
    start: new Date('2026-07-03T00:00:00.000Z'),
    end: new Date('2026-07-04T00:00:00.000Z'),
  });
});

test('adds UTC date-only days without using the runtime timezone', () => {
  expect(addUtcDateOnlyDays(new Date('2026-07-03T00:00:00.000Z'), 2)).toEqual(
    new Date('2026-07-05T00:00:00.000Z'),
  );
});

test('finds the UTC date-only week start', () => {
  expect(startOfUtcDateOnlyWeek(new Date('2026-07-16T00:00:00.000Z'))).toEqual(
    new Date('2026-07-13T00:00:00.000Z'),
  );
});
