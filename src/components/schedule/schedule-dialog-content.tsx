'use client';

import {
  CalendarCheck,
  CalendarClock,
  ExternalLink,
  FileText,
  MapPin,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { AssignmentBadge } from '@/components/common/assignment-badge';

import { ScheduleAssignmentsList } from '@/components/schedule/schedule-assignments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  AssignableStaff,
  SerializedScheduleCalendarEvent,
} from '@/features/schedule/types';
import { ActivityType } from '@/generated/prisma/enums';
import { formatDisplayDate, formatEnumLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

type ScheduleEventDialogContentProps = {
  assignableStaff: AssignableStaff[];
  canManageAssignments: boolean;
  canViewBookingDetails: boolean;
  event: SerializedScheduleCalendarEvent;
};

/**
 * Renders the clicked schedule event summary inside the dialog.
 *
 * @param props - The selected schedule event to summarize.
 * @returns Staff-facing booking summary content and an optional booking detail link.
 */
export function ScheduleEventDialogContent({
  assignableStaff,
  canManageAssignments,
  canViewBookingDetails,
  event,
}: ScheduleEventDialogContentProps) {
  const activityCategory = getActivityCategoryLabel(event.activityType);
  const hasAssignments = event.assignments.length > 0;
  const [isManagingAssignments, setIsManagingAssignments] = useState(false);

  /**
   * Toggles assignment editing while keeping the operations summary visible.
   */
  function handleManageAssignmentsToggle() {
    setIsManagingAssignments((currentValue) => !currentValue);
  }

  return (
    <>
      <DialogHeader className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <ScheduleDialogHeaderBadges
          activityCategory={activityCategory}
          needsStaff={!hasAssignments}
        />
        <DialogTitle className="font-heading text-base font-semibold tracking-tight text-foreground flex items-center">
          <CalendarCheck className="h-6 w-6 mr-2" />
          {event.title}
        </DialogTitle>
      </DialogHeader>

      <div
        className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
        data-testid="schedule-dialog-body"
      >
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <SummaryField
              icon={CalendarClock}
              label="Date / time"
              value={formatDateTimeSummary(event)}
            />
            <SummaryField
              icon={CalendarCheck}
              label="Course day"
              value={event.dayLabel ?? 'Single day'}
            />
            <SummaryField
              icon={MapPin}
              label="Hotel"
              value={event.hotel ?? 'No hotel / pickup location recorded'}
            />
            <SummaryField
              icon={FileText}
              label="Source"
              value={formatSourceSummary(event)}
            />
            <SummaryField
              icon={Users}
              label="Active participants"
              value={<CustomersSummary customers={event.customers} />}
            />
            <SummaryField
              icon={Users}
              label="Assigned staff"
              value={<AssignedStaffSummary event={event} />}
            />
            {event.notes ? (
              <SummaryField
                className="sm:col-span-2"
                icon={FileText}
                label="Schedule notes"
                value={<p className="whitespace-pre-wrap">{event.notes}</p>}
              />
            ) : null}
          </div>

          {canManageAssignments && isManagingAssignments ? (
            <ScheduleAssignmentsList
              assignableStaff={assignableStaff}
              assignments={event.assignments}
              canManageAssignments={canManageAssignments}
              isManagingAssignments={isManagingAssignments}
              managementMode="collapsible"
              scheduleItemId={event.scheduleItemId}
              variant="dialog"
            />
          ) : null}
        </div>
      </div>

      <DialogFooter className="m-0 rounded-none border-t bg-card px-5 py-4 sm:rounded-b-3xl sm:justify-end">
        {canManageAssignments ? (
          <Button
            onClick={handleManageAssignmentsToggle}
            type="button"
            variant="outline"
          >
            {isManagingAssignments ? 'Done managing' : 'Manage assignments'}
          </Button>
        ) : null}
        {canViewBookingDetails ? (
          <Button asChild>
            <Link href={`/bookings/${event.bookingId}`}>
              <ExternalLink className="h-4 w-4" />
              Open booking
            </Link>
          </Button>
        ) : null}
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Close
          </Button>
        </DialogClose>
      </DialogFooter>
    </>
  );
}

/**
 * Renders one icon-labeled summary field in the schedule dialog body.
 *
 * @param props - Icon, uppercase label, and rendered value for the field.
 * @returns A compact operational detail field.
 */
function SummaryField({
  className,
  icon: Icon,
  label,
  value,
}: {
  className?: string;
  icon: LucideIcon;
  label: string;
  value: ReactNode;
}) {
  return (
    <section
      className={cn('grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3', className)}
    >
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div className="min-w-0 space-y-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </h3>
        <div className="text-sm text-foreground">{value}</div>
      </div>
    </section>
  );
}

/**
 * Renders active customers and divers attached to the selected schedule event.
 *
 * @param props - Customer/diver rows prepared by the schedule query mapper.
 * @returns A compact active participant list without repeating the primary summary.
 */
function CustomersSummary({
  customers,
}: {
  customers: SerializedScheduleCalendarEvent['customers'];
}) {
  if (customers.length === 0) {
    return (
      <p className="text-muted-foreground">No active participants recorded</p>
    );
  }

  return (
    <ul className="space-y-1">
      {customers.map((customer, index) => (
        <li key={`${customer.role}-${customer.name}-${index}`}>
          {customer.name}
        </li>
      ))}
    </ul>
  );
}

/**
 * Renders assigned staff names and roles, or the unassigned callout.
 *
 * @param props - Selected schedule event with assignment data.
 * @returns Staff summary content for the dialog overview.
 */
function AssignedStaffSummary({
  event,
}: {
  event: SerializedScheduleCalendarEvent;
}) {
  if (event.assignments.length === 0) {
    return (
      <div className="space-y-1">
        <p className="font-medium text-unassigned">No staff assigned</p>
        <p className="text-muted-foreground">
          Assign an instructor to run this activity.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-1">
      {event.assignments.map((assignment) => (
        <li key={assignment.id}>
          <p>
            {assignment.user.name} <span aria-hidden="true">{'\u2014'}</span>{' '}
            {formatEnumLabel(assignment.role)}
          </p>
        </li>
      ))}
    </ul>
  );
}

/**
 * Renders the operational status pills shown above a schedule dialog title.
 *
 * @param props - Whether the activity still needs staff and its broad category.
 * @returns Header badges that omit redundant scheduled status.
 */
function ScheduleDialogHeaderBadges({
  activityCategory,
  needsStaff,
}: {
  activityCategory: string | null;
  needsStaff: boolean;
}) {
  const badgeClassName =
    'h-7 rounded-full border-transparent px-3 text-[0.7rem] font-medium ring-1 ring-inset';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {needsStaff ? (
        <AssignmentBadge
          label="Needs staff"
          variant="outline"
          colorScheme="unassigned"
          className={badgeClassName}
        />
      ) : null}
      {activityCategory ? (
        <Badge
          className={cn(
            badgeClassName,
            'bg-muted text-muted-foreground ring-border/80',
          )}
          variant="outline"
        >
          {activityCategory}
        </Badge>
      ) : null}
    </div>
  );
}

/**
 * Derives a broad activity category badge for the schedule dialog header.
 *
 * @param activityType - Schedule item activity enum value.
 * @returns A compact category label, or null when no clear category applies.
 */
function getActivityCategoryLabel(activityType: ActivityType) {
  switch (activityType) {
    case ActivityType.FUN_DIVE:
      return 'Fun dive';
    case ActivityType.DISCOVER_SCUBA_DIVING:
    case ActivityType.OPEN_WATER_COURSE:
    case ActivityType.ADVANCED_OPEN_WATER_COURSE:
    case ActivityType.RESCUE_DIVER_COURSE:
    case ActivityType.EMERGENCY_FIRST_RESPONSE:
    case ActivityType.DIVEMASTER:
    case ActivityType.SPECIALTY_COURSE:
    case ActivityType.SCUBA_REVIEW:
      return 'Course';
    default:
      return null;
  }
}

/**
 * Formats the scheduled date and time for the dialog summary.
 *
 * @param event - Selected schedule event with date and time data.
 * @returns Staff-facing date with time range, start time, or TBD label.
 */
function formatDateTimeSummary(event: SerializedScheduleCalendarEvent) {
  const date = formatDisplayDate(new Date(event.date));

  if (event.isTimeTbd) {
    return `${date} / time TBD`;
  }

  return `${date} / ${formatEventTimeLabel(event)}`;
}

/**
 * Formats booking source and referrer details for the schedule event dialog.
 *
 * @param event - Selected schedule event with source and referrer metadata.
 * @returns Source/referrer summary, or a calm missing-data label.
 */
function formatSourceSummary(event: SerializedScheduleCalendarEvent) {
  if (!event.source) {
    return 'No source recorded';
  }

  const source = formatEnumLabel(event.source);

  return event.referrerName ? `${source} / ${event.referrerName}` : source;
}

/**
 * Formats the scheduled time without repeating the full date.
 *
 * @param event - Selected schedule event with time fields.
 * @returns Time range, single start time, or a TBD label.
 */
function formatEventTimeLabel(event: SerializedScheduleCalendarEvent) {
  if (event.isTimeTbd) {
    return 'TBD';
  }

  if (event.startTime && event.endTime) {
    return `${event.startTime}-${event.endTime}`;
  }

  return event.startTime ?? 'TBD';
}
