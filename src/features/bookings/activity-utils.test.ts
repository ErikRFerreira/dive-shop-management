import { expect, test } from 'vitest';

import {
  formatActivityDurationDays,
  getActivityDisplayLabel,
  getActivityShortLabel,
  getDefaultActivityDurationDays,
  hasUsefulSpecialtyCourseName,
} from './activity-utils';
import { ActivityType } from '@/generated/prisma/enums';

test.each([
  [ActivityType.DISCOVER_SCUBA_DIVING, 1],
  [ActivityType.FUN_DIVE, 1],
  [ActivityType.OPEN_WATER_COURSE, 3],
  [ActivityType.ADVANCED_OPEN_WATER_COURSE, 2],
  [ActivityType.RESCUE_DIVER_COURSE, 3],
  [ActivityType.EMERGENCY_FIRST_RESPONSE, 1],
  [ActivityType.SPECIALTY_COURSE, 1],
] as const)('defaults %s duration days', (activityType, durationDays) => {
  expect(getDefaultActivityDurationDays(activityType)).toBe(durationDays);
});

test('formats specialty course labels with the specialty name', () => {
  expect(
    getActivityDisplayLabel({
      activityType: ActivityType.SPECIALTY_COURSE,
      specialtyCourse: 'Nitrox',
    }),
  ).toBe('Nitrox');
  expect(
    getActivityDisplayLabel({
      activityType: ActivityType.SPECIALTY_COURSE,
      specialtyCourse: null,
    }),
  ).toBe('Specialty Course');
});

test('formats compact activity labels', () => {
  expect(
    getActivityShortLabel({
      activityType: ActivityType.EMERGENCY_FIRST_RESPONSE,
    }),
  ).toBe('EFR');
  expect(
    getActivityShortLabel({
      activityType: ActivityType.SPECIALTY_COURSE,
      specialtyCourse: 'Deep',
    }),
  ).toBe('Deep');
});

test('formats duration days for display', () => {
  expect(formatActivityDurationDays(1)).toBe('1 day');
  expect(formatActivityDurationDays(3)).toBe('3 days');
  expect(formatActivityDurationDays(null)).toBe('1 day');
});

test.each([
  ['Nitrox', true],
  [' Deep ', true],
  ['N', false],
  ['', false],
  ['specialty', false],
  ['Specialty Course', false],
  ['course', false],
] as const)(
  'checks whether %s is a useful specialty course name',
  (specialtyCourse, expected) => {
    expect(hasUsefulSpecialtyCourseName(specialtyCourse)).toBe(expected);
  },
);
