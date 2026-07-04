import { BookingStatus } from '@/generated/prisma/enums';
import type { BookingDetailsItem } from '@/features/bookings/queries';

export type BookingDetailAction = {
  href: string;
  label: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
};

/**
 * Builds navigation actions from booking status and permissions.
 *
 * @param booking - Booking detail payload used to resolve workflow state.
 * @param canEdit - Whether the current user may edit this booking.
 * @param canReview - Whether the current user may review this booking.
 * @returns Ordered actions for the sticky operational rail.
 */
export function getBookingDetailActions(
  booking: BookingDetailsItem,
  canEdit: boolean,
  canReview: boolean,
): BookingDetailAction[] {
  const actions: BookingDetailAction[] = [];
  const editHref = `/bookings/${booking.id}/edit`;

  if (booking.status === BookingStatus.DRAFT && canEdit) {
    actions.push({ href: editHref, label: 'Edit booking' });
  }

  if (booking.status === BookingStatus.PENDING_APPROVAL) {
    if (canReview) {
      actions.push({
        href: `/bookings/${booking.id}/review`,
        label: 'Review booking',
      });
    }

    if (canEdit) {
      actions.push({
        href: editHref,
        label: 'Edit booking',
        variant: 'outline',
      });
    }
  }

  if (booking.status === BookingStatus.NEEDS_MORE_INFO && canEdit) {
    actions.push({ href: editHref, label: 'Fix details' });
  }

  if (
    (booking.status === BookingStatus.SCHEDULED ||
      booking.status === BookingStatus.APPROVED) &&
    booking.scheduleItem
  ) {
    actions.push({ href: '/schedule', label: 'View schedule' });
  }

  if (
    (booking.status === BookingStatus.SCHEDULED ||
      booking.status === BookingStatus.APPROVED) &&
    canEdit
  ) {
    actions.push({
      href: editHref,
      label: 'Edit booking',
      variant: 'outline',
    });
  }

  actions.push({
    href: '/bookings',
    label: 'Back to booking requests',
    variant: 'outline',
  });

  return actions;
}
