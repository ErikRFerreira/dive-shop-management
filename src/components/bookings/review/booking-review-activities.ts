import type { BookingDetailsItem } from '@/features/bookings/queries';
import { ActivityType } from '@/generated/prisma/enums';

export type ReviewActivity = Pick<
  BookingDetailsItem['activities'][number],
  'id' | 'activityType' | 'specialtyCourse' | 'requestedDate' | 'requestedTime' | 'notes'
>;

/**
 * Returns activity rows for admin review, preserving the legacy booking fields fallback.
 *
 * @param booking - Booking detail payload being reviewed by an admin or manager.
 * @returns Activity rows from the relation, or one fallback row from legacy fields.
 */
export function getReviewActivities(booking: BookingDetailsItem): ReviewActivity[] {
  return booking.activities.length > 0
    ? booking.activities
    : [
        {
          id: 'legacy-summary',
          activityType: booking.activityType,
          specialtyCourse: booking.specialtyCourse,
          requestedDate: booking.requestedDate,
          requestedTime: booking.requestedTime,
          notes: null,
        },
      ];
}

/**
 * Checks whether normalized review activities include a fun dive.
 *
 * @param activities - Activity rows displayed on the admin review page.
 * @returns True when any activity is a fun dive.
 */
export function reviewActivitiesIncludeFunDive(activities: ReviewActivity[]) {
  return activities.some(
    (activity) => activity.activityType === ActivityType.FUN_DIVE,
  );
}

/**
 * Resolves the requested date/time shown in the review overview.
 *
 * @param booking - Booking detail payload with legacy requested fields.
 * @param activities - Normalized review activity rows.
 * @returns Requested date and time, preferring the first activity with a requested date.
 */
export function getReviewOverviewRequestedDateTime(
  booking: BookingDetailsItem,
  activities: ReviewActivity[],
) {
  const firstActivityWithDate =
    activities.find((activity) => activity.requestedDate) ?? activities[0];

  return {
    requestedDate:
      firstActivityWithDate?.requestedDate ?? booking.requestedDate,
    requestedTime:
      firstActivityWithDate?.requestedTime ?? booking.requestedTime ?? null,
  };
}
