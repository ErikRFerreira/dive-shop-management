import { BookingListLoadingSkeleton } from '@/components/common/dashboard-loading-skeletons';

/**
 * Renders the loading fallback for the bookings queue route.
 *
 * @returns A skeleton queue layout while booking data streams in.
 */
export default function Loading() {
  return <BookingListLoadingSkeleton />;
}
