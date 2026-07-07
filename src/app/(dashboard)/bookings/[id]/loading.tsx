import { BookingDetailLoadingSkeleton } from '@/components/common/dashboard-loading-skeletons';

/**
 * Renders the loading fallback for booking detail routes.
 *
 * @returns A skeleton booking detail layout with action rail.
 */
export default function Loading() {
  return <BookingDetailLoadingSkeleton />;
}
