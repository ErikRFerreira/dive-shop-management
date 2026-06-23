import { expect, test } from 'vitest';

import {
  bookingFormDefaultValues,
  normalizeBookingFormValues,
} from '@/features/bookings/intake';
import { ActivityType } from '@/generated/prisma/enums';
import { validateBookingSubmission } from './validation';

test('allows incomplete bookings to remain drafts without submission validation', () => {
  const values = normalizeBookingFormValues({
    ...bookingFormDefaultValues,
    activityType: ActivityType.SPECIALTY_COURSE,
  });

  expect(values.specialtyCourse).toBeNull();
});

test('requires a specialty course for Specialty Course submissions', () => {
  const values = normalizeBookingFormValues({
    ...bookingFormDefaultValues,
    activityType: ActivityType.SPECIALTY_COURSE,
  });

  expect(validateBookingSubmission(values)).toBe(
    'Specialty course is required when submitting a Specialty Course booking.',
  );
});

test('accepts a Specialty Course submission with course details', () => {
  const values = normalizeBookingFormValues({
    ...bookingFormDefaultValues,
    activityType: ActivityType.SPECIALTY_COURSE,
    specialtyCourse: ' Nitrox ',
  });

  expect(validateBookingSubmission(values)).toBeNull();
});

test('requires fun diver details only for Fun Dive submissions', () => {
  const incompleteFunDive = normalizeBookingFormValues({
    ...bookingFormDefaultValues,
    activityType: ActivityType.FUN_DIVE,
  });
  const scubaReview = normalizeBookingFormValues({
    ...bookingFormDefaultValues,
    activityType: ActivityType.SCUBA_REVIEW,
  });

  expect(validateBookingSubmission(incompleteFunDive)).toBe(
    'Certification level is required when submitting a Fun Dive booking.',
  );
  expect(validateBookingSubmission(scubaReview)).toBeNull();
});
