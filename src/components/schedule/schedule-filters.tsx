'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  AssignableStaff,
  ScheduleFilters as ScheduleFiltersValue,
  ScheduleRangeFilter,
} from '@/features/schedule/types';
import { formatScheduleActivityLabel } from '@/features/schedule/utils';
import { ActivityType } from '@/generated/prisma/enums';
import { formatEnumLabel } from '@/lib/format';

const scheduleRangeOptions: {
  label: string;
  range?: ScheduleRangeFilter;
}[] = [
  { label: 'All', range: 'all' },
  { label: 'Today', range: 'today' },
  { label: 'Tomorrow', range: 'tomorrow' },
  { label: 'This week', range: 'this-week' },
];

const allStaffValue = 'all-staff';
const allActivitiesValue = 'all-activities';
const activityTypes = Object.values(ActivityType);

type ScheduleFiltersProps = {
  assignableStaff: AssignableStaff[];
  filters: ScheduleFiltersValue;
};

/**
 * Renders URL-backed controls for filtering the internal schedule page.
 *
 * @param props - Current parsed filter state and staff available for filtering.
 * @returns A compact schedule filter bar.
 */
export function ScheduleFilters({
  assignableStaff,
  filters,
}: ScheduleFiltersProps) {
  const router = useRouter();
  const staffSelectId = useId();
  const activitySelectId = useId();
  const unassignedOnlyId = useId();
  const selectedRange = filters.range ?? 'all';

  /**
   * Navigates to the schedule page with one filter updated.
   *
   * @param updates - Filter values to set or clear.
   */
  function updateFilters(updates: Partial<ScheduleFiltersValue>) {
    router.push(buildScheduleFilterHref(filters, updates));
  }

  return (
    <section
      aria-label="Schedule filters"
      className="rounded-lg border bg-card p-3 text-card-foreground"
    >
      <div className="flex flex-wrap items-end gap-3">
        <nav aria-label="Filter schedule by date range" className="flex flex-wrap gap-2">
          {scheduleRangeOptions.map((option) => {
            const isActive = selectedRange === option.range;

            return (
              <Button
                asChild
                key={option.label}
                size="sm"
                variant={isActive ? 'default' : 'outline'}
              >
                <Link
                  aria-current={isActive ? 'page' : undefined}
                  href={buildScheduleFilterHref(filters, {
                    range: option.range,
                  })}
                >
                  {option.label}
                </Link>
              </Button>
            );
          })}
        </nav>

        <div className="grid min-w-48 gap-1">
          <Label htmlFor={staffSelectId}>Staff</Label>
          <Select
            onValueChange={(value) =>
              updateFilters({
                staffId: value === allStaffValue ? undefined : value,
              })
            }
            value={filters.staffId ?? allStaffValue}
          >
            <SelectTrigger id={staffSelectId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={allStaffValue}>All staff</SelectItem>
              {assignableStaff.map((staff) => (
                <SelectItem key={staff.id} value={staff.id}>
                  {formatStaffFilterOption(staff)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid min-w-52 gap-1">
          <Label htmlFor={activitySelectId}>Activity</Label>
          <Select
            onValueChange={(value) =>
              updateFilters({
                activityType:
                  value === allActivitiesValue
                    ? undefined
                    : (value as ActivityType),
              })
            }
            value={filters.activityType ?? allActivitiesValue}
          >
            <SelectTrigger id={activitySelectId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={allActivitiesValue}>All activities</SelectItem>
              {activityTypes.map((activityType) => (
                <SelectItem key={activityType} value={activityType}>
                  {formatScheduleActivityLabel(activityType)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex h-8 items-center gap-2">
          <Checkbox
            checked={filters.unassignedOnly ?? false}
            id={unassignedOnlyId}
            onCheckedChange={(checked) =>
              updateFilters({
                unassignedOnly: checked === true ? true : undefined,
              })
            }
          />
          <Label className="font-normal" htmlFor={unassignedOnlyId}>
            Unassigned only
          </Label>
        </div>

        <Button asChild size="sm" variant="ghost">
          <Link href="/schedule">Clear filters</Link>
        </Button>
      </div>
    </section>
  );
}

/**
 * Builds a schedule URL with selected filter values added or removed.
 *
 * @param currentFilters - Current normalized schedule filters.
 * @param updates - Filter values to apply on top of the current filters.
 * @returns A `/schedule` href containing only active filter params.
 */
export function buildScheduleFilterHref(
  currentFilters: ScheduleFiltersValue,
  updates: Partial<ScheduleFiltersValue>,
) {
  const nextFilters = {
    ...currentFilters,
    ...updates,
  };
  const params = new URLSearchParams();

  if (nextFilters.range && nextFilters.range !== 'all') {
    params.set('range', nextFilters.range);
  }

  if (nextFilters.staffId) {
    params.set('staffId', nextFilters.staffId);
  }

  if (nextFilters.activityType) {
    params.set('activityType', nextFilters.activityType);
  }

  if (nextFilters.unassignedOnly) {
    params.set('unassignedOnly', 'true');
  }

  const query = params.toString();

  return query ? `/schedule?${query}` : '/schedule';
}

/**
 * Formats a staff filter option with role context for operational clarity.
 *
 * @param staff - Assignable staff user shown in the filter dropdown.
 * @returns A compact dropdown label.
 */
function formatStaffFilterOption(staff: AssignableStaff) {
  return `${staff.name} (${formatEnumLabel(staff.role)})`;
}
