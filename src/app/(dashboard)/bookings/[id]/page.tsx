import BookingDetails from '@/components/bookings/booking-details';
import {
  canApproveBookingRequest,
  canCancelBooking,
  canReviewBooking,
  canEditBooking,
  canManageScheduledBookingParticipants,
  canResubmitBookingForApproval,
} from '@/features/bookings/permissions';
import { getBookingRequestById } from '@/features/bookings/queries';
import { canManageScheduleAssignments } from '@/features/schedule/permissions';
import { getAssignableStaff } from '@/features/schedule/queries';
import { BookingStatus } from '@/generated/prisma/enums';
import { requireCurrentUser } from '@/lib/current-user';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Renders the booking detail page with workflow, schedule assignment, and participant management context.
 *
 * @param props - Route params containing the booking request ID.
 * @returns The booking detail view, or a not-found response when inaccessible.
 */
async function BookingDetailsPage({ params }: Props) {
  const currentUser = await requireCurrentUser();
  requireDashboardRouteAccess(currentUser, 'bookings');
  const { id } = await params;
  const booking = await getBookingRequestById(currentUser, id);

  if (!booking) {
    return notFound();
  }

  const canManageAssignments =
    booking.scheduleItems.length > 0 &&
    booking.status === BookingStatus.SCHEDULED &&
    canManageScheduleAssignments(currentUser);
  const assignableStaff = canManageAssignments ? await getAssignableStaff() : [];

  return (
    <BookingDetails
      assignableStaff={assignableStaff}
      booking={booking}
      canCancel={
        booking.status === BookingStatus.SCHEDULED &&
        canCancelBooking(currentUser, booking.status)
      }
      canManageAssignments={canManageAssignments}
      canManageParticipantStatus={canManageScheduledBookingParticipants(
        currentUser,
        booking.status,
      )}
      canShowManagerAssignmentAvailabilityCopy={canApproveBookingRequest(
        currentUser,
      )}
      canReview={canReviewBooking(currentUser, booking.status)}
      canEdit={canEditBooking(
        currentUser,
        booking.createdById,
        booking.status,
      )}
      canResubmit={
        booking.status === BookingStatus.NEEDS_MORE_INFO &&
        canResubmitBookingForApproval(currentUser, booking.createdById)
      }
    />
  );
}

export default BookingDetailsPage;
