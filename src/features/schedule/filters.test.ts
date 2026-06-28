import { expect, test } from 'vitest';

import { parseScheduleFiltersFromSearchParams } from '@/features/schedule/filters';
import { ActivityType } from '@/generated/prisma/enums';

test('parses valid schedule filters from search params', () => {
  expect(
    parseScheduleFiltersFromSearchParams({
      activityType: ActivityType.FUN_DIVE,
      range: 'today',
      staffId: ' staff-1 ',
      unassignedOnly: 'true',
    }),
  ).toEqual({
    activityType: ActivityType.FUN_DIVE,
    range: 'today',
    staffId: 'staff-1',
    unassignedOnly: true,
  });
});

test('ignores invalid schedule filter values', () => {
  expect(
    parseScheduleFiltersFromSearchParams({
      activityType: 'INVALID_ACTIVITY',
      range: 'yesterday',
      staffId: '   ',
      unassignedOnly: 'false',
    }),
  ).toEqual({});
});

test('uses the first value for repeated schedule filter params', () => {
  expect(
    parseScheduleFiltersFromSearchParams({
      activityType: [ActivityType.SNORKELING, ActivityType.FUN_DIVE],
      range: ['tomorrow', 'today'],
      staffId: ['staff-2', 'staff-3'],
      unassignedOnly: ['1', 'false'],
    }),
  ).toEqual({
    activityType: ActivityType.SNORKELING,
    range: 'tomorrow',
    staffId: 'staff-2',
    unassignedOnly: true,
  });
});
