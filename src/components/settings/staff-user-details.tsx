import { Check, ShieldCheck } from 'lucide-react';

import PageHeader from '@/components/common/page-header';
import { StaffUserRoleBadge } from '@/components/settings/staff-user-role-badge';
import { StaffUserStatusBadge } from '@/components/settings/staff-user-status-badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getStaffRoleAccessSummary } from '@/features/settings/access-summary';
import type { StaffUserDetail } from '@/features/settings/queries';
import { formatDisplayDateTime, formatEnumLabel } from '@/lib/format';

type StaffUserDetailsProps = {
  staffUser: StaffUserDetail;
};

/**
 * Renders the read-only Staff User Details experience for an authorized ADMIN.
 *
 * @param props - Safe selected staff fields returned by the detail query.
 * @returns Identity header, account metadata, and centralized access summary.
 */
export function StaffUserDetails({ staffUser }: StaffUserDetailsProps) {
  const accessSummary = getStaffRoleAccessSummary(staffUser.role);

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

      <Card
        aria-labelledby="account-details-heading"
        className="rounded-2xl border border-border bg-linear-to-b from-card to-card-glow shadow-sm"
        role="region"
      >
        <CardHeader className="border-b">
          <CardTitle id="account-details-heading">Account Details</CardTitle>
          <CardDescription>
            Read-only identity and account information for this staff record.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Full name
              </dt>
              <dd className="mt-1 wrap-break-word text-sm font-medium">
                {staffUser.name}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Email address
              </dt>
              <dd className="mt-1 wrap-break-word text-sm">
                {staffUser.email}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Role</dt>
              <dd className="mt-1 text-sm">
                {formatEnumLabel(staffUser.role)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Account status
              </dt>
              <dd className="mt-1 text-sm">
                {staffUser.isActive ? 'Active' : 'Inactive'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Created date
              </dt>
              <dd className="mt-1 text-sm">
                <time dateTime={staffUser.createdAt.toISOString()}>
                  {formatDisplayDateTime(staffUser.createdAt)}
                </time>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Last updated date
              </dt>
              <dd className="mt-1 text-sm">
                <time dateTime={staffUser.updatedAt.toISOString()}>
                  {formatDisplayDateTime(staffUser.updatedAt)}
                </time>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card
        aria-labelledby="platform-access-heading"
        className="rounded-2xl border border-border bg-linear-to-b from-card to-card-glow shadow-sm"
        role="region"
      >
        <CardHeader className="border-b">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </div>
            <div className="space-y-1">
              <CardTitle id="platform-access-heading">
                Platform Access
              </CardTitle>
              <CardDescription>
                Access is determined by the centralized role capability model.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {accessSummary.assignmentOnly ? (
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="font-medium">Assignment-only staff record</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {accessSummary.explanation}
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {accessSummary.items.map((item) => (
                <li
                  className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-4 py-3 text-sm font-medium"
                  key={item}
                >
                  <Check
                    aria-hidden="true"
                    className="size-4 shrink-0 text-scheduled"
                  />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
