import type { MyScheduleAssignment } from '@/features/schedule/types';

/**
 * Formats one booking activity line for cards and table rows.
 *
 * @param assignment - Parent assignment used for fallback activity label.
 * @param activity - Activity row attached to the booking.
 * @returns Activity label plus specialty course when one is recorded.
 */
export function formatAssignmentActivityLine(
  assignment: MyScheduleAssignment,
  activity: MyScheduleAssignment['activities'][number],
) {
  const activityLabel = activity.activityLabel ?? assignment.activityLabel;

  return activity.specialtyCourse
    ? `${activityLabel} - ${activity.specialtyCourse}`
    : activityLabel;
}

/**
 * Formats an assignment's start and end time for compact display.
 *
 * @param assignment - Assignment containing normalized time fields.
 * @returns `Time TBD`, a start time, or a start/end time range.
 */
export function formatAssignmentTime(assignment: MyScheduleAssignment) {
  if (assignment.isTimeTbd || !assignment.startTime) {
    return 'Time TBD';
  }

  return assignment.endTime
    ? `${assignment.startTime} - ${assignment.endTime}`
    : assignment.startTime;
}

/**
 * Formats operational hotel or pickup information with a consistent missing-value label.
 *
 * @param hotel - Hotel or pickup text mapped from the schedule assignment query.
 * @returns Recorded hotel/pickup text, or the staff-facing missing-value copy.
 */
export function formatHotelPickup(hotel: string | null) {
  return hotel ? `Hotel / pickup: ${hotel}` : 'Hotel / pickup: Not recorded';
}

/**
 * Formats the bounded upcoming table footer copy.
 *
 * @param visibleCount - Number of upcoming rows rendered.
 * @param totalCount - Total number of matching upcoming assignments.
 * @param limit - Maximum upcoming rows loaded for the table.
 * @returns Staff-facing copy explaining the bounded upcoming list.
 */
export function formatUpcomingShowingCopy(
  visibleCount: number,
  totalCount: number,
  limit: number,
) {
  if (totalCount > visibleCount && visibleCount === limit) {
    return `Showing next ${limit} assignments`;
  }

  return `Showing all ${visibleCount} upcoming assignments`;
}
