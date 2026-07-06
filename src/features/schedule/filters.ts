import { ActivityType } from '@/generated/prisma/enums';
import type {
  ScheduleFilters,
  ScheduleRangeFilter,
  ScheduleTypeFilter,
} from '@/features/schedule/types';

export type ScheduleSearchParams = Record<
  string,
  string | string[] | undefined
>;

const scheduleRangeFilters = new Set<string>([
  'all',
  'today',
  'tomorrow',
  'this-week',
]);
const scheduleTypeFilters = new Set<string>(['fun-dives', 'courses']);

const activityTypes = new Set<string>(Object.values(ActivityType));
const allActivityTypes = Object.values(ActivityType);
const scheduleTypeActivityTypes: Record<ScheduleTypeFilter, ActivityType[]> = {
  'fun-dives': [ActivityType.FUN_DIVE],
  courses: [
    ActivityType.DISCOVER_SCUBA_DIVING,
    ActivityType.OPEN_WATER_COURSE,
    ActivityType.ADVANCED_OPEN_WATER_COURSE,
    ActivityType.RESCUE_DIVER_COURSE,
    ActivityType.SPECIALTY_COURSE,
  ],
};

/**
 * Parses URL search parameters into safe schedule query filters.
 *
 * @param searchParams - Plain Next.js page search params from the schedule URL.
 * @returns A normalized filter object containing only supported, non-conflicting values.
 */
export function parseScheduleFiltersFromSearchParams(
  searchParams: ScheduleSearchParams,
): ScheduleFilters {
  const range = parseScheduleRangeFilter(getFirstSearchParam(searchParams.range));
  const scheduleType = parseScheduleTypeFilter(
    getFirstSearchParam(searchParams.scheduleType),
  );
  const staffId = parseOptionalTextFilter(getFirstSearchParam(searchParams.staffId));
  const activityType = parseScheduleActivityType(
    getFirstSearchParam(searchParams.activityType),
  );
  const unassignedOnly = parseBooleanFilter(
    getFirstSearchParam(searchParams.unassignedOnly),
  );

  return normalizeScheduleFilters({
    ...(range ? { range } : {}),
    ...(scheduleType ? { scheduleType } : {}),
    ...(staffId ? { staffId } : {}),
    ...(activityType ? { activityType } : {}),
    ...(unassignedOnly ? { unassignedOnly } : {}),
  });
}

/**
 * Normalizes schedule filters so broad and exact activity filters cannot conflict
 * or duplicate each other.
 *
 * @param filters - Schedule filters from URL parsing or client-side updates.
 * @returns Filters with invalid exact activity selections removed.
 */
export function normalizeScheduleFilters(filters: ScheduleFilters): ScheduleFilters {
  if (filters.scheduleType === 'fun-dives' && filters.activityType) {
    const normalizedFilters = { ...filters };
    delete normalizedFilters.activityType;

    return normalizedFilters;
  }

  if (
    !filters.activityType ||
    isActivityTypeAllowedForScheduleType(
      filters.activityType,
      filters.scheduleType,
    )
  ) {
    return filters;
  }

  const normalizedFilters = { ...filters };
  delete normalizedFilters.activityType;

  return normalizedFilters;
}

/**
 * Returns the activity types that belong to a broad schedule type.
 *
 * @param scheduleType - Optional broad operational schedule category.
 * @returns Every supported activity for All, or the category-specific activity set.
 */
export function getActivityTypesForScheduleType(
  scheduleType: ScheduleTypeFilter | undefined,
) {
  return scheduleType ? scheduleTypeActivityTypes[scheduleType] : allActivityTypes;
}

/**
 * Returns activity options that should be available in the Activity dropdown.
 *
 * @param scheduleType - Optional broad operational schedule category.
 * @returns Activity enum values visible for the selected schedule type.
 */
export function getScheduleActivityFilterOptions(
  scheduleType: ScheduleTypeFilter | undefined,
) {
  if (scheduleType === 'fun-dives') {
    return [];
  }

  return getActivityTypesForScheduleType(scheduleType);
}

/**
 * Chooses the default Activity select text for the selected schedule type.
 *
 * @param scheduleType - Optional broad operational schedule category.
 * @returns Staff-facing label for the default Activity option.
 */
export function getDefaultScheduleActivityFilterLabel(
  scheduleType: ScheduleTypeFilter | undefined,
) {
  if (scheduleType === 'fun-dives') {
    return 'All fun dives';
  }

  if (scheduleType === 'courses') {
    return 'All course activities';
  }

  return 'All activities';
}

/**
 * Checks whether an exact activity can be used with a broad schedule type.
 *
 * @param activityType - Exact activity filter selected by the user.
 * @param scheduleType - Optional broad operational schedule category.
 * @returns True when the activity belongs to the selected broad category.
 */
export function isActivityTypeAllowedForScheduleType(
  activityType: ActivityType,
  scheduleType: ScheduleTypeFilter | undefined,
) {
  return getActivityTypesForScheduleType(scheduleType).includes(activityType);
}

/**
 * Preserves a selected activity only when it belongs to the selected schedule type
 * and still adds useful narrowing.
 *
 * @param activityType - Current exact activity filter.
 * @param scheduleType - Next broad operational schedule category.
 * @returns The activity type when still valid, otherwise undefined.
 */
export function getValidActivityTypeForScheduleType(
  activityType: ActivityType | undefined,
  scheduleType: ScheduleTypeFilter | undefined,
) {
  if (scheduleType === 'fun-dives') {
    return undefined;
  }

  return activityType &&
    isActivityTypeAllowedForScheduleType(activityType, scheduleType)
    ? activityType
    : undefined;
}

/**
 * Reads a deterministic first value from a search-param value.
 *
 * @param value - Single, array, or missing URL search-param value.
 * @returns The first string value, or undefined when absent.
 */
function getFirstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Parses a date-range shortcut from URL text.
 *
 * @param value - Raw range value from the URL.
 * @returns A supported range filter, or undefined for invalid input.
 */
function parseScheduleRangeFilter(
  value: string | undefined,
): ScheduleRangeFilter | undefined {
  return value && scheduleRangeFilters.has(value)
    ? (value as ScheduleRangeFilter)
    : undefined;
}

/**
 * Parses a broad operational schedule type from URL text.
 *
 * @param value - Raw schedule type from the URL.
 * @returns A supported schedule type filter, or undefined for invalid input.
 */
function parseScheduleTypeFilter(
  value: string | undefined,
): ScheduleTypeFilter | undefined {
  return value && scheduleTypeFilters.has(value)
    ? (value as ScheduleTypeFilter)
    : undefined;
}

/**
 * Parses a non-empty text filter from URL text.
 *
 * @param value - Raw text value from the URL.
 * @returns A trimmed value, or undefined when blank.
 */
function parseOptionalTextFilter(value: string | undefined) {
  const trimmedValue = value?.trim();
  return trimmedValue || undefined;
}

/**
 * Parses an activity enum value from URL text.
 *
 * @param value - Raw activity type from the URL.
 * @returns A supported ActivityType, or undefined for invalid input.
 */
function parseScheduleActivityType(
  value: string | undefined,
): ActivityType | undefined {
  return value && activityTypes.has(value)
    ? (value as ActivityType)
    : undefined;
}

/**
 * Parses boolean-ish URL text for opt-in filters.
 *
 * @param value - Raw boolean value from the URL.
 * @returns True only for explicit truthy filter values.
 */
function parseBooleanFilter(value: string | undefined) {
  return value === 'true' || value === '1';
}
