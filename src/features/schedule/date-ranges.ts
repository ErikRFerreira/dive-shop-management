import type { ScheduleRangeFilter } from '@/features/schedule/types';
import {
  addUtcDateOnlyDays,
  getShopDateOnlyRange,
  startOfUtcDateOnlyWeek,
  type DateOnlyRange,
} from '@/lib/operational-date';

/** Inclusive start and exclusive end bounds for a schedule date filter. */
export type ScheduleDateRange = DateOnlyRange;

/**
 * Calculates the date window for a schedule range shortcut.
 *
 * @param range - The selected range shortcut, or undefined for no date filter.
 * @param baseDate - Date used as "today" for deterministic tests.
 * @returns Inclusive start and exclusive end dates, or null for all dates.
 */
export function getScheduleDateRangeForFilter(
  range: ScheduleRangeFilter | undefined,
  baseDate = new Date(),
): ScheduleDateRange | null {
  if (!range || range === 'all') {
    return null;
  }

  if (range === 'today') {
    return getShopDateOnlyRange(baseDate);
  }

  if (range === 'tomorrow') {
    return getShopDateOnlyRange(baseDate, 1);
  }

  const today = getShopDateOnlyRange(baseDate).start;
  const weekStart = startOfUtcWeek(today);

  return {
    start: weekStart,
    end: addUtcDateOnlyDays(weekStart, 7),
  };
}

/**
 * Finds the Monday UTC week start for the provided date.
 *
 * @param date - Date inside the desired week.
 * @returns Monday at UTC midnight for the week containing the date.
 */
function startOfUtcWeek(date: Date) {
  return startOfUtcDateOnlyWeek(date);
}
