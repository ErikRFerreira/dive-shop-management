import { notFound } from 'next/navigation';

import { StaffUserDetails } from '@/components/settings/staff-user-details';
import { getStaffUserById } from '@/features/settings/queries';
import { requireCurrentUser } from '@/lib/current-user';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';

type StaffUserDetailsPageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Renders the ADMIN-only, read-only Staff User Details route.
 *
 * @param props - Dynamic route parameters containing the requested staff ID.
 * @returns The safe staff detail view, or the project not-found response.
 */
async function StaffUserDetailsPage({ params }: StaffUserDetailsPageProps) {
  const currentUser = await requireCurrentUser();
  requireDashboardRouteAccess(currentUser, 'settings');
  const { id } = await params;
  const staffUser = await getStaffUserById(currentUser, id);

  if (!staffUser) {
    notFound();
  }

  return <StaffUserDetails staffUser={staffUser} />;
}

export default StaffUserDetailsPage;
