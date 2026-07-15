'use client';

import Link from 'next/link';
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
import {
  getDefaultScheduleActivityFilterLabel,
  getScheduleActivityFilterOptions,
  getValidActivityTypeForScheduleType,
  normalizeScheduleFilters,
} from '@/features/schedule/filters';
import type {
  ScheduleStaffFilterOption,
  ScheduleFilters as ScheduleFiltersValue,
} from '@/features/schedule/types';
import { formatScheduleActivityLabel } from '@/features/schedule/utils';
import { ActivityType } from '@/generated/prisma/enums';
import { formatEnumLabel } from '@/lib/format';
import { X } from 'lucide-react';

const allStaffValue = 'all-staff';
const allScheduleTypesValue = 'all-schedule-types';
const allActivitiesValue = 'all-activities';

type ScheduleFiltersProps = {
  staffFilterOptions: ScheduleStaffFilterOption[];
  disabled?: boolean;
  filters: ScheduleFiltersValue;
  isPending?: boolean;
  onFilterChange: (href: string) => void;
};

const selectClass =
  'h-9 truncate rounded-lg border border-border bg-background px-2.5 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 [&>span]:truncate';

/**
 * Renders URL-backed controls for filtering the internal schedule page.
 *
 * @param props - Current parsed filter state and staff available for filtering.
 * @returns A compact schedule filter bar.
 */
export function ScheduleFilters({
  staffFilterOptions,
  disabled = false,
  filters,
  isPending = false,
  onFilterChange,
}: ScheduleFiltersProps) {
  const staffSelectId = useId();
  const scheduleTypeSelectId = useId();
  const activitySelectId = useId();
  const unassignedOnlyId = useId();
  const hasActiveFilters = hasActiveScheduleFilters(filters);
  const activityOptions = getScheduleActivityFilterOptions(
    filters.scheduleType,
  );
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
    onFilterChange(buildScheduleFilterHref(filters, updates));
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
      className="rounded-2xl border border-border bg-card/60 p-3 shadow-sm sm:p-5 "
    >
      <h2 className="sr-only">Filters</h2>
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-48 gap-1">
          <Label
            htmlFor={staffSelectId}
            className="text-xs font-medium text-muted-foreground mb-0.5"
          >
            Staff
          </Label>
          <Select
            disabled={disabled || isPending}
            onValueChange={(value) =>
              updateFilters({
                staffId: value === allStaffValue ? undefined : value,
              })
            }
            value={filters.staffId ?? allStaffValue}
          >
            <SelectTrigger id={staffSelectId} className={selectClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={allStaffValue}>All staff</SelectItem>
              {staffFilterOptions.map((staff) => (
                <SelectItem key={staff.id} value={staff.id}>
                  {formatStaffFilterOption(staff)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid min-w-44 gap-1">
          <Label
            htmlFor={scheduleTypeSelectId}
            className="text-xs font-medium text-muted-foreground mb-0.5"
          >
            Schedule type
          </Label>
          <Select
            disabled={disabled || isPending}
            onValueChange={handleScheduleTypeChange}
            value={filters.scheduleType ?? allScheduleTypesValue}
          >
            <SelectTrigger id={scheduleTypeSelectId} className={selectClass}>
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
          <Label
            htmlFor={activitySelectId}
            className="text-xs font-medium text-muted-foreground mb-0.5"
          >
            Activity
          </Label>
          <Select
            disabled={disabled || isPending}
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
            <SelectTrigger id={activitySelectId} className={selectClass}>
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

        <div className="flex h-9 items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2 shadow-sm transition-colors hover:border-primary/50">
          <Checkbox
            checked={filters.unassignedOnly ?? false}
            disabled={disabled || isPending}
            id={unassignedOnlyId}
            onCheckedChange={(checked) =>
              updateFilters({
                unassignedOnly: checked === true ? true : undefined,
              })
            }
            className="size-4.5 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
          />
          <Label
            className="cursor-pointer select-none font-normal text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
            htmlFor={unassignedOnlyId}
          >
            Unassigned only
          </Label>
        </div>

        {hasActiveFilters ? (
          <Button
            asChild
            className={
              disabled || isPending
                ? 'pointer-events-none opacity-50'
                : undefined
            }
            size="sm"
            variant="ghost"
          >
            <Link
              aria-disabled={disabled || isPending}
              href="/schedule"
              onClick={(event) => {
                if (disabled || isPending) {
                  event.preventDefault();
                  return;
                }

                event.preventDefault();
                onFilterChange('/schedule');
              }}
              tabIndex={disabled || isPending ? -1 : undefined}
            >
              <X className="size-3.5" /> Clear filters
            </Link>
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
function formatStaffFilterOption(staff: ScheduleStaffFilterOption) {
  return `${staff.name} (${formatEnumLabel(staff.role)})`;
}
