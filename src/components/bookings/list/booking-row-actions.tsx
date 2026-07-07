import { getAvailableBookingRowActions } from '@/features/bookings/permissions';
import type { BookingListItem } from '@/features/bookings/queries';
import type { CurrentUser } from '@/lib/current-user';
import { BookingRowActionsMenu } from './booking-row-actions-menu';

type BookingRowActionsProps = {
  booking: BookingListItem;
  currentUser: Pick<CurrentUser, 'id' | 'role'>;
};

/**
 * Resolves and renders the role-aware row actions for a booking list row.
 *
 * @param props - Booking row and authenticated user used to resolve actions.
 * @returns A compact dropdown menu with available navigation and workflow actions.
 */
export function BookingRowActions({
  booking,
  currentUser,
}: BookingRowActionsProps) {
  const actions = getAvailableBookingRowActions(currentUser, booking);

  if (actions.length === 0) {
    return null;
  }

  return <BookingRowActionsMenu actions={actions} bookingId={booking.id} />;
}
