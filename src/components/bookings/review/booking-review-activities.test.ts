import { expect, test } from 'vitest';

import type { BookingDetailsItem } from '@/features/bookings/queries';
import { ActivityType } from '@/generated/prisma/enums';
import {
  getReviewActivities,
  getReviewOverviewRequestedDateTime,
  reviewActivitiesIncludeFunDive,
} from './booking-review-activities';

/**
 * Builds a partial booking detail test double for review activity helpers.
 *
 * @param overrides - Booking fields required by the current helper scenario.
 * @returns Booking detail test double.
 */
function booking(overrides: Partial<BookingDetailsItem>): BookingDetailsItem {
  return {
    activities: [],
    activityType: null,
    specialtyCourse: null,
    requestedDate: null,
    requestedTime: null,
    ...overrides,
  } as BookingDetailsItem;
}

test('uses legacy activity fields when a reviewed booking has no activity rows', () => {
  const requestedDate = new Date('2026-07-14T00:00:00.000Z');

  expect(
    getReviewActivities(
      booking({
        activityType: ActivityType.SPECIALTY_COURSE,
        specialtyCourse: 'Nitrox',
        requestedDate,
        requestedTime: '08:00',
      }),
    ),
  ).toEqual([
    {
      id: 'legacy-summary',
      activityType: ActivityType.SPECIALTY_COURSE,
      specialtyCourse: 'Nitrox',
      durationDays: null,
      requestedDate,
      requestedTime: '08:00',
      notes: null,
    },
  ]);
});

test('detects fun dives from normalized review activities', () => {
  expect(
    reviewActivitiesIncludeFunDive([
      {
        id: 'activity-1',
        activityType: ActivityType.OPEN_WATER_COURSE,
        specialtyCourse: null,
        durationDays: 3,
        requestedDate: null,
        requestedTime: null,
        notes: null,
      },
      {
        id: 'activity-2',
        activityType: ActivityType.FUN_DIVE,
        specialtyCourse: null,
        durationDays: 1,
        requestedDate: null,
        requestedTime: null,
        notes: null,
      },
    ]),
  ).toBe(true);
  expect(
    reviewActivitiesIncludeFunDive([
      {
        id: 'activity-1',
        activityType: ActivityType.OPEN_WATER_COURSE,
        specialtyCourse: null,
        durationDays: 3,
        requestedDate: null,
        requestedTime: null,
        notes: null,
      },
    ]),
  ).toBe(false);
});

test('uses the first dated activity for the review overview requested date and time', () => {
  const firstDate = new Date('2026-07-14T00:00:00.000Z');

  expect(
    getReviewOverviewRequestedDateTime(
      booking({
        requestedDate: new Date('2026-07-10T00:00:00.000Z'),
        requestedTime: '07:00',
      }),
      [
        {
          id: 'activity-1',
          activityType: ActivityType.OPEN_WATER_COURSE,
          specialtyCourse: null,
          durationDays: 3,
          requestedDate: null,
          requestedTime: null,
          notes: null,
        },
        {
          id: 'activity-2',
          activityType: ActivityType.FUN_DIVE,
          specialtyCourse: null,
          durationDays: 1,
          requestedDate: firstDate,
          requestedTime: '10:30',
          notes: null,
        },
      ],
    ),
  ).toEqual({
    requestedDate: firstDate,
    requestedTime: '10:30',
  });
});
