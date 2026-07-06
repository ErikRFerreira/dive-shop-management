import { expect, test } from 'vitest';

import { ActivityType } from '@/generated/prisma/enums';
import { getScheduleEmptyStateCopy } from './empty-states';

test('uses a setup empty state when there are no active schedule filters', () => {
  expect(getScheduleEmptyStateCopy({})).toEqual({
    title: 'No scheduled activities yet',
    description: 'Approved bookings will appear here after admin schedules them.',
  });
});

test('uses a filtered empty state when active filters have no matches', () => {
  expect(
    getScheduleEmptyStateCopy({
      activityType: ActivityType.FUN_DIVE,
      scheduleType: 'fun-dives',
      staffId: 'staff-1',
    }),
  ).toEqual({
    title: 'No scheduled activities found',
    description: 'Try changing the staff, schedule type, activity, or date.',
  });
});

test('uses an unassigned empty state when the unassigned-only filter has no matches', () => {
  expect(getScheduleEmptyStateCopy({ unassignedOnly: true })).toEqual({
    title: 'No unassigned scheduled activities found',
    description:
      'Every scheduled activity matching these filters has staff assigned.',
  });
});
