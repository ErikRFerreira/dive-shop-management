import { expect, test } from 'vitest';

import type {
  ScheduleCalendarEvent,
  SchedulePageItem,
} from '@/features/schedule/types';
import {
  groupScheduleItemsByDate,
  serializeScheduleCalendarEvents,
} from '@/features/schedule/utils';
import { ActivityType, BookingSource } from '@/generated/prisma/enums';

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
    assignments: [],
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

test('serializes calendar event date fields for client props', () => {
  const event: ScheduleCalendarEvent = {
    id: 'schedule-1',
    title: 'Fun Dive - Maria Santos - 2 pax',
    start: '2026-07-14T08:00:00',
    end: '2026-07-14T12:00:00',
    allDay: false,
    bookingId: 'booking-1',
    bookingReference: 'BOOK-1',
    scheduleItemId: 'schedule-1',
    date: new Date('2026-07-14T00:00:00.000Z'),
    startTime: '08:00',
    endTime: '12:00',
    activityType: ActivityType.FUN_DIVE,
    activityLabel: 'Fun Dive',
    activitySummary: 'Fun Dive',
    activities: [
      {
        id: 'activity-1',
        activityType: ActivityType.FUN_DIVE,
        activityLabel: 'Fun Dive',
        specialtyCourse: null,
        requestedDate: new Date('2026-07-14T00:00:00.000Z'),
        requestedTime: '08:00',
        notes: 'Two tanks.',
      },
    ],
    primaryCustomerName: 'Maria Santos',
    numberOfPeople: 2,
    hotel: 'Ocean View',
    source: BookingSource.WECHAT,
    referrerName: 'Lina',
    notes: 'Bring cash.',
    assignments: [],
    isTimeTbd: false,
  };

  expect(serializeScheduleCalendarEvents([event])).toEqual([
    expect.objectContaining({
      date: '2026-07-14T00:00:00.000Z',
      activities: [
        expect.objectContaining({
          requestedDate: '2026-07-14T00:00:00.000Z',
        }),
      ],
    }),
  ]);
});
