import { StaffUsersLoadingSkeleton } from '@/components/settings/staff-user-list-loading';

/**
 * Renders the Settings loading fallback while authorization and staff data resolve.
 *
 * @returns A page-shaped skeleton matching the Staff Management layout.
 */
export default function Loading() {
  return <StaffUsersLoadingSkeleton />;
}

