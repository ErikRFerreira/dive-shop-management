import { AddScheduledBookingParticipantDialog } from '@/components/bookings/add-scheduled-booking-participant-dialog';
import {
  getActiveBookingParticipants,
  getInactiveBookingParticipants,
} from '@/features/bookings/participants';

import type { BookingDetailsItem } from '@/features/bookings/queries';
import { BookingInfoSection } from './booking-info-layout';
import { ParticipantGroup } from './participant-group';

/**
 * Renders the grouped customer and diver detail cards.
 *
 * @param props - Booking customers, activity context, and participant status permission.
 * @returns Customers and divers section.
 */
export function CustomersDiversSection({
  booking,
  canManageParticipantStatus = false,
  includesFunDive,
}: {
  booking: BookingDetailsItem;
  canManageParticipantStatus?: boolean;
  includesFunDive: boolean;
}) {
  const activeParticipants = getActiveBookingParticipants(booking.customers);
  const historicalParticipants = getInactiveBookingParticipants(
    booking.customers,
  );

  return (
    <BookingInfoSection title="Customers & divers">
      {canManageParticipantStatus ? (
        <div className="flex justify-end sm:col-span-2">
          <AddScheduledBookingParticipantDialog booking={booking} />
        </div>
      ) : null}
      {booking.customers.length === 0 ? (
        <p className="text-sm text-muted-foreground sm:col-span-2">
          No customer or diver details.
        </p>
      ) : (
        <>
          <ParticipantGroup
            booking={booking}
            canManageParticipantStatus={canManageParticipantStatus}
            emptyMessage="No active participants."
            includesFunDive={includesFunDive}
            participants={activeParticipants}
            title="Active participants"
          />
          <ParticipantGroup
            booking={booking}
            canManageParticipantStatus={canManageParticipantStatus}
            includesFunDive={includesFunDive}
            isHistorical
            participants={historicalParticipants}
            title="Historical participants"
          />
        </>
      )}
    </BookingInfoSection>
  );
}
