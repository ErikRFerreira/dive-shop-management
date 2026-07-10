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
  BookingCustomerRole,
  BookingSource,
  ScheduleAssignmentRole,
  ScheduleTimeSlot,
  UserRole,
} from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  addScheduleAssignment: vi.fn(),
  assignStaffToAllCourseDays: vi.fn(),
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
    allDayText?: string;
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
        data-all-day-text={props.allDayText}
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
  assignStaffToAllCourseDays: mocks.assignStaffToAllCourseDays,
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

/**
 * Creates a promise that remains pending for transition-state assertions.
 *
 * @returns A never-resolving promise for mocked schedule mutation actions.
 */
function pendingPromise() {
  return new Promise(() => {});
}

afterEach(() => {
  cleanup();
  mocks.addScheduleAssignment.mockReset();
  mocks.assignStaffToAllCourseDays.mockReset();
  mocks.refresh.mockReset();
  mocks.removeScheduleAssignment.mockReset();
  mocks.updateScheduleAssignmentRole.mockReset();
});

import { ScheduleCalendar } from './schedule-calendar';

const DEFAULT_EVENT_TITLE = '[Unassigned] Fun Dive x2 Maria Santos';

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
    title: DEFAULT_EVENT_TITLE,
    start: '2026-07-14',
    end: null,
    allDay: true,
    bookingId: 'booking-1',
    bookingReference: 'BOOK-1',
    scheduleItemId: 'schedule-1',
    date: '2026-07-14T00:00:00.000Z',
    startTime: null,
    endTime: null,
    timeSlot: ScheduleTimeSlot.AM,
    activityType: ActivityType.FUN_DIVE,
    activityLabel: 'Fun Dive',
    activitySummary: 'Fun Dive',
    dayNumber: 1,
    totalDays: 1,
    dayLabel: null,
    activities: [
      {
        id: 'activity-1',
        activityType: ActivityType.FUN_DIVE,
        activityLabel: 'Fun Dive',
        specialtyCourse: null,
        requestedDate: '2026-07-14T00:00:00.000Z',
        requestedTime: '08:00',
        requestedTimeSlot: ScheduleTimeSlot.AM,
        notes: 'Two tanks.',
      },
    ],
    primaryCustomerName: 'Maria Santos',
    customers: [
      {
        name: 'Maria Santos / 玛丽亚',
        chineseName: '玛丽亚',
        isPrimaryContact: true,
        role: BookingCustomerRole.PRIMARY_CONTACT,
      },
      {
        name: 'Participant Diver',
        chineseName: null,
        isPrimaryContact: false,
        role: BookingCustomerRole.PARTICIPANT,
      },
    ],
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
      canViewBookingDetails={true}
      events={[scheduleEvent()]}
      {...props}
    />,
  );
}

/**
 * Matches a paragraph by exact rendered text content, including child text nodes.
 *
 * @param text - Full rendered text content to match.
 * @returns A Testing Library text matcher.
 */
function hasExactText(text: string) {
  return (_content: string, element: Element | null) =>
    element?.tagName === 'P' && element.textContent === text;
}

