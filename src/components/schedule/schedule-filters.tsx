'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useTransition } from 'react';

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
import {
  getDefaultScheduleActivityFilterLabel,
  getScheduleActivityFilterOptions,
  getValidActivityTypeForScheduleType,
  normalizeScheduleFilters,
} from '@/features/schedule/filters';
import type {
  AssignableStaff,
  ScheduleFilters as ScheduleFiltersValue,
} from '@/features/schedule/types';
import { formatScheduleActivityLabel } from '@/features/schedule/utils';
import { ActivityType } from '@/generated/prisma/enums';
import { formatEnumLabel } from '@/lib/format';

const allStaffValue = 'all-staff';
const allScheduleTypesValue = 'all-schedule-types';
const allActivitiesValue = 'all-activities';

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
  const scheduleTypeSelectId = useId();
  const activitySelectId = useId();
  const unassignedOnlyId = useId();
  const [isPending, startTransition] = useTransition();
  const hasActiveFilters = hasActiveScheduleFilters(filters);
  const activityOptions = getScheduleActivityFilterOptions(filters.scheduleType);
  const defaultActivityLabel = getDefaultScheduleActivityFilterLabel(
    filters.scheduleType,
  );
  const selectedActivityType = getValidActivityTypeForScheduleType(
    filters.activityType,
    filters.scheduleType,
  );

  /**
   * Navigates to the schedule page with one operational filter updated.
   *
   * @param updates - Filter values to set or clear.
   */
  function updateFilters(updates: Partial<ScheduleFiltersValue>) {
    startTransition(() => {
      router.push(buildScheduleFilterHref(filters, updates));
    });
  }

  /**
   * Updates the broad schedule type and clears an incompatible exact activity.
   *
   * @param value - Selected schedule type value from the dropdown.
   */
  function handleScheduleTypeChange(value: string) {
    const scheduleType =
      value === allScheduleTypesValue
        ? undefined
        : (value as ScheduleFiltersValue['scheduleType']);

    updateFilters({
      scheduleType,
      activityType: getValidActivityTypeForScheduleType(
        filters.activityType,
        scheduleType,
      ),
    });
  }

  return (
    <section
      aria-label="Schedule filters"
      className="rounded-lg border bg-card p-3 text-card-foreground"
    >
      <h2 className="sr-only">Filters</h2>
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-48 gap-1">
          <Label htmlFor={staffSelectId}>Staff</Label>
          <Select
            disabled={isPending}
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

        <div className="grid min-w-44 gap-1">
          <Label htmlFor={scheduleTypeSelectId}>Schedule type</Label>
          <Select
            disabled={isPending}
            onValueChange={handleScheduleTypeChange}
            value={filters.scheduleType ?? allScheduleTypesValue}
          >
            <SelectTrigger id={scheduleTypeSelectId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={allScheduleTypesValue}>All</SelectItem>
              <SelectItem value="fun-dives">Fun dives</SelectItem>
              <SelectItem value="courses">Courses</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid min-w-52 gap-1">
          <Label htmlFor={activitySelectId}>Activity</Label>
          <Select
            disabled={isPending}
            onValueChange={(value) =>
              updateFilters({
                activityType:
                  value === allActivitiesValue
                    ? undefined
                    : (value as ActivityType),
              })
            }
            value={selectedActivityType ?? allActivitiesValue}
          >
            <SelectTrigger id={activitySelectId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={allActivitiesValue}>
                {defaultActivityLabel}
              </SelectItem>
              {activityOptions.map((activityType) => (
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
            disabled={isPending}
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

        {isPending ? (
          <p aria-live="polite" className="pb-1 text-sm text-muted-foreground">
            Updating filters...
          </p>
        ) : null}

        {hasActiveFilters ? (
          <Button asChild size="sm" variant="ghost">
            <Link href="/schedule">Clear filters</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Builds a schedule URL with selected filter values added, removed, and normalized.
 *
 * @param currentFilters - Current normalized schedule filters.
 * @param updates - Filter values to apply on top of the current filters.
 * @returns A `/schedule` href containing only active filter params.
 */
export function buildScheduleFilterHref(
  currentFilters: ScheduleFiltersValue,
  updates: Partial<ScheduleFiltersValue>,
) {
  const nextFilters = normalizeScheduleFilters({
    ...currentFilters,
    ...updates,
  });
  const params = new URLSearchParams();

  if (nextFilters.range && nextFilters.range !== 'all') {
    params.set('range', nextFilters.range);
  }

  if (nextFilters.staffId) {
    params.set('staffId', nextFilters.staffId);
  }

  if (nextFilters.scheduleType) {
    params.set('scheduleType', nextFilters.scheduleType);
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
 * Checks whether any schedule filter is currently active.
 *
 * @param filters - Current normalized schedule filters.
 * @returns True when at least one filter should be clearable.
 */
function hasActiveScheduleFilters(filters: ScheduleFiltersValue) {
  return Boolean(
    (filters.range && filters.range !== 'all') ||
    filters.scheduleType ||
    filters.staffId ||
    filters.activityType ||
    filters.unassignedOnly,
  );
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
