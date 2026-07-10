import { BookingMainSections } from '@/components/bookings/booking-main-sections';
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge';
import { StickyRailLayout } from '@/components/common/sticky-rail-layout';
import type { BookingDetailsItem } from '@/features/bookings/queries';
import { getActivityShortLabel } from '@/features/bookings/activity-utils';
import {
  getBookingReviewReadiness,
  getMissingBookingReviewInformation,
} from '@/features/bookings/review-requirements';
import {
  getReviewActivities,
  reviewActivitiesIncludeFunDive,
} from './booking-review-activities';
import { BookingReviewSidebar } from './booking-review-sidebar';
import PageHeader from '@/components/common/page-header';
import { ScheduleSection } from '../view/sections/schedule-section';
import { ScheduleTimeSlot } from '@/generated/prisma/enums';
import type { ReviewActivity } from './booking-review-activities';

type BookingReviewProps = {
  booking: BookingDetailsItem;
  canApprove: boolean;
};

/**
 * Builds approval form slot rows from the activities shown in review.
 *
 * @param activities - Review activities that will create schedule rows on approval.
 * @returns Activity-keyed schedule slot rows defaulting to TBD.
 */
function getApprovalScheduleActivities(activities: ReviewActivity[]) {
  return activities.map((activity, index) => ({
    id: activity.id === 'legacy-summary' ? 'legacy' : activity.id,
    label: `${index + 1}. ${getActivityShortLabel(activity)}`,
    defaultTimeSlot: ScheduleTimeSlot.TBD,
  }));
}

/**
 * Renders the admin review page for one booking request.
 *
 * @param props - Booking detail payload and approval permission flag.
 * @returns Admin review UI with a sticky decision rail and ordered review sections.
 */
export function BookingReview({ booking, canApprove }: BookingReviewProps) {
  const activities = getReviewActivities(booking);
  const includesFunDive = reviewActivitiesIncludeFunDive(activities);
  const missingInformation = getMissingBookingReviewInformation(booking);
  const reviewReadiness = getBookingReviewReadiness(booking);

  return (
    <StickyRailLayout
      className="lg:grid-cols-[minmax(0,1fr)_26rem]"
      contentClassName="space-y-6"
      railClassName="space-y-6"
      rail={
        <BookingReviewSidebar
          bookingId={booking.id}
          canApprove={canApprove}
          adminNotes={booking.adminNotes}
          missingInformation={missingInformation}
          reviewReadiness={reviewReadiness}
          scheduleActivities={getApprovalScheduleActivities(activities)}
          status={booking.status}
        />
      }
    >
      <PageHeader
        title="Booking review"
        description="Review the booking details and approve or reject the request."
        linkLabel="Back to booking details"
        linkHref={`/bookings/${booking.id}`}
        badge={<BookingStatusBadge status={booking.status} />}
      />

      <BookingMainSections
        activities={activities}
        afterOriginalMessage={
          <ScheduleSection
            assignableStaff={[]}
            booking={booking}
            canManageAssignments={false}
            showManagerAssignmentAvailabilityCopy
          />
        }
        booking={booking}
        includesFunDive={includesFunDive}
        internalNotesVariant="review"
        summaryTitle="Booking summary"
      />
    </StickyRailLayout>
  );
}