test('opens an operational booking summary dialog from an event click', () => {
  renderScheduleCalendar();

  fireEvent.click(
    screen.getByRole('button', { name: DEFAULT_EVENT_TITLE }),
  );

  expect(screen.getByRole('dialog')).not.toBeNull();
  expect(
    screen.getByRole('heading', { name: DEFAULT_EVENT_TITLE }),
  ).not.toBeNull();
  expect(screen.getByText('Active participants')).not.toBeNull();
  expect(screen.getByText('Ocean View')).not.toBeNull();
  expect(screen.getAllByText(/Maria Santos \//)).toHaveLength(1);
  expect(screen.getAllByText('Participant Diver')).toHaveLength(1);
  expect(screen.getByRole('link', { name: /Open booking/i }).getAttribute('href'))
    .toBe('/bookings/booking-1');
  expect(screen.queryByRole('button', { name: 'Manage assignments' })).toBeNull();
  expect(screen.getAllByRole('button', { name: 'Close' }).length).toBeGreaterThan(
    0,
  );
});

test('does not reopen a stale dialog when a filtered event leaves and returns', async () => {
  const event = scheduleEvent();
  const { rerender } = renderScheduleCalendar({ events: [event] });

  fireEvent.click(
    screen.getByRole('button', { name: DEFAULT_EVENT_TITLE }),
  );

  expect(screen.getByRole('dialog')).not.toBeNull();

  rerender(
    <ScheduleCalendar
      assignableStaff={[]}
      canManageAssignments={false}
      canViewBookingDetails={true}
      events={[]}
    />,
  );

  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

  rerender(
    <ScheduleCalendar
      assignableStaff={[]}
      canManageAssignments={false}
      canViewBookingDetails={true}
      events={[event]}
    />,
  );

  expect(screen.queryByRole('dialog')).toBeNull();
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
        timeSlot: ScheduleTimeSlot.TBD,
        title: DEFAULT_EVENT_TITLE,
      }),
    ],
  });

  fireEvent.click(
    screen.getByRole('button', {
      name: DEFAULT_EVENT_TITLE,
    }),
  );

  expect(screen.getByText(/14 Jul 2026 \/ TBD/i)).not.toBeNull();
});

test('does not render schedule mutation controls', () => {
  renderScheduleCalendar();

  fireEvent.click(
    screen.getByRole('button', { name: DEFAULT_EVENT_TITLE }),
  );

  expect(
    screen.queryByRole('button', { name: /Approve & Schedule/i }),
  ).toBeNull();
  expect(
    screen.queryByRole('button', { name: /Cancel Scheduled Booking/i }),
  ).toBeNull();
  expect(screen.queryByRole('button', { name: /Edit schedule/i })).toBeNull();
});

test('hides the booking detail link for users without booking detail access', () => {
  renderScheduleCalendar({
    canViewBookingDetails: false,
  });

  fireEvent.click(
    screen.getByRole('button', { name: DEFAULT_EVENT_TITLE }),
  );

  expect(screen.queryByRole('link', { name: /Open booking/i })).toBeNull();
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
    screen.getByRole('button', { name: DEFAULT_EVENT_TITLE }),
  );

  expect(screen.getByText('Assigned staff')).not.toBeNull();
  expect(screen.queryByText('Assignment status')).toBeNull();
  expect(screen.queryByText('Assigned')).toBeNull();
  expect(screen.queryByText('Scheduled')).toBeNull();
  expect(
    screen.getByText(hasExactText('Inez Instructor \u2014 Lead Instructor')),
  ).not.toBeNull();
  expect(
    screen.getByText(hasExactText('Dina Divemaster \u2014 Divemaster')),
  ).not.toBeNull();
  expect(screen.queryByText(/inez@example\.test/)).toBeNull();
  expect(screen.queryByText(/dina@example\.test/)).toBeNull();
});

test('renders unassigned state when the event has no assignments', () => {
  renderScheduleCalendar();

  fireEvent.click(
    screen.getByRole('button', { name: DEFAULT_EVENT_TITLE }),
  );

  expect(screen.getByText('Assigned staff')).not.toBeNull();
  expect(screen.getByText('No staff assigned')).not.toBeNull();
  expect(
    screen.getByText('Assign an instructor to run this activity.'),
  ).not.toBeNull();
});

