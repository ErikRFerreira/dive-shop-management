import type { BookingDetailsItem } from '@/features/bookings/queries';
import type { BookingActivityDisplayItem } from './booking-display-utils';
import { ActivitiesSection } from './activities-section';
import { BookingDepositPaymentSection } from './booking-deposit-payment-section';
import { BookingSummarySection } from './booking-summary-section';
import { CustomersDiversSection } from './customers-divers-section';
import { InternalNotesSection } from './internal-notes-section';
import { OriginalBookingMessageSection } from './original-booking-message-section';

type BookingMainSectionsProps = {
  activities: BookingActivityDisplayItem[];
  afterOriginalMessage?: React.ReactNode;
  afterSummary?: React.ReactNode;
  booking: BookingDetailsItem;
  canManageParticipantStatus?: boolean;
  includesFunDive: boolean;
  internalNotesVariant: 'details' | 'review';
  summaryTitle: string;
};

/**
 * Renders the shared left-column booking information sections.
 *
 * @param props - Booking data, normalized activities, page variants, optional slots, and participant status permission.
 * @returns Ordered left-column sections for booking detail and review pages.
 */
export function BookingMainSections({
  activities,
  afterOriginalMessage,
  afterSummary,
  booking,
  canManageParticipantStatus = false,
  includesFunDive,
  internalNotesVariant,
  summaryTitle,
}: BookingMainSectionsProps) {
  return (
    <main className="space-y-6">
      <BookingSummarySection
        activities={activities}
        booking={booking}
        title={summaryTitle}
      />
      {afterSummary}
      <OriginalBookingMessageSection notes={booking.notes} />
      {afterOriginalMessage}
      <ActivitiesSection activities={activities} />
      <CustomersDiversSection
        booking={booking}
        canManageParticipantStatus={canManageParticipantStatus}
        includesFunDive={includesFunDive}
      />
      <BookingDepositPaymentSection booking={booking} />
      <InternalNotesSection booking={booking} variant={internalNotesVariant} />
    </main>
  );
}
