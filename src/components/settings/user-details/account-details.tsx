import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StaffUserRoleBadge } from '@/components/settings/staff-user-role-badge';
import { StaffUserStatusAction } from '@/components/settings/staff-user-status-action';
import { StaffUserStatusBadge } from '@/components/settings/staff-user-status-badge';
import type { StaffUserDetail } from '@/features/settings/queries';
import { isStaffLoginRole } from '@/features/settings/types';
import { formatDisplayDateTime } from '@/lib/format';

type Props = {
  currentUserId: string;
  isFinalActiveAdmin: boolean;
  staffUser: StaffUserDetail;
};

/**
 * Presents staff identity, metadata, and supported account-status controls.
 *
 * @param props - Staff details plus current-user and final-ADMIN advisory state.
 * @returns The account card with role, status, and safe activation controls.
 */
function AccountDetails({
  currentUserId,
  isFinalActiveAdmin,
  staffUser,
}: Props) {
  return (
    <Card
      aria-labelledby="account-details-heading"
      className="gap-0 rounded-[2rem] border border-border/80 bg-linear-to-b from-card to-card-glow py-0 shadow-sm ring-0"
      role="region"
    >
      <CardHeader className="px-6 pt-6 pb-5 sm:px-7 sm:pt-7">
        <CardTitle id="account-details-heading" className="text-lg">
          Account Details
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 sm:px-7 sm:pb-7">
        <dl className="space-y-4 pb-5">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Full name
            </dt>
            <dd className="mt-1 wrap-break-word text-base font-medium">
              {staffUser.name}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Email address
            </dt>
            <dd className="mt-1 wrap-break-word text-base">
              {staffUser.email}
            </dd>
          </div>
        </dl>

        <dl className="grid gap-5 border-y py-4 sm:grid-cols-2 sm:gap-8">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Role</dt>
            <dd className="mt-2">
              <StaffUserRoleBadge role={staffUser.role} showDot />
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Account Status
            </dt>
            <dd className="mt-2">
              <StaffUserStatusBadge isActive={staffUser.isActive} />
              {isStaffLoginRole(staffUser.role) ? (
                <StaffUserStatusAction
                  isCurrentUser={currentUserId === staffUser.id}
                  isFinalActiveAdmin={isFinalActiveAdmin}
                  staffUser={{
                    id: staffUser.id,
                    name: staffUser.name,
                    isActive: staffUser.isActive,
                  }}
                />
              ) : null}
            </dd>
          </div>
        </dl>

        <dl className="grid gap-5 pt-4 sm:grid-cols-2 sm:gap-8">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Created
            </dt>
            <dd className="mt-1 text-base">
              <time dateTime={staffUser.createdAt.toISOString()}>
                {formatDisplayDateTime(staffUser.createdAt)}
              </time>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Last updated
            </dt>
            <dd className="mt-1 text-base">
              <time dateTime={staffUser.updatedAt.toISOString()}>
                {formatDisplayDateTime(staffUser.updatedAt)}
              </time>
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

export default AccountDetails;
