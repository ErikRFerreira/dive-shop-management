import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StaffUserRoleBadge } from '@/components/settings/staff-user-role-badge';
import { StaffUserStatusBadge } from '@/components/settings/staff-user-status-badge';
import type { StaffUserDetail } from '@/features/settings/queries';
import { formatDisplayDateTime } from '@/lib/format';

type Props = {
  staffUser: StaffUserDetail;
};

/**
 * Presents a staff member's identity and account metadata in a read-only card.
 *
 * @param props - Staff details returned by the authorized settings query.
 * @returns The responsive account-details card with role and status badges.
 */
function AccountDetails({ staffUser }: Props) {
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
