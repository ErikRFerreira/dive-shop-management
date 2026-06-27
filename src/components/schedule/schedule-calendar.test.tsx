import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import * as React from 'react';

import type {
  AssignableStaff,
  SerializedScheduleCalendarEvent,
} from '@/features/schedule/types';
import {
  ActivityType,
  BookingSource,
  ScheduleAssignmentRole,
  UserRole,
} from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  addScheduleAssignment: vi.fn(),
  refresh: vi.fn(),
  removeScheduleAssignment: vi.fn(),
  updateScheduleAssignmentRole: vi.fn(),
}));

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

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mocks.refresh,
  }),
}));

vi.mock('@/features/schedule/actions', () => ({
  addScheduleAssignment: mocks.addScheduleAssignment,
  removeScheduleAssignment: mocks.removeScheduleAssignment,
  updateScheduleAssignmentRole: mocks.updateScheduleAssignmentRole,
}));

vi.mock('@/components/ui/select', () => {
  /**
   * Extracts native option elements from the mocked shadcn Select children.
   *
   * @param children - Select children that may contain mocked SelectItem nodes.
   * @returns Option elements for the native select test double.
   */
  function collectOptions(children: React.ReactNode): React.ReactNode[] {
    return React.Children.toArray(children).flatMap((child) => {
      if (!React.isValidElement<{ children?: React.ReactNode }>(child)) {
        return [];
      }

      if (child.type === SelectItem) {
        return child;
      }

      return collectOptions(child.props.children);
    });
  }

  /**
   * Finds the trigger ID so labels still target the mocked native select.
   *
   * @param children - Select children that may contain a mocked trigger.
   * @returns The trigger ID when one exists.
   */
  function getTriggerId(children: React.ReactNode): string | undefined {
    for (const child of React.Children.toArray(children)) {
      if (!React.isValidElement<{ id?: string; children?: React.ReactNode }>(
        child,
      )) {
        continue;
      }

      if (child.type === SelectTrigger) {
        return child.props.id;
      }

      const nestedId = getTriggerId(child.props.children);

      if (nestedId) {
        return nestedId;
      }
    }

    return undefined;
  }

  /**
   * Test double for Radix Select using a native select element.
   *
   * @param props - Select props used by the component under test.
   * @returns Native select with collected options.
   */
  function Select({
    children,
    disabled,
    onValueChange,
    value,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onValueChange?: (value: string) => void;
    value?: string;
  }) {
    return (
      <select
        disabled={disabled}
        id={getTriggerId(children)}
        onChange={(event) => onValueChange?.(event.target.value)}
        value={value ?? ''}
      >
        <option value="">Select</option>
        {collectOptions(children)}
      </select>
    );
  }

  /**
   * Mock passthrough for SelectContent.
   *
   * @param props - Content children.
   * @returns Content children.
   */
  function SelectContent({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  }

  /**
   * Mock option for SelectItem.
   *
   * @param props - Option value and label.
   * @returns Native option.
   */
  function SelectItem({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) {
    return <option value={value}>{children}</option>;
  }

  /**
   * Mock placeholder for SelectTrigger.
   *
   * @returns Null because Select renders the native trigger.
   */
  function SelectTrigger() {
    return null;
  }

  /**
   * Mock placeholder for SelectValue.
   *
   * @returns Null because Select renders selected option text natively.
   */
  function SelectValue() {
    return null;
  }

  return {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  };
});

afterEach(() => {
  cleanup();
  mocks.addScheduleAssignment.mockReset();
  mocks.refresh.mockReset();
  mocks.removeScheduleAssignment.mockReset();
  mocks.updateScheduleAssignmentRole.mockReset();
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
    assignments: [],
    isTimeTbd: false,
    ...overrides,
  };
}

/**
 * Builds assignable staff used by assignment control tests.
 *
 * @param overrides - Staff fields to override.
 * @returns Assignable staff record.
 */
function assignableStaff(overrides: Partial<AssignableStaff> = {}): AssignableStaff {
  return {
    id: 'instructor-1',
    name: 'Inez Instructor',
    email: 'inez@example.test',
    role: UserRole.INSTRUCTOR,
    ...overrides,
  };
}

/**
 * Renders the schedule calendar with default assignment props.
 *
 * @param props - Optional props to override for the scenario.
 * @returns React Testing Library render result.
 */
function renderScheduleCalendar(
  props: Partial<React.ComponentProps<typeof ScheduleCalendar>> = {},
) {
  return render(
    <ScheduleCalendar
      assignableStaff={[]}
      canManageAssignments={false}
      events={[scheduleEvent()]}
      {...props}
    />,
  );
}

test('renders passed schedule events in the FullCalendar layer', () => {
  renderScheduleCalendar();

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
  renderScheduleCalendar();

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
  renderScheduleCalendar({
    events: [
      scheduleEvent({
        allDay: true,
        end: null,
        isTimeTbd: true,
        start: '2026-07-14',
        startTime: null,
        title: 'TBD - Fun Dive - Maria Santos - 2 pax',
      }),
    ],
  });

  fireEvent.click(
    screen.getByRole('button', {
      name: 'TBD - Fun Dive - Maria Santos - 2 pax',
    }),
  );

  expect(screen.getByText(/time TBD/i)).not.toBeNull();
});

test('does not render schedule mutation controls', () => {
  renderScheduleCalendar();

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

test('renders multiple assigned staff in the event dialog', () => {
  renderScheduleCalendar({
    events: [
      scheduleEvent({
        assignments: [
          {
            id: 'assignment-1',
            userId: 'instructor-1',
            role: ScheduleAssignmentRole.LEAD_INSTRUCTOR,
            notes: null,
            user: assignableStaff(),
          },
          {
            id: 'assignment-2',
            userId: 'divemaster-1',
            role: ScheduleAssignmentRole.DIVEMASTER,
            notes: null,
            user: assignableStaff({
              id: 'divemaster-1',
              name: 'Dina Divemaster',
              email: 'dina@example.test',
              role: UserRole.DIVEMASTER,
            }),
          },
        ],
      }),
    ],
  });

  fireEvent.click(
    screen.getByRole('button', { name: 'Fun Dive - Maria Santos - 2 pax' }),
  );

  expect(screen.getByText('Assigned staff')).not.toBeNull();
  expect(screen.getByText('Inez Instructor')).not.toBeNull();
  expect(screen.getByText('Dina Divemaster')).not.toBeNull();
  expect(screen.getByText('Lead Instructor')).not.toBeNull();
  expect(screen.getByText('Divemaster')).not.toBeNull();
});

test('renders unassigned state when the event has no assignments', () => {
  renderScheduleCalendar();

  fireEvent.click(
    screen.getByRole('button', { name: 'Fun Dive - Maria Santos - 2 pax' }),
  );

  expect(screen.getByText('Assigned staff')).not.toBeNull();
  expect(screen.getByText('Unassigned')).not.toBeNull();
  expect(
    screen.getByText('No instructor or divemaster has been assigned yet.'),
  ).not.toBeNull();
});

test('renders assignment controls for managers and admins', () => {
  renderScheduleCalendar({
    assignableStaff: [assignableStaff()],
    canManageAssignments: true,
  });

  fireEvent.click(
    screen.getByRole('button', { name: 'Fun Dive - Maria Santos - 2 pax' }),
  );

  expect(screen.getByLabelText('Staff')).not.toBeNull();
  expect(screen.getByLabelText('Role')).not.toBeNull();
  expect(screen.getByRole('button', { name: 'Add assignment' })).not.toBeNull();
});

test('does not render assignment controls for read-only users', () => {
  renderScheduleCalendar({
    assignableStaff: [assignableStaff()],
    canManageAssignments: false,
  });

  fireEvent.click(
    screen.getByRole('button', { name: 'Fun Dive - Maria Santos - 2 pax' }),
  );

  expect(screen.queryByLabelText('Staff')).toBeNull();
  expect(screen.queryByLabelText('Role')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Add assignment' })).toBeNull();
});

test('refreshes the schedule after adding an assignment', async () => {
  mocks.addScheduleAssignment.mockResolvedValue({ success: true });

  renderScheduleCalendar({
    assignableStaff: [assignableStaff()],
    canManageAssignments: true,
  });

  fireEvent.click(
    screen.getByRole('button', { name: 'Fun Dive - Maria Santos - 2 pax' }),
  );
  fireEvent.change(screen.getByLabelText('Staff'), {
    target: { value: 'instructor-1' },
  });
  fireEvent.change(screen.getByLabelText('Role'), {
    target: { value: ScheduleAssignmentRole.LEAD_INSTRUCTOR },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add assignment' }));

  expect(mocks.addScheduleAssignment).toHaveBeenCalledWith(
    'schedule-1',
    'instructor-1',
    ScheduleAssignmentRole.LEAD_INSTRUCTOR,
  );
  await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
});

test('refreshes the schedule after updating an assignment role', async () => {
  mocks.updateScheduleAssignmentRole.mockResolvedValue({ success: true });

  renderScheduleCalendar({
    assignableStaff: [assignableStaff()],
    canManageAssignments: true,
    events: [
      scheduleEvent({
        assignments: [
          {
            id: 'assignment-1',
            userId: 'instructor-1',
            role: ScheduleAssignmentRole.LEAD_INSTRUCTOR,
            notes: null,
            user: assignableStaff(),
          },
        ],
      }),
    ],
  });

  fireEvent.click(
    screen.getByRole('button', { name: 'Fun Dive - Maria Santos - 2 pax' }),
  );
  fireEvent.change(screen.getByLabelText('Assignment role'), {
    target: { value: ScheduleAssignmentRole.ASSISTANT_INSTRUCTOR },
  });

  expect(mocks.updateScheduleAssignmentRole).toHaveBeenCalledWith(
    'assignment-1',
    ScheduleAssignmentRole.ASSISTANT_INSTRUCTOR,
  );
  await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
});

test('refreshes the schedule after removing an assignment', async () => {
  mocks.removeScheduleAssignment.mockResolvedValue({ success: true });

  renderScheduleCalendar({
    assignableStaff: [assignableStaff()],
    canManageAssignments: true,
    events: [
      scheduleEvent({
        assignments: [
          {
            id: 'assignment-1',
            userId: 'instructor-1',
            role: ScheduleAssignmentRole.LEAD_INSTRUCTOR,
            notes: null,
            user: assignableStaff(),
          },
        ],
      }),
    ],
  });

  fireEvent.click(
    screen.getByRole('button', { name: 'Fun Dive - Maria Santos - 2 pax' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Remove Inez Instructor' }));

  expect(mocks.removeScheduleAssignment).toHaveBeenCalledWith('assignment-1');
  await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
});
