import { notFound } from 'next/navigation';

import { StaffUserDetails } from '@/components/settings/staff-user-details';
import {
  getHasAnotherActiveAdmin,
  getStaffUserById,
} from '@/features/settings/queries';
import { UserRole } from '@/generated/prisma/enums';
import { requireCurrentUser } from '@/lib/current-user';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';

type StaffUserDetailsPageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Renders the ADMIN-only staff details route with safe account controls.
 *
 * @param props - Dynamic route parameters containing the requested staff ID.
 * @returns Staff details with advisory status safeguards, or not-found behavior.
 */
async function StaffUserDetailsPage({ params }: StaffUserDetailsPageProps) {
  const currentUser = await requireCurrentUser();
  requireDashboardRouteAccess(currentUser, 'settings');
  const { id } = await params;
  const staffUser = await getStaffUserById(currentUser, id);

  if (!staffUser) {
    notFound();
  }

  const isFinalActiveAdmin =
    staffUser.role === UserRole.ADMIN &&
    staffUser.isActive &&
    !(await getHasAnotherActiveAdmin(currentUser, staffUser.id));

  return (
    <StaffUserDetails
      currentUserId={currentUser.id}
      isFinalActiveAdmin={isFinalActiveAdmin}
      staffUser={staffUser}
    />
  );
}

export default StaffUserDetailsPage;
