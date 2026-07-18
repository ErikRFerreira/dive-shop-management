'use client';

import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useId,
  useState,
  useTransition,
} from 'react';
import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { StaffUserListPendingSkeleton } from '@/components/settings/staff-user-list-loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  staffUserRoleOptions,
  type StaffUserFilters,
  type StaffUserStatusFilter,
} from '@/features/settings/types';
import { UserRole } from '@/generated/prisma/enums';
import { formatEnumLabel } from '@/lib/format';
import {
  buildStaffUserListHref,
  hasActiveStaffUserFilters,
} from './staff-user-list-helpers';

const allRolesValue = 'all-roles';
const selectClass =
  'h-9 truncate rounded-lg border border-border bg-background px-2.5 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 [&>span]:truncate';

type StaffUserListShellProps = {
  children: ReactNode;
  filters: StaffUserFilters;
};

/**
 * Hosts URL-backed staff search and filters around server-rendered results.
 *
 * Search submits explicitly while role and status changes navigate immediately.
 * Every filter change returns to page 1 and shows a table-shaped pending state.
 *
 * @param props - Current trusted filters and rendered staff-list results.
 * @returns Accessible staff filters plus current or pending results.
 */
export function StaffUserListShell({
  children,
  filters,
}: StaffUserListShellProps) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.search);
  const [isPending, startTransition] = useTransition();
  const roleSelectId = useId();
  const statusSelectId = useId();
  const hasActiveFilters = hasActiveStaffUserFilters(filters);

  /** Navigates to normalized staff results and shows pending feedback. */
  function navigate(nextFilters: StaffUserFilters) {
    startTransition(() => {
      router.push(buildStaffUserListHref(nextFilters));
    });
  }

  /** Updates the controlled staff search field. */
  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    setSearch(event.target.value);
  }

  /** Applies the trimmed name/email search and resets pagination. */
  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate({ ...filters, search: search.trim(), page: 1 });
  }

  /** Applies an enum-backed role selection and resets pagination. */
  function handleRoleChange(value: string) {
    navigate({
      ...filters,
      role: value === allRolesValue ? undefined : (value as UserRole),
      page: 1,
    });
  }

  /** Applies a supported active-status selection and resets pagination. */
  function handleStatusChange(value: string) {
    navigate({
      ...filters,
      status: value as StaffUserStatusFilter,
      page: 1,
    });
  }

  /** Clears all staff filters and returns to the canonical Settings URL. */
  function handleClearFilters() {
    setSearch('');
    startTransition(() => {
      router.push('/settings');
    });
  }

  return (
    <>
      <section
        aria-label="Staff user filters"
        className="rounded-2xl border border-border bg-card/60 p-3 shadow-sm sm:p-5"
      >
        <form
          action="/settings"
          className="flex flex-wrap items-end gap-3"
          onSubmit={handleSearchSubmit}
        >
          <div className="grid min-w-64 flex-1 gap-1">
            <Label
              className="mb-0.5 text-xs font-medium text-muted-foreground"
              htmlFor="staff-user-search"
            >
              Search
            </Label>
            <div className="flex gap-2">
              <Input
                autoComplete="off"
                disabled={isPending}
                id="staff-user-search"
                name="search"
                onChange={handleSearchChange}
                placeholder="Search by name or email"
                type="search"
                value={search}
              />
              <Button disabled={isPending} type="submit">
                <Search className="size-4" />
                {isPending ? 'Updating...' : 'Search'}
              </Button>
            </div>
          </div>

          <div className="grid min-w-44 gap-1">
            <Label
              className="mb-0.5 text-xs font-medium text-muted-foreground"
              htmlFor={roleSelectId}
            >
              Role
            </Label>
            <Select
              disabled={isPending}
              onValueChange={handleRoleChange}
              value={filters.role ?? allRolesValue}
            >
              <SelectTrigger className={selectClass} id={roleSelectId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={allRolesValue}>All roles</SelectItem>
                {staffUserRoleOptions.map((role) => (
                  <SelectItem key={role} value={role}>
                    {formatEnumLabel(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid min-w-36 gap-1">
            <Label
              className="mb-0.5 text-xs font-medium text-muted-foreground"
              htmlFor={statusSelectId}
            >
              Status
            </Label>
            <Select
              disabled={isPending}
              onValueChange={handleStatusChange}
              value={filters.status}
            >
              <SelectTrigger className={selectClass} id={statusSelectId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters ? (
            <Button
              disabled={isPending}
              onClick={handleClearFilters}
              type="button"
              variant="ghost"
            >
              <X className="size-4" />
              Clear filters
            </Button>
          ) : null}
        </form>
      </section>

      {isPending ? <StaffUserListPendingSkeleton /> : children}
    </>
  );
}
