import Link from 'next/link';

import { StickyRailLayout } from '@/components/common/sticky-rail-layout';
import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import type { BookingDetailsItem } from '@/features/bookings/queries';
import type { AssignableStaff } from '@/features/schedule/types';
import { BookingStatus } from '@/generated/prisma/enums';
import { ArrowLeft } from 'lucide-react';
import { getBookingDetailActions } from './booking-detail-actions';
import {
  getDisplayActivities,
  includesFunDiveActivity,
} from './booking-detail-display';
import { BookingDetailsRail } from './booking-details-rail';
import { ActivitiesSection } from './sections/activities-section';
import { BookingReferenceCard } from './sections/booking-reference-card';
import { BookingSummarySection } from './sections/booking-summary-section';
import { CustomersDiversSection } from './sections/customers-divers-section';
import { DepositPaymentSection } from './sections/deposit-payment-section';
import { NeedsMoreInfoWorkflow } from './sections/needs-more-info-workflow';
import { NotesSection } from './sections/notes-section';
import { OriginalBookingMessage } from './sections/original-booking-message';
import { ScheduleSection } from './sections/schedule-section';

type Props = {
  assignableStaff: AssignableStaff[];
  booking: BookingDetailsItem;
  canEdit: boolean;
  canManageAssignments: boolean;
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
  canReview,
  canResubmit,
}: Props) {
  const activities = getDisplayActivities(booking);
  const actions = getBookingDetailActions(booking, canEdit, canReview);
  const includesFunDive = includesFunDiveActivity(activities);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-4">
        <Button asChild variant="ghost" className="-ml-3 w-fit">
          <Link href="/bookings">
            <ArrowLeft className="size-4" />
            Back to booking requests
          </Link>
        </Button>
        <PageHeader
          title="Booking details"
          description="Review the full booking request, customer details, and operational
            notes"
        />
      </header>

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
        <BookingReferenceCard activities={activities} booking={booking} />
        {booking.status === BookingStatus.NEEDS_MORE_INFO ? (
          <NeedsMoreInfoWorkflow reason={booking.needsMoreInfoReason} />
        ) : null}
        <OriginalBookingMessage notes={booking.notes} />
        <BookingSummarySection booking={booking} />
        <ScheduleSection
          assignableStaff={assignableStaff}
          booking={booking}
          canManageAssignments={canManageAssignments}
        />
        <ActivitiesSection activities={activities} />
        <CustomersDiversSection
          booking={booking}
          includesFunDive={includesFunDive}
        />
        <DepositPaymentSection booking={booking} />
        <NotesSection booking={booking} />
      </StickyRailLayout>
    </div>
  );
}

export default BookingDetails;
