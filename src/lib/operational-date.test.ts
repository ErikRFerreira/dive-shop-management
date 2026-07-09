import { expect, test } from 'vitest';

import {
  addUtcDateOnlyDays,
  getShopDateOnlyKey,
  getShopDateOnlyRange,
  getShopTodayDate,
  isPastShopDate,
  startOfUtcDateOnlyWeek,
  validateNotPastShopDate,
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

test('returns today in the shop date-only format', () => {
  expect(getShopTodayDate(new Date('2026-07-02T18:30:00.000Z'))).toEqual(
    new Date('2026-07-03T00:00:00.000Z'),
  );
});

test('detects only dates before the shop-local current date as past', () => {
  const now = new Date('2026-07-02T18:30:00.000Z');

  expect(isPastShopDate(new Date('2026-07-02T00:00:00.000Z'), now)).toBe(true);
  expect(isPastShopDate(new Date('2026-07-03T00:00:00.000Z'), now)).toBe(false);
  expect(isPastShopDate(new Date('2026-07-04T00:00:00.000Z'), now)).toBe(false);
});

test('returns a validation message only for past shop dates', () => {
  const now = new Date('2026-07-02T18:30:00.000Z');

  expect(
    validateNotPastShopDate(new Date('2026-07-02T00:00:00.000Z'), now),
  ).toBe('Requested date cannot be in the past.');
  expect(
    validateNotPastShopDate(new Date('2026-07-03T00:00:00.000Z'), now),
  ).toBeNull();
});
