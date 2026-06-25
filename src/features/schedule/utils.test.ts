import { expect, test } from 'vitest';

import type { SchedulePageItem } from '@/features/schedule/types';
import { groupScheduleItemsByDate } from '@/features/schedule/utils';
import { ActivityType } from '@/generated/prisma/enums';

function scheduleItem(
  overrides: Partial<SchedulePageItem>,
): SchedulePageItem {
  return {
    scheduleItemId: 'schedule-1',
    bookingId: 'booking-1',
    date: new Date('2026-07-14T00:00:00.000Z'),
    startTime: null,
    activityType: ActivityType.FUN_DIVE,
    primaryCustomerName: null,
    numberOfPeople: null,
    hotel: null,
    source: null,
    referrerName: null,
    notes: null,
    ...overrides,
  };
}

test('groups schedule items by date', () => {
  const groups = groupScheduleItemsByDate([
    scheduleItem({ scheduleItemId: 'schedule-1' }),
    scheduleItem({
      scheduleItemId: 'schedule-2',
      bookingId: 'booking-2',
      date: new Date('2026-07-15T00:00:00.000Z'),
    }),
  ]);

  expect(groups).toHaveLength(2);
  expect(groups.map((group) => group.dateKey)).toEqual([
    '2026-07-14',
    '2026-07-15',
  ]);
});

test('preserves schedule item order inside each date group', () => {
  const groups = groupScheduleItemsByDate([
    scheduleItem({ scheduleItemId: 'schedule-1', startTime: '08:00' }),
    scheduleItem({
      scheduleItemId: 'schedule-2',
      bookingId: 'booking-2',
      startTime: '10:00',
    }),
  ]);

  expect(groups).toHaveLength(1);
  expect(groups[0]?.items.map((item) => item.scheduleItemId)).toEqual([
    'schedule-1',
    'schedule-2',
  ]);
});

test('returns no date groups for an empty schedule', () => {
  expect(groupScheduleItemsByDate([])).toEqual([]);
});
