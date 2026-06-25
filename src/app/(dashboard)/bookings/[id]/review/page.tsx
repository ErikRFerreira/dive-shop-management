import { notFound, redirect } from 'next/navigation';

import { BookingReview } from '@/components/bookings/booking-review';
import {
  canApproveBookingRequest,
  canReviewBookingRequest,
} from '@/features/bookings/permissions';
import { getBookingRequestById } from '@/features/bookings/queries';
import { requireCurrentUser } from '@/lib/current-user';

type Props = {
  params: Promise<{ id: string }>;
};

async function ReviewBooking({ params }: Props) {
  const currentUser = await requireCurrentUser();

  if (!canReviewBookingRequest(currentUser)) {
    redirect('/dashboard');
  }

  const { id } = await params;
  const booking = await getBookingRequestById(currentUser, id);

  if (!booking) {
    notFound();
  }

  return (
    <BookingReview
      booking={booking}
      canApprove={canApproveBookingRequest(currentUser)}
    />
  );
}

export default ReviewBooking;
