import type { MyScheduleAssignment } from '@/features/schedule/types';
import { getActivityShortLabel } from '@/features/bookings/activity-utils';
import { getScheduleTimeSlotLabel } from '@/features/schedule/utils';

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
  const activityLabel = activity.activityType
    ? getActivityShortLabel({
        activityType: activity.activityType,
        specialtyCourse: activity.specialtyCourse,
      })
    : assignment.activityLabel;

  return activityLabel;
}

/**
 * Formats an assignment's operational slot for compact display.
 *
 * @param assignment - Assignment containing the persisted schedule slot.
 * @returns Staff-facing schedule slot label.
 */
export function formatAssignmentSlot(assignment: MyScheduleAssignment) {
  return getScheduleTimeSlotLabel(assignment.timeSlot);
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
