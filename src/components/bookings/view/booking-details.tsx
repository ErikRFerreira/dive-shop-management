import { StickyRailLayout } from '@/components/common/sticky-rail-layout';
import PageHeader from '@/components/common/page-header';
import { BookingMainSections } from '@/components/bookings/booking-main-sections';
import type { BookingDetailsItem } from '@/features/bookings/queries';
import type { AssignableStaff } from '@/features/schedule/types';
import { BookingStatus } from '@/generated/prisma/enums';
import { getBookingDetailActions } from './booking-detail-actions';
import {
  getDisplayActivities,
  includesFunDiveActivity,
} from './booking-detail-display';
import { BookingDetailsRail } from './booking-details-rail';
import { NeedsMoreInfoWorkflow } from './sections/needs-more-info-workflow';
import { ScheduleSection } from './sections/schedule-section';

type Props = {
  assignableStaff: AssignableStaff[];
  booking: BookingDetailsItem;
  canEdit: boolean;
  canManageAssignments: boolean;
  canShowManagerAssignmentAvailabilityCopy: boolean;
  canReview: boolean;
  canResubmit: boolean;
};

/**
 * Renders the internal booking detail page content.
 *
 * @param props - Booking detail data plus workflow and assignment permissions.
 * @returns The booking detail UI with optional schedule assignment controls.
 */
function BookingDetails({
  assignableStaff,
  booking,
  canEdit,
  canManageAssignments,
  canShowManagerAssignmentAvailabilityCopy,
  canReview,
  canResubmit,
}: Props) {
  const activities = getDisplayActivities(booking);
  const actions = getBookingDetailActions(booking, canEdit, canReview);
  const includesFunDive = includesFunDiveActivity(activities);

  return (
    <>
      <PageHeader
        title="Booking details"
        description="Review the full booking request, customer details, and operational
            notes"
        linkLabel="Back to booking requests"
        linkHref="/bookings"
      />

      <StickyRailLayout
        className="lg:grid-cols-[minmax(0,1fr)_20rem]"
        contentClassName="space-y-6"
        railClassName="space-y-4"
        rail={
          <BookingDetailsRail
            actions={actions}
            activities={activities}
            booking={booking}
            canResubmit={canResubmit}
          />
        }
      >
        <BookingMainSections
          activities={activities}
          afterOriginalMessage={
            <ScheduleSection
              assignableStaff={assignableStaff}
              booking={booking}
              canManageAssignments={canManageAssignments}
              showManagerAssignmentAvailabilityCopy={
                canShowManagerAssignmentAvailabilityCopy
              }
            />
          }
          afterSummary={
            booking.status === BookingStatus.NEEDS_MORE_INFO ? (
              <NeedsMoreInfoWorkflow reason={booking.needsMoreInfoReason} />
            ) : null
          }
          booking={booking}
          includesFunDive={includesFunDive}
          internalNotesVariant="details"
          summaryTitle="Booking summary"
        />
      </StickyRailLayout>
    </>
  );
}

export default BookingDetails;
