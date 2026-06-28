import { ActivityType } from '@/generated/prisma/enums';
import type {
  ScheduleFilters,
  ScheduleRangeFilter,
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

const activityTypes = new Set<string>(Object.values(ActivityType));

/**
 * Parses URL search parameters into safe schedule query filters.
 *
 * @param searchParams - Plain Next.js page search params from the schedule URL.
 * @returns A normalized filter object containing only supported values.
 */
export function parseScheduleFiltersFromSearchParams(
  searchParams: ScheduleSearchParams,
): ScheduleFilters {
  const range = parseScheduleRangeFilter(getFirstSearchParam(searchParams.range));
  const staffId = parseOptionalTextFilter(getFirstSearchParam(searchParams.staffId));
  const activityType = parseScheduleActivityType(
    getFirstSearchParam(searchParams.activityType),
  );
  const unassignedOnly = parseBooleanFilter(
    getFirstSearchParam(searchParams.unassignedOnly),
  );

  return {
    ...(range ? { range } : {}),
    ...(staffId ? { staffId } : {}),
    ...(activityType ? { activityType } : {}),
    ...(unassignedOnly ? { unassignedOnly } : {}),
  };
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
