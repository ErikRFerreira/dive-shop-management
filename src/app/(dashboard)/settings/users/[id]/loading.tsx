import { StaffUserDetailLoadingSkeleton } from '@/components/settings/staff-user-detail-loading';

/**
 * Renders the loading fallback for the Staff User Details route.
 *
 * @returns A detail-shaped skeleton while authorization and data resolve.
 */
export default function Loading() {
  return <StaffUserDetailLoadingSkeleton />;
}
