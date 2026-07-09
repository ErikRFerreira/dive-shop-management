import { expect, test } from 'vitest';

import type {
  MyScheduleAssignment,
  ScheduleCalendarEvent,
  SchedulePageItem,
} from '@/features/schedule/types';
import {
  groupMyScheduleAssignmentsByDay,
  groupScheduleItemsByDate,
  formatScheduleDayLabel,
  serializeScheduleCalendarEvents,
} from '@/features/schedule/utils';
import {
  ActivityType,
  BookingCustomerRole,
  BookingSource,
  ScheduleAssignmentRole,
} from '@/generated/prisma/enums';

function scheduleItem(
  overrides: Partial<SchedulePageItem>,
): SchedulePageItem {
  return {
    scheduleItemId: 'schedule-1',
    bookingId: 'booking-1',
    date: new Date('2026-07-14T00:00:00.000Z'),
    startTime: null,
    activityType: ActivityType.FUN_DIVE,
    activityLabel: 'Fun Dive',
    activitySummary: 'Fun Dive',
    dayNumber: 1,
    totalDays: 1,
    dayLabel: null,
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

/**
 * Builds a default My Assignments row for grouping tests.
 *
 * @param overrides - Assignment fields to override for a specific scenario.
 * @returns A complete My Assignments row.
 */
function myAssignment(
  overrides: Partial<MyScheduleAssignment>,
): MyScheduleAssignment {
  return {
    scheduleItemId: 'schedule-1',
    bookingId: 'booking-1',
    date: new Date('2026-07-14T00:00:00.000Z'),
    startTime: null,
    endTime: null,
    isTimeTbd: true,
    activityType: ActivityType.FUN_DIVE,
    activityLabel: 'Fun Dive',
    activitySummary: 'Fun Dive',
    dayNumber: 1,
    totalDays: 1,
    dayLabel: null,
    activities: [],
    primaryCustomerName: null,
    customers: [],
    numberOfPeople: null,
    hotel: null,
    scheduleNotes: null,
    assignmentRole: ScheduleAssignmentRole.DIVEMASTER,
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

test('groups my schedule assignments into today tomorrow and upcoming buckets', () => {
  const groups = groupMyScheduleAssignmentsByDay(
    [
      myAssignment({
        scheduleItemId: 'today',
        date: new Date('2026-07-14T00:00:00.000Z'),
      }),
      myAssignment({
        scheduleItemId: 'tomorrow',
        bookingId: 'booking-2',
        date: new Date('2026-07-15T00:00:00.000Z'),
      }),
      myAssignment({
        scheduleItemId: 'upcoming',
        bookingId: 'booking-3',
        date: new Date('2026-07-16T00:00:00.000Z'),
      }),
    ],
    new Date('2026-07-14T09:30:00.000Z'),
  );

  expect(groups.map((group) => group.key)).toEqual([
    'today',
    'tomorrow',
    'upcoming',
  ]);
  expect(groups.map((group) => group.label)).toEqual([
    'Today',
    'Tomorrow',
    'Upcoming',
  ]);
});

test('groups my schedule assignments by the shop timezone day', () => {
  const groups = groupMyScheduleAssignmentsByDay(
    [
      myAssignment({
        scheduleItemId: 'today',
        date: new Date('2026-07-15T00:00:00.000Z'),
      }),
      myAssignment({
        scheduleItemId: 'tomorrow',
        bookingId: 'booking-2',
        date: new Date('2026-07-16T00:00:00.000Z'),
      }),
    ],
    new Date('2026-07-14T18:30:00.000Z'),
  );

  expect(groups.map((group) => group.key)).toEqual(['today', 'tomorrow']);
});

test('preserves my assignment order inside each bucket', () => {
  const groups = groupMyScheduleAssignmentsByDay(
    [
      myAssignment({ scheduleItemId: 'first' }),
      myAssignment({ scheduleItemId: 'second', bookingId: 'booking-2' }),
    ],
    new Date('2026-07-14T09:30:00.000Z'),
  );

  expect(groups).toHaveLength(1);
  expect(groups[0]?.items.map((item) => item.scheduleItemId)).toEqual([
    'first',
    'second',
  ]);
});

test('serializes calendar event date fields for client props', () => {
  const event: ScheduleCalendarEvent = {
    id: 'schedule-1',
    title: '[Unassigned] Fun Dive x2 Maria Santos',
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
    dayNumber: 1,
    totalDays: 1,
    dayLabel: null,
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
    customers: [
      {
        name: 'Maria Santos',
        chineseName: null,
        isPrimaryContact: true,
        role: BookingCustomerRole.PRIMARY_CONTACT,
      },
    ],
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

test('formats only multi-day schedule labels', () => {
  expect(formatScheduleDayLabel(1, 3)).toBe('Day 1/3');
  expect(formatScheduleDayLabel(null, 3)).toBe('Day 1/3');
  expect(formatScheduleDayLabel(1, 1)).toBeNull();
});
