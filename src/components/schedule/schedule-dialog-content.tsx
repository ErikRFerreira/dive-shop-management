'use client';

import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import type { ReactNode } from 'react';

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
  const sourceLabel = formatSourceLabel(event);
  const [isManagingAssignments, setIsManagingAssignments] = useState(false);

  /**
   * Toggles assignment editing while keeping the operations summary visible.
   */
  function handleManageAssignmentsToggle() {
    setIsManagingAssignments((currentValue) => !currentValue);
  }

  return (
    <>
      <DialogHeader className="gap-3 pr-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={event.assignments.length > 0 ? 'secondary' : 'outline'}
          >
            {event.assignments.length > 0 ? 'Scheduled' : 'Needs staff'}
          </Badge>
          {activityCategory ? (
            <Badge variant="outline">{activityCategory}</Badge>
          ) : null}
        </div>
        <DialogTitle>{event.title}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailField label="Activity" value={getActivityDisplayName(event)} />
          <DetailField label="Date/time" value={formatEventDateTime(event)} />
          <DetailField
            label="Participants"
            value={formatParticipantsLabel(event.numberOfPeople)}
          />
          <DetailField
            label="Hotel / pickup"
            value={event.hotel ?? 'No hotel / pickup location recorded'}
          />
          <DetailField
            label="Assignment status"
            value={event.assignments.length > 0 ? 'Scheduled' : 'Needs staff'}
          />
          <DetailField
            label="Source / referrer"
            value={sourceLabel ?? 'No source recorded'}
          />
        </div>

        <CustomerDiversSection customers={event.customers} />

        <section className="space-y-2">
          <h3 className="text-sm font-medium">Schedule notes</h3>
          {event.notes ? (
            <p className="whitespace-pre-wrap text-sm">{event.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No schedule notes</p>
          )}
        </section>

        <ScheduleAssignmentsList
          assignableStaff={assignableStaff}
          assignments={event.assignments}
          canManageAssignments={canManageAssignments}
          isManagingAssignments={isManagingAssignments}
          managementMode="collapsible"
          scheduleItemId={event.scheduleItemId}
          variant="compact"
        />
      </div>

      <DialogFooter>
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
 * Renders all customers and divers attached to the selected schedule event.
 *
 * @param props - Customer/diver rows prepared by the schedule query mapper.
 * @returns A compact customer list with primary contact markers.
 */
function CustomerDiversSection({
  customers,
}: {
  customers: SerializedScheduleCalendarEvent['customers'];
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">
        Customers/divers &middot; {customers.length}
      </h3>
      {customers.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {customers.map((customer, index) => (
            <li
              className="flex flex-wrap items-center gap-2"
              key={`${customer.role}-${customer.name}-${index}`}
            >
              <span>{customer.name}</span>
              {customer.isPrimaryContact ? (
                <Badge className="h-5 px-1.5 text-[10px]" variant="secondary">
                  Primary
                </Badge>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No customers/divers recorded
        </p>
      )}
    </section>
  );
}

/**
 * Renders one compact label/value pair for the schedule summary dialog.
 *
 * @param props - Label and display value.
 * @returns A small definition-style field.
 */
function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}

/**
 * Formats the schedule date and time, making no-time events explicit.
 *
 * @param event - The selected schedule event.
 * @returns Staff-facing date/time text.
 */
function formatEventDateTime(event: SerializedScheduleCalendarEvent) {
  const dateText = formatDisplayDate(new Date(event.date));

  if (event.isTimeTbd) {
    return `${dateText}, Time TBD`;
  }

  if (event.startTime && event.endTime) {
    return `${dateText}, ${event.startTime}-${event.endTime}`;
  }

  return `${dateText}, ${event.startTime ?? 'Time TBD'}`;
}

/**
 * Chooses the most operational activity label available on the event.
 *
 * @param event - The selected schedule event.
 * @returns Activity summary text for the dialog details.
 */
function getActivityDisplayName(event: SerializedScheduleCalendarEvent) {
  return event.activitySummary || event.activityLabel;
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
    case ActivityType.DIVEMASTER:
    case ActivityType.SPECIALTY_COURSE:
    case ActivityType.SCUBA_REVIEW:
      return 'Course';
    default:
      return null;
  }
}

/**
 * Formats the booked party size for quick daily operations scanning.
 *
 * @param numberOfPeople - Stored participant count from the booking.
 * @returns A participant count label or a calm missing-data label.
 */
function formatParticipantsLabel(numberOfPeople: number | null) {
  return numberOfPeople === null ? 'Participants TBD' : `${numberOfPeople}`;
}

/**
 * Formats source and referrer data without showing full booking details.
 *
 * @param event - The selected schedule event.
 * @returns Source/referrer text, or null when both values are missing.
 */
function formatSourceLabel(event: SerializedScheduleCalendarEvent) {
  const source = event.source ? formatEnumLabel(event.source) : null;
  const referrer = event.referrerName?.trim() || null;

  if (source && referrer) {
    return `${source} / ${referrer}`;
  }

  return source ?? referrer;
}
