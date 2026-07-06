import { expect, test } from 'vitest';

import { parseScheduleFiltersFromSearchParams } from '@/features/schedule/filters';
import { ActivityType } from '@/generated/prisma/enums';

test('parses valid schedule filters from search params', () => {
  expect(
    parseScheduleFiltersFromSearchParams({
      activityType: ActivityType.RESCUE_DIVER_COURSE,
      range: 'today',
      scheduleType: 'courses',
      staffId: ' staff-1 ',
      unassignedOnly: 'true',
    }),
  ).toEqual({
    activityType: ActivityType.RESCUE_DIVER_COURSE,
    range: 'today',
    scheduleType: 'courses',
    staffId: 'staff-1',
    unassignedOnly: true,
  });
});

test('drops activity filters that conflict with the selected schedule type', () => {
  expect(
    parseScheduleFiltersFromSearchParams({
      activityType: ActivityType.FUN_DIVE,
      scheduleType: 'courses',
    }),
  ).toEqual({
    scheduleType: 'courses',
  });
});

test('drops redundant fun dive activity when fun dives schedule type is selected', () => {
  expect(
    parseScheduleFiltersFromSearchParams({
      activityType: ActivityType.FUN_DIVE,
      scheduleType: 'fun-dives',
    }),
  ).toEqual({
    scheduleType: 'fun-dives',
  });
});

test('ignores invalid schedule filter values', () => {
  expect(
    parseScheduleFiltersFromSearchParams({
      activityType: 'INVALID_ACTIVITY',
      range: 'yesterday',
      scheduleType: 'other-activities',
      staffId: '   ',
      unassignedOnly: 'false',
    }),
  ).toEqual({});
});

test('uses the first value for repeated schedule filter params', () => {
  expect(
    parseScheduleFiltersFromSearchParams({
      activityType: [ActivityType.FUN_DIVE, ActivityType.SNORKELING],
      range: ['tomorrow', 'today'],
      scheduleType: ['fun-dives', 'courses'],
      staffId: ['staff-2', 'staff-3'],
      unassignedOnly: ['1', 'false'],
    }),
  ).toEqual({
    range: 'tomorrow',
    scheduleType: 'fun-dives',
    staffId: 'staff-2',
    unassignedOnly: true,
  });
});
