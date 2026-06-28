import type { ScheduleRangeFilter } from '@/features/schedule/types';

/** Inclusive start and exclusive end bounds for a schedule date filter. */
export type ScheduleDateRange = {
  start: Date;
  end: Date;
};

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

  const today = startOfUtcDate(baseDate);

  if (range === 'today') {
    return {
      start: today,
      end: addUtcDays(today, 1),
    };
  }

  if (range === 'tomorrow') {
    const tomorrow = addUtcDays(today, 1);

    return {
      start: tomorrow,
      end: addUtcDays(tomorrow, 1),
    };
  }

  const weekStart = startOfUtcWeek(today);

  return {
    start: weekStart,
    end: addUtcDays(weekStart, 7),
  };
}

/**
 * Normalizes a date to midnight UTC for date-only schedule comparisons.
 *
 * @param date - Source date to normalize.
 * @returns A new Date at UTC midnight for the same UTC calendar date.
 */
function startOfUtcDate(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Adds whole UTC days without mutating the input date.
 *
 * @param date - Starting date.
 * @param days - Number of days to add.
 * @returns A new Date offset by the requested number of days.
 */
function addUtcDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

/**
 * Finds the Monday UTC week start for the provided date.
 *
 * @param date - Date inside the desired week.
 * @returns Monday at UTC midnight for the week containing the date.
 */
function startOfUtcWeek(date: Date) {
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  return addUtcDays(date, -daysSinceMonday);
}
