'use client';

import type { EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useMemo, useState } from 'react';

import { ScheduleEventDialogContent } from '@/components/schedule/schedule-dialog-content';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type {
  AssignableStaff,
  SerializedScheduleCalendarEvent,
} from '@/features/schedule/types';

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
      <div className="schedule-calendar  rounded-2xl border border-border bg-gradient-to-b from-card to-card-glow shadow-sm p-4">
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
            center: '',
            left: 'prev,next today title',
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
        <DialogContent className="flex max-h-[calc(100svh-2rem)] flex-col overflow-hidden rounded-t-3xl border border-border bg-card p-0 shadow-xl sm:max-w-lg sm:rounded-3xl">
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
    className:
      event.assignments.length > 0 ? 'sched-assigned' : 'sched-unassigned',
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
