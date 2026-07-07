import { CustomersLoadingSkeleton } from '@/components/common/dashboard-loading-skeletons';

/**
 * Renders the loading fallback for the customers search route.
 *
 * @returns A skeleton customer search and list layout.
 */
export default function Loading() {
  return <CustomersLoadingSkeleton />;
}
