import Link from 'next/link';

import { AssignmentBadge } from '@/components/common/assignment-badge';
import { StaffUserPagination } from '@/components/settings/staff-user-pagination';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { StaffUserListItem } from '@/features/settings/queries';
import type {
  StaffUserFilters,
  StaffUserListPagination,
} from '@/features/settings/types';
import { UserRole } from '@/generated/prisma/enums';
import { formatDisplayDate, formatEnumLabel } from '@/lib/format';
import { hasActiveStaffUserFilters } from './staff-user-list-helpers';

type BadgeColorScheme =
  | 'ocean'
  | 'primary'
  | 'pending'
  | 'info-alert'
  | 'scheduled'
  | 'unassigned';

const roleColorSchemes: Record<UserRole, BadgeColorScheme> = {
  [UserRole.ADMIN]: 'primary',
  [UserRole.MANAGER]: 'ocean',
  [UserRole.CUSTOMER_SERVICE]: 'info-alert',
  [UserRole.INSTRUCTOR]: 'scheduled',
  [UserRole.DIVEMASTER]: 'unassigned',
};

type StaffUserListProps = {
  filters: StaffUserFilters;
  pagination: StaffUserListPagination;
  staffUsers: StaffUserListItem[];
};

/**
 * Renders the staff-specific empty state for default or filtered results.
 *
 * @param props - Trusted filters used to distinguish database and filter emptiness.
 * @returns A calm empty-state card with clear-filters recovery when appropriate.
 */
function StaffUserEmptyState({ filters }: Pick<StaffUserListProps, 'filters'>) {
  const isFiltered = hasActiveStaffUserFilters(filters);

  return (
    <Card className="rounded-2xl border border-border bg-linear-to-b from-card to-card-glow shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          {isFiltered
            ? 'No staff users match these filters.'
            : 'No staff users yet.'}
        </CardTitle>
        <CardDescription>
          {isFiltered
            ? 'Try another search, role, or status.'
            : 'Staff users will appear here when accounts are added.'}
        </CardDescription>
      </CardHeader>
      {isFiltered ? (
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/settings">Clear filters</Link>
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}

/**
 * Renders safe staff records in the read-only Settings table.
 *
 * @param props - Staff rows, trusted filters, and resolved pagination metadata.
 * @returns Staff table, result summary and pagination, or a staff empty state.
 */
export function StaffUserList({
  filters,
  pagination,
  staffUsers,
}: StaffUserListProps) {
  if (staffUsers.length === 0) {
    return <StaffUserEmptyState filters={filters} />;
  }

  const firstResult = (pagination.page - 1) * pagination.pageSize + 1;
  const lastResult = Math.min(
    firstResult + staffUsers.length - 1,
    pagination.totalCount,
  );

  return (
    <section aria-label="Staff user results" className="space-y-3">
      <Card className="overflow-hidden rounded-2xl border border-border bg-linear-to-b from-card to-card-glow py-0 shadow-sm">
        <CardContent className="p-0">
          <Table aria-label="Staff users" className="table-fixed">
            <TableHeader>
              <TableRow className="border-b bg-muted/40">
                <TableHead className="h-12 w-[22%] pl-6 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  Name
                </TableHead>
                <TableHead className="h-12 w-[30%] text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  Email
                </TableHead>
                <TableHead className="h-12 w-[20%] text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  Role
                </TableHead>
                <TableHead className="h-12 w-[14%] text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  Status
                </TableHead>
                <TableHead className="h-12 w-[14%] pr-6 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  Updated
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffUsers.map((staffUser) => (
                <TableRow
                  className="border-b last:border-b-0"
                  key={staffUser.id}
                >
                  <TableCell className="whitespace-normal wrap-break-word py-5 pl-6 font-medium">
                    {staffUser.name}
                  </TableCell>
                  <TableCell className="whitespace-normal wrap-break-word py-5 text-muted-foreground">
                    {staffUser.email}
                  </TableCell>
                  <TableCell className="py-5">
                    <AssignmentBadge
                      colorScheme={roleColorSchemes[staffUser.role]}
                      label={formatEnumLabel(staffUser.role)}
                      showDot={false}
                    />
                  </TableCell>
                  <TableCell className="py-5">
                    <AssignmentBadge
                      colorScheme={staffUser.isActive ? 'scheduled' : 'unassigned'}
                      label={staffUser.isActive ? 'Active' : 'Inactive'}
                    />
                  </TableCell>
                  <TableCell className="py-5 pr-6 text-muted-foreground">
                    {formatDisplayDate(staffUser.updatedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>
          Showing {firstResult} to {lastResult} of {pagination.totalCount} staff
          users
        </p>
        <StaffUserPagination filters={filters} pagination={pagination} />
      </div>
    </section>
  );
}
