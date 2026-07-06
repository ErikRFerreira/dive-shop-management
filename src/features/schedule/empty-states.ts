import type { ScheduleFilters } from './types';

export type ScheduleEmptyStateCopy = {
  title: string;
  description: string;
};

/**
 * Chooses empty-state copy for unfiltered, filtered, and unassigned schedule views.
 *
 * @param filters - Active schedule filters parsed from the URL.
 * @returns Title and description for the empty schedule card.
 */
export function getScheduleEmptyStateCopy(
  filters: ScheduleFilters,
): ScheduleEmptyStateCopy {
  if (filters.unassignedOnly) {
    return {
      title: 'No unassigned scheduled activities found',
      description:
        'Every scheduled activity matching these filters has staff assigned.',
    };
  }

  if (hasActiveScheduleFilters(filters)) {
    return {
      title: 'No scheduled activities found',
      description: 'Try changing the staff, schedule type, activity, or date.',
    };
  }

  return {
    title: 'No scheduled activities yet',
    description: 'Approved bookings will appear here after admin schedules them.',
  };
}

/**
 * Checks whether schedule filters should change the empty-state meaning.
 *
 * @param filters - Active schedule filters parsed from the URL.
 * @returns True when at least one non-default filter is active.
 */
function hasActiveScheduleFilters(filters: ScheduleFilters) {
  return Boolean(
    (filters.range && filters.range !== 'all') ||
      filters.scheduleType ||
      filters.staffId ||
      filters.activityType ||
      filters.unassignedOnly,
  );
}
