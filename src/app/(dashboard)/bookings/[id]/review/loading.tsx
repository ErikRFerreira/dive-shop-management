import { BookingDetailLoadingSkeleton } from '@/components/common/dashboard-loading-skeletons';

/**
 * Renders the loading fallback for booking review routes.
 *
 * @returns A skeleton review layout with decision rail.
 */
export default function Loading() {
  return <BookingDetailLoadingSkeleton />;
}
