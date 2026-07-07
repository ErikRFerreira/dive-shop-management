import { CustomerDetailLoadingSkeleton } from '@/components/common/dashboard-loading-skeletons';

/**
 * Renders the loading fallback for customer detail routes.
 *
 * @returns A skeleton customer profile and booking history layout.
 */
export default function Loading() {
  return <CustomerDetailLoadingSkeleton />;
}
