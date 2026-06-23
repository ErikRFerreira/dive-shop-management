import BookingDetails from '@/components/bookings/booking-details';
import { getBookingRequestById } from '@/features/bookings/queries';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ id: string }>;
};

async function BookingDetailsPage({ params }: Props) {
  const { id } = await params;
  const booking = await getBookingRequestById(id);

  if (!booking) {
    return notFound();
  }

  return <BookingDetails booking={booking} />;
}

export default BookingDetailsPage;
