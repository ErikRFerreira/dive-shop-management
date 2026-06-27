import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import type { SerializedScheduleCalendarEvent } from '@/features/schedule/types';
import { ActivityType, BookingSource } from '@/generated/prisma/enums';

vi.mock('@fullcalendar/react', () => ({
  /**
   * Test double that renders event buttons and forwards clicks through the
   * FullCalendar eventClick contract used by ScheduleCalendar.
   *
   * @param props - FullCalendar props supplied by the component under test.
   * @returns A lightweight calendar representation for jsdom tests.
   */
  default: function MockFullCalendar(props: {
    editable?: boolean;
    events?: Array<{
      id?: string;
      title?: string;
      extendedProps?: {
        scheduleEvent?: SerializedScheduleCalendarEvent;
      };
    }>;
    eventClick?: (arg: {
      event: {
        extendedProps: {
          scheduleEvent?: SerializedScheduleCalendarEvent;
        };
      };
    }) => void;
    headerToolbar?: {
      right?: string;
    };
    initialView?: string;
    selectable?: boolean;
  }) {
    return (
      <div
        data-editable={String(props.editable)}
        data-initial-view={props.initialView}
        data-selectable={String(props.selectable)}
        data-testid="full-calendar"
        data-views={props.headerToolbar?.right}
      >
        {props.events?.map((event) => (
          <button
            key={event.id}
            onClick={() => {
              props.eventClick?.({
                event: {
                  extendedProps: {
                    scheduleEvent: event.extendedProps?.scheduleEvent,
                  },
                },
              });
            }}
            type="button"
          >
            {event.title}
          </button>
        ))}
      </div>
    );
  },
}));

afterEach(() => {
  cleanup();
});

import { ScheduleCalendar } from './schedule-calendar';

/**
 * Builds a serialized schedule event for calendar component tests.
 *
 * @param overrides - Event fields to override for a specific scenario.
 * @returns A serialized schedule event matching the client component contract.
 */
function scheduleEvent(
  overrides: Partial<SerializedScheduleCalendarEvent> = {},
): SerializedScheduleCalendarEvent {
  return {
    id: 'schedule-1',
    title: 'Fun Dive - Maria Santos - 2 pax',
    start: '2026-07-14T08:00:00',
    end: '2026-07-14T12:00:00',
    allDay: false,
    bookingId: 'booking-1',
    bookingReference: 'BOOK-1',
    scheduleItemId: 'schedule-1',
    date: '2026-07-14T00:00:00.000Z',
    startTime: '08:00',
    endTime: '12:00',
    activityType: ActivityType.FUN_DIVE,
    activityLabel: 'Fun Dive',
    activitySummary: 'Fun Dive',
    activities: [
      {
        id: 'activity-1',
        activityType: ActivityType.FUN_DIVE,
        activityLabel: 'Fun Dive',
        specialtyCourse: null,
        requestedDate: '2026-07-14T00:00:00.000Z',
        requestedTime: '08:00',
        notes: 'Two tanks.',
      },
    ],
    primaryCustomerName: 'Maria Santos',
    numberOfPeople: 2,
    hotel: 'Ocean View',
    source: BookingSource.WECHAT,
    referrerName: 'Lina',
    notes: 'Bring cash for marine park fees.',
    isTimeTbd: false,
    ...overrides,
  };
}

test('renders passed schedule events in the FullCalendar layer', () => {
  render(<ScheduleCalendar events={[scheduleEvent()]} />);

  const calendar = screen.getByTestId('full-calendar');

  expect(screen.getByRole('button', { name: 'Fun Dive - Maria Santos - 2 pax' }))
    .not.toBeNull();
  expect(calendar.getAttribute('data-initial-view')).toBe('dayGridMonth');
  expect(calendar.getAttribute('data-views')).toBe(
    'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
  );
  expect(calendar.getAttribute('data-editable')).toBe('false');
  expect(calendar.getAttribute('data-selectable')).toBe('false');
});

test('opens an operational booking summary dialog from an event click', () => {
  render(<ScheduleCalendar events={[scheduleEvent()]} />);

  fireEvent.click(
    screen.getByRole('button', { name: 'Fun Dive - Maria Santos - 2 pax' }),
  );

  expect(screen.getByRole('dialog')).not.toBeNull();
  expect(screen.getByText('Booking reference: BOOK-1')).not.toBeNull();
  expect(screen.getByText('Maria Santos')).not.toBeNull();
  expect(screen.getByText('2 people/divers')).not.toBeNull();
  expect(screen.getByText('Ocean View')).not.toBeNull();
  expect(screen.getByText('Wechat / Lina')).not.toBeNull();
  expect(screen.getByText('Bring cash for marine park fees.')).not.toBeNull();
  expect(screen.getByRole('link', { name: /View booking/i }).getAttribute('href'))
    .toBe('/bookings/booking-1');
});

test('makes no-time schedule events clear in the summary dialog', () => {
  render(
    <ScheduleCalendar
      events={[
        scheduleEvent({
          allDay: true,
          end: null,
          isTimeTbd: true,
          start: '2026-07-14',
          startTime: null,
          title: 'TBD - Fun Dive - Maria Santos - 2 pax',
        }),
      ]}
    />,
  );

  fireEvent.click(
    screen.getByRole('button', {
      name: 'TBD - Fun Dive - Maria Santos - 2 pax',
    }),
  );

  expect(screen.getByText(/time TBD/i)).not.toBeNull();
});

test('does not render schedule mutation controls', () => {
  render(<ScheduleCalendar events={[scheduleEvent()]} />);

  fireEvent.click(
    screen.getByRole('button', { name: 'Fun Dive - Maria Santos - 2 pax' }),
  );

  expect(
    screen.queryByRole('button', { name: /Approve & Schedule/i }),
  ).toBeNull();
  expect(
    screen.queryByRole('button', { name: /Cancel Scheduled Booking/i }),
  ).toBeNull();
  expect(screen.queryByRole('button', { name: /Edit schedule/i })).toBeNull();
});
