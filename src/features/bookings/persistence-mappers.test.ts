import { expect, test } from 'vitest';

import { ActivityType } from '@/generated/prisma/enums';
import { mapBookingActivityCreateData } from './persistence-mappers';
import type { NormalizedBookingFormValues } from './types';

test('maps booking activity duration days into persistence data', () => {
  const activity = {
    activityType: ActivityType.OPEN_WATER_COURSE,
    specialtyCourse: null,
    durationDays: 3,
    requestedDate: new Date('2026-07-14T00:00:00.000Z'),
    requestedTime: null,
    notes: null,
  } satisfies NormalizedBookingFormValues['activities'][number];

  expect(mapBookingActivityCreateData(activity, 0)).toMatchObject({
    activityType: ActivityType.OPEN_WATER_COURSE,
    durationDays: 3,
    sortOrder: 0,
  });
});
