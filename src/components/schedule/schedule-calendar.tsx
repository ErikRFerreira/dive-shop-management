'use client';

import type { EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';

import { ScheduleAssignmentsList } from '@/components/schedule/schedule-assignments';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  AssignableStaff,
  SerializedScheduleCalendarEvent,
} from '@/features/schedule/types';
import { formatDisplayDate } from '@/lib/format';

type ScheduleCalendarProps = {
  assignableStaff: AssignableStaff[];
  canManageAssignments: boolean;
  canViewBookingDetails: boolean;
  events: SerializedScheduleCalendarEvent[];
};

/**
 * Renders official schedule events in a read-only FullCalendar view.
 *
 * @param props - Serialized schedule events prepared by the server route.
 * @returns A calendar UI that opens a booking summary dialog on event click.
 */
export function ScheduleCalendar({
  assignableStaff,
  canManageAssignments,
  canViewBookingDetails,
  events,
}: ScheduleCalendarProps) {
  const eventMembershipKey = useMemo(
    () => events.map((event) => event.id).join('|'),
    [events],
  );

  return (
    <ScheduleCalendarView
      assignableStaff={assignableStaff}
      canManageAssignments={canManageAssignments}
      canViewBookingDetails={canViewBookingDetails}
      events={events}
      key={eventMembershipKey}
    />
  );
}

function ScheduleCalendarView({
  assignableStaff,
  canManageAssignments,
  canViewBookingDetails,
  events,
}: ScheduleCalendarProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const calendarEvents = useMemo(
    () => mapScheduleEventsToFullCalendarEvents(events),
    [events],
  );
  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  /**
   * Opens the booking summary dialog for the clicked FullCalendar event.
   *
   * @param clickInfo - FullCalendar event click payload.
   */
  function handleEventClick(clickInfo: EventClickArg) {
    const scheduleEvent = getClickedScheduleEvent(clickInfo);

    if (scheduleEvent) {
      setSelectedEventId(scheduleEvent.id);
    }
  }

  /**
   * Clears selected dialog state when the summary dialog closes.
   *
   * @param open - Whether the controlled dialog is open.
   */
  function handleDialogOpenChange(open: boolean) {
    if (!open) {
      setSelectedEventId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-3 text-card-foreground">
        <FullCalendar
          allDayText="TBD"
          buttonText={{
            day: 'Day',
            list: 'List',
            month: 'Month',
            today: 'Today',
            week: 'Week',
          }}
          editable={false}
          events={calendarEvents}
          eventClick={handleEventClick}
          headerToolbar={{
            center: 'title',
            left: 'prev,next today',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
          }}
          height="auto"
          initialView="dayGridMonth"
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
          selectable={false}
        />
      </div>

      <Dialog
        onOpenChange={handleDialogOpenChange}
        open={selectedEvent !== null}
      >
        <DialogContent className="sm:max-w-lg">
          {selectedEvent ? (
            <ScheduleEventDialogContent
              assignableStaff={assignableStaff}
              canManageAssignments={canManageAssignments}
              canViewBookingDetails={canViewBookingDetails}
              event={selectedEvent}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Renders the clicked schedule event summary inside the dialog.
 *
 * @param props - The selected schedule event to summarize.
 * @returns Staff-facing booking summary content and an optional booking detail link.
 */
function ScheduleEventDialogContent({
  assignableStaff,
  canManageAssignments,
  canViewBookingDetails,
  event,
}: {
  assignableStaff: AssignableStaff[];
  canManageAssignments: boolean;
  canViewBookingDetails: boolean;
  event: SerializedScheduleCalendarEvent;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>{event.activitySummary}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <DetailField
            label="Primary customer"
            value={event.primaryCustomerName ?? 'Customer not recorded'}
          />
          <DetailField
            label="People/divers"
            value={formatPeopleCount(event.numberOfPeople)}
          />
          <DetailField label="Date/time" value={formatEventDateTime(event)} />
        </div>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">Notes</h3>
          {event.notes ? (
            <p className="whitespace-pre-wrap text-sm">{event.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No notes</p>
          )}
        </section>

        <ScheduleAssignmentsList
          assignableStaff={assignableStaff}
          assignments={event.assignments}
          canManageAssignments={canManageAssignments}
          scheduleItemId={event.scheduleItemId}
          variant="compact"
        />
      </div>

      {canViewBookingDetails ? (
        <DialogFooter>
          <Button asChild>
            <Link href={`/bookings/${event.bookingId}`}>
              <ExternalLink className="h-4 w-4" />
              View booking
            </Link>
          </Button>
        </DialogFooter>
      ) : null}
    </>
  );
}

/**
 * Renders one compact label/value pair for the schedule summary dialog.
 *
 * @param props - Label and display value.
 * @returns A small definition-style field.
 */
function DetailField({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}

/**
 * Converts serialized schedule events into FullCalendar event inputs.
 *
 * @param events - Serialized events from the schedule page.
 * @returns FullCalendar inputs with the original event attached as metadata.
 */
function mapScheduleEventsToFullCalendarEvents(
  events: SerializedScheduleCalendarEvent[],
): EventInput[] {
  return events.map((event) => ({
    allDay: event.allDay,
    end: event.end ?? undefined,
    extendedProps: {
      scheduleEvent: event,
    },
    id: event.id,
    start: event.start,
    title: event.title,
  }));
}

/**
 * Reads the original schedule event from a FullCalendar click callback.
 *
 * @param clickInfo - FullCalendar event click payload.
 * @returns The schedule event metadata, or null when unavailable.
 */
function getClickedScheduleEvent(
  clickInfo: EventClickArg,
): SerializedScheduleCalendarEvent | null {
  const scheduleEvent = clickInfo.event.extendedProps.scheduleEvent;

  return isSerializedScheduleCalendarEvent(scheduleEvent)
    ? scheduleEvent
    : null;
}

/**
 * Checks whether unknown FullCalendar metadata looks like a schedule event.
 *
 * @param value - Unknown metadata from FullCalendar extended props.
 * @returns True when the value has the minimum schedule event fields.
 */
function isSerializedScheduleCalendarEvent(
  value: unknown,
): value is SerializedScheduleCalendarEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    'bookingId' in value &&
    'scheduleItemId' in value
  );
}

/**
 * Formats the number of people for operational schedule display.
 *
 * @param numberOfPeople - Stored booking party size.
 * @returns Staff-facing people/diver count text.
 */
function formatPeopleCount(numberOfPeople: number | null) {
  if (numberOfPeople === null) {
    return 'TBD people/divers';
  }

  return `${numberOfPeople} ${
    numberOfPeople === 1 ? 'person/diver' : 'people/divers'
  }`;
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
    return `${dateText}, time TBD`;
  }

  if (event.startTime && event.endTime) {
    return `${dateText}, ${event.startTime}-${event.endTime}`;
  }

  return `${dateText}, ${event.startTime ?? 'time TBD'}`;
}