test('keeps assignment controls hidden for managers and admins until requested', () => {
  renderScheduleCalendar({
    assignableStaff: [assignableStaff()],
    canManageAssignments: true,
  });

  fireEvent.click(
    screen.getByRole('button', { name: DEFAULT_EVENT_TITLE }),
  );

  expect(screen.queryByLabelText('Staff')).toBeNull();
  expect(screen.queryByLabelText('Role')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Add' })).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Manage assignments' }));

  expect(screen.getByText('Manage staff assignments')).not.toBeNull();
  expect(
    screen.getByText(
      'Assign instructors or update their roles for this scheduled activity.',
    ),
  ).not.toBeNull();
  expect(screen.getByText('No instructors assigned yet.')).not.toBeNull();
  expect(screen.getByText('Add assignment')).not.toBeNull();
  expect(screen.getByLabelText('Staff')).not.toBeNull();
  expect(screen.getByLabelText('Role')).not.toBeNull();
  expect(screen.getByRole('button', { name: 'Add' })).not.toBeNull();
  expect(screen.getByRole('button', { name: 'Done managing' })).not.toBeNull();
  expect(
    screen.queryByRole('button', { name: 'Assign to all course days' }),
  ).toBeNull();
});

test('renders month, week, day, and list schedule views without a TBD all-day label', () => {
  renderScheduleCalendar();

  const calendar = screen.getByTestId('full-calendar');

  expect(calendar.getAttribute('data-views')).toBe(
    'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
  );
  expect(calendar.getAttribute('data-all-day-text')).toBe('');
});

test('shows all-days assignment action for multi-day schedule events', () => {
  renderScheduleCalendar({
    assignableStaff: [assignableStaff()],
    canManageAssignments: true,
    events: [
      scheduleEvent({
        activityType: ActivityType.OPEN_WATER_COURSE,
        activityLabel: 'Open Water Course',
        activitySummary: 'Open Water Course',
        dayNumber: 1,
        totalDays: 3,
        dayLabel: 'Day 1/3',
      }),
    ],
  });

  fireEvent.click(screen.getByRole('button', { name: DEFAULT_EVENT_TITLE }));
  fireEvent.click(screen.getByRole('button', { name: 'Manage assignments' }));

  expect(
    screen.getByRole('button', { name: 'Assign to all course days' }),
  ).not.toBeNull();
});

test('hides assignment controls behind manage assignments when staff are assigned', () => {
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
    screen.getByRole('button', { name: DEFAULT_EVENT_TITLE }),
  );

  expect(
    screen.getByText(hasExactText('Inez Instructor \u2014 Lead Instructor')),
  ).not.toBeNull();
  expect(screen.queryByLabelText('Assignment role')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Remove Inez Instructor' }))
    .toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Manage assignments' }));

  expect(screen.getByLabelText('Assignment role')).not.toBeNull();
  expect(screen.getByRole('button', { name: 'Remove Inez Instructor' }))
    .not.toBeNull();
  expect(screen.getByLabelText('Staff')).not.toBeNull();
  expect(screen.getByRole('button', { name: 'Add' })).not.toBeNull();
});

