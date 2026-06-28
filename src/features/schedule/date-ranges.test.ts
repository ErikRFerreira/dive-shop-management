import { expect, test } from 'vitest';

import { getScheduleDateRangeForFilter } from '@/features/schedule/date-ranges';

test('returns null for all or missing schedule range filters', () => {
  expect(getScheduleDateRangeForFilter('all')).toBeNull();
  expect(getScheduleDateRangeForFilter(undefined)).toBeNull();
});

test('calculates the today schedule date range', () => {
  expect(
    getScheduleDateRangeForFilter(
      'today',
      new Date('2026-07-15T18:30:00.000Z'),
    ),
  ).toEqual({
    start: new Date('2026-07-15T00:00:00.000Z'),
    end: new Date('2026-07-16T00:00:00.000Z'),
  });
});

test('calculates the tomorrow schedule date range', () => {
  expect(
    getScheduleDateRangeForFilter(
      'tomorrow',
      new Date('2026-07-15T18:30:00.000Z'),
    ),
  ).toEqual({
    start: new Date('2026-07-16T00:00:00.000Z'),
    end: new Date('2026-07-17T00:00:00.000Z'),
  });
});

test('calculates this week as Monday through next Monday', () => {
  expect(
    getScheduleDateRangeForFilter(
      'this-week',
      new Date('2026-07-15T18:30:00.000Z'),
    ),
  ).toEqual({
    start: new Date('2026-07-13T00:00:00.000Z'),
    end: new Date('2026-07-20T00:00:00.000Z'),
  });
});
