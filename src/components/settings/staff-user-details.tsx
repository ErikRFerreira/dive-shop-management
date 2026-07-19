import PageHeader from '@/components/common/page-header';
import { StaffUserRoleBadge } from '@/components/settings/staff-user-role-badge';
import { StaffUserStatusBadge } from '@/components/settings/staff-user-status-badge';
import type { StaffUserDetail } from '@/features/settings/queries';
import AccountDetails from './user-details/account-details';
import PlatformAccess from './user-details/platform-access';
import AccountActions from './user-details/account-actions';
type StaffUserDetailsProps = {
  currentUserId: string;
  isFinalActiveAdmin: boolean;
  staffUser: StaffUserDetail;
};

/**
 * Renders Staff User Details with safe edit and account-status controls.
 *
 * @param props - Safe staff fields, current-user identity, and advisory ADMIN state.
 * @returns Identity, account metadata, access summary, and safe account actions.
 */
export function StaffUserDetails({
  currentUserId,
  isFinalActiveAdmin,
  staffUser,
}: StaffUserDetailsProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <StaffUserRoleBadge role={staffUser.role} />
            <StaffUserStatusBadge isActive={staffUser.isActive} />
          </div>
        }
        description={staffUser.email}
        linkHref="/settings"
        linkLabel="Back to Staff Management"
        title={staffUser.name}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Main column */}
        <div className="flex flex-col gap-6 min-w-0">
          <AccountDetails
            currentUserId={currentUserId}
            isFinalActiveAdmin={isFinalActiveAdmin}
            staffUser={staffUser}
          />
          <PlatformAccess staffUser={staffUser} />
        </div>

        {/* Sidebar / actions column */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <AccountActions staffUser={staffUser} />
        </div>
      </div>
    </div>
  );
}
