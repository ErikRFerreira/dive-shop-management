import { Plus } from 'lucide-react';

import PageHeader from '@/components/common/page-header';
import { StaffUserList } from '@/components/settings/staff-user-list';
import { StaffUserListShell } from '@/components/settings/staff-user-list-shell';
import { Button } from '@/components/ui/button';
import { getStaffUsers } from '@/features/settings/queries';
import {
  parseStaffUserSearchParams,
  type StaffUserSearchParams,
} from '@/features/settings/validation';
import { requireCurrentUser } from '@/lib/current-user';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';

type SettingsPageProps = {
  searchParams: Promise<StaffUserSearchParams>;
};

/**
 * Renders the ADMIN-only, read-only Staff Management Settings page.
 *
 * @param props - Async App Router URL parameters for staff search and filtering.
 * @returns Staff filters, safe staff rows, and honest future-action scaffolding.
 */
async function SettingsPage({ searchParams }: SettingsPageProps) {
  const currentUser = await requireCurrentUser();
  requireDashboardRouteAccess(currentUser, 'settings');
  const filters = parseStaffUserSearchParams(await searchParams);
  const { staffUsers, pagination } = await getStaffUsers(currentUser, filters);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Settings"
          description="Manage staff accounts, roles, and platform access."
        />

        <div>
          <Button
            aria-describedby="create-staff-user-availability"
            disabled
            title="Staff user creation is not available yet."
          >
            <Plus className="size-4" />
            Create Staff User
          </Button>
          <span className="sr-only" id="create-staff-user-availability">
            Staff user creation is not available yet.
          </span>
        </div>
      </div>

      <section aria-labelledby="staff-users-heading" className="space-y-4">
        <div className="space-y-1.5">
          <h2
            className="font-heading text-xl font-semibold tracking-tight"
            id="staff-users-heading"
          >
            Staff Users
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage who can access the dive shop tools and what they can do.
          </p>
        </div>

        <StaffUserListShell filters={filters}>
          <StaffUserList
            filters={filters}
            pagination={pagination}
            staffUsers={staffUsers}
          />
        </StaffUserListShell>
      </section>
    </div>
  );
}

export default SettingsPage;
