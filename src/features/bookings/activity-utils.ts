import { ActivityType } from '@/generated/prisma/enums';
import { formatEnumLabel } from '@/lib/format';

const DEFAULT_ACTIVITY_DURATION_DAYS: Partial<Record<ActivityType, number>> = {
  [ActivityType.DISCOVER_SCUBA_DIVING]: 1,
  [ActivityType.FUN_DIVE]: 1,
  [ActivityType.OPEN_WATER_COURSE]: 3,
  [ActivityType.ADVANCED_OPEN_WATER_COURSE]: 2,
  [ActivityType.RESCUE_DIVER_COURSE]: 3,
  [ActivityType.EMERGENCY_FIRST_RESPONSE]: 1,
  [ActivityType.SPECIALTY_COURSE]: 1,
};

const GENERIC_SPECIALTY_NAMES = new Set([
  'course',
  'specialty',
  'specialty course',
]);

export type ActivityLabelInput = {
  activityType: ActivityType | string | null | undefined;
  specialtyCourse?: string | null;
};

/**
 * Returns the default booking activity duration for operational intake.
 *
 * @param activityType - Activity type selected for a booking activity.
 * @returns Default day count for the activity, falling back to one day for unknown or legacy values.
 */
export function getDefaultActivityDurationDays(
  activityType: ActivityType | string | null | undefined,
) {
  return activityType && activityType in DEFAULT_ACTIVITY_DURATION_DAYS
    ? DEFAULT_ACTIVITY_DURATION_DAYS[activityType as ActivityType]!
    : 1;
}

/**
 * Checks whether a Specialty Course name is specific enough for approval.
 *
 * Submit validation should reject blank or generic labels so staff capture the
 * actual specialty, such as Nitrox, Deep, Wreck, or Sidemount.
 *
 * @param specialtyCourse - Browser or normalized specialty name value.
 * @returns True when the trimmed value is a useful specialty name.
 */
export function hasUsefulSpecialtyCourseName(
  specialtyCourse: string | null | undefined,
) {
  const normalized = specialtyCourse?.trim().toLowerCase();

  return Boolean(
    normalized &&
      normalized.length >= 2 &&
      !GENERIC_SPECIALTY_NAMES.has(normalized),
  );
}

/**
 * Formats a booking activity's full display label.
 *
 * Specialty courses prefer the recorded specialty name so staff see labels like
 * `Nitrox` instead of a generic `Specialty Course` label.
 *
 * @param activity - Activity fields required to resolve the display label.
 * @returns Full staff-facing activity label.
 */
export function getActivityDisplayLabel(activity: ActivityLabelInput) {
  const specialtyName = activity.specialtyCourse?.trim();

  if (
    activity.activityType === ActivityType.SPECIALTY_COURSE &&
    specialtyName
  ) {
    return specialtyName;
  }

  return (
    formatEnumLabel(activity.activityType, { emptyValue: null }) ??
    specialtyName ??
    '\u2014'
  );
}

/**
 * Formats a compact booking activity label for dense operational UI.
 *
 * @param activity - Activity fields required to resolve the compact label.
 * @returns Short activity label, preserving specialty names when present.
 */
export function getActivityShortLabel(activity: ActivityLabelInput) {
  const specialtyName = activity.specialtyCourse?.trim();

  if (
    activity.activityType === ActivityType.SPECIALTY_COURSE &&
    specialtyName
  ) {
    return specialtyName;
  }

  switch (activity.activityType) {
    case ActivityType.DISCOVER_SCUBA_DIVING:
      return 'DSD';
    case ActivityType.OPEN_WATER_COURSE:
      return 'Open Water';
    case ActivityType.ADVANCED_OPEN_WATER_COURSE:
      return 'Advanced Open Water';
    case ActivityType.EMERGENCY_FIRST_RESPONSE:
      return 'EFR';
    default:
      return getActivityDisplayLabel(activity);
  }
}

/**
 * Formats a duration day count for booking activity display.
 *
 * @param durationDays - Persisted or derived activity duration.
 * @returns Singular or plural day label for staff-facing activity cards.
 */
export function formatActivityDurationDays(
  durationDays: number | null | undefined,
) {
  const days =
    typeof durationDays === 'number' && Number.isInteger(durationDays)
      ? durationDays
      : 1;

  return days === 1 ? '1 day' : `${days} days`;
}