test('renders a helpful empty picker state when all available staff are assigned', () => {
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
    screen.getByRole('button', { name: DEFAULT_EVENT_TITLE }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Manage assignments' }));

  expect(
    screen.getByText(
      'All available staff are already assigned to this activity.',
    ),
  ).not.toBeNull();
  expect(
    screen.getByRole('button', { name: 'Add' }).hasAttribute('disabled'),
  ).toBe(true);
});

test('does not render assignment controls for read-only users', () => {
  renderScheduleCalendar({
    assignableStaff: [assignableStaff()],
    canManageAssignments: false,
  });

  fireEvent.click(
    screen.getByRole('button', { name: DEFAULT_EVENT_TITLE }),
  );

  expect(screen.queryByLabelText('Staff')).toBeNull();
  expect(screen.queryByLabelText('Role')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Add' })).toBeNull();
});

test('refreshes the schedule after adding an assignment', async () => {
  mocks.addScheduleAssignment.mockResolvedValue({ success: true });

  renderScheduleCalendar({
    assignableStaff: [assignableStaff()],
    canManageAssignments: true,
  });

  fireEvent.click(
    screen.getByRole('button', { name: DEFAULT_EVENT_TITLE }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Manage assignments' }));
  fireEvent.change(screen.getByLabelText('Staff'), {
    target: { value: 'instructor-1' },
  });
  fireEvent.change(screen.getByLabelText('Role'), {
    target: { value: ScheduleAssignmentRole.LEAD_INSTRUCTOR },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));

  expect(mocks.addScheduleAssignment).toHaveBeenCalledWith(
    'schedule-1',
    'instructor-1',
    ScheduleAssignmentRole.LEAD_INSTRUCTOR,
  );
  await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
});

test('refreshes the schedule after assigning staff to all course days', async () => {
  mocks.assignStaffToAllCourseDays.mockResolvedValue({ success: true });

  renderScheduleCalendar({
    assignableStaff: [assignableStaff()],
    canManageAssignments: true,
    events: [
      scheduleEvent({
        activityType: ActivityType.OPEN_WATER_COURSE,
        activityLabel: 'Open Water Course',
        activitySummary: 'Open Water Course',
        dayNumber: 1,
        totalDays: 3,
        dayLabel: 'Day 1/3',
      }),
    ],
  });

  fireEvent.click(screen.getByRole('button', { name: DEFAULT_EVENT_TITLE }));
  fireEvent.click(screen.getByRole('button', { name: 'Manage assignments' }));
  fireEvent.change(screen.getByLabelText('Staff'), {
    target: { value: 'instructor-1' },
  });
  fireEvent.change(screen.getByLabelText('Role'), {
    target: { value: ScheduleAssignmentRole.LEAD_INSTRUCTOR },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Assign to all course days' }),
  );

  expect(mocks.assignStaffToAllCourseDays).toHaveBeenCalledWith(
    'schedule-1',
    'instructor-1',
    ScheduleAssignmentRole.LEAD_INSTRUCTOR,
  );
  await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
});

test('keeps all-days assignment disabled until staff and role are selected', () => {
  renderScheduleCalendar({
    assignableStaff: [assignableStaff()],
    canManageAssignments: true,
    events: [
      scheduleEvent({
        dayNumber: 1,
        totalDays: 2,
        dayLabel: 'Day 1/2',
      }),
    ],
  });

  fireEvent.click(screen.getByRole('button', { name: DEFAULT_EVENT_TITLE }));
  fireEvent.click(screen.getByRole('button', { name: 'Manage assignments' }));

  const button = screen.getByRole('button', {
    name: 'Assign to all course days',
  });
  expect(button.hasAttribute('disabled')).toBe(true);

  fireEvent.change(screen.getByLabelText('Staff'), {
    target: { value: 'instructor-1' },
  });

  expect(button.hasAttribute('disabled')).toBe(true);

  fireEvent.change(screen.getByLabelText('Role'), {
    target: { value: ScheduleAssignmentRole.LEAD_INSTRUCTOR },
  });

  expect(button.hasAttribute('disabled')).toBe(false);
});

test('shows pending feedback while adding an assignment', async () => {
  mocks.addScheduleAssignment.mockReturnValue(pendingPromise());

  renderScheduleCalendar({
    assignableStaff: [assignableStaff()],
    canManageAssignments: true,
  });

  fireEvent.click(screen.getByRole('button', { name: DEFAULT_EVENT_TITLE }));
  fireEvent.click(screen.getByRole('button', { name: 'Manage assignments' }));
  fireEvent.change(screen.getByLabelText('Staff'), {
    target: { value: 'instructor-1' },
  });
  fireEvent.change(screen.getByLabelText('Role'), {
    target: { value: ScheduleAssignmentRole.LEAD_INSTRUCTOR },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));

  const button = await screen.findByRole('button', { name: 'Adding...' });

  expect(button.hasAttribute('disabled')).toBe(true);
  fireEvent.click(button);
  expect(mocks.addScheduleAssignment).toHaveBeenCalledTimes(1);
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
    screen.getByRole('button', { name: DEFAULT_EVENT_TITLE }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Manage assignments' }));
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
    screen.getByRole('button', { name: DEFAULT_EVENT_TITLE }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Manage assignments' }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove Inez Instructor' }));

  expect(mocks.removeScheduleAssignment).toHaveBeenCalledWith('assignment-1');
  await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
});
