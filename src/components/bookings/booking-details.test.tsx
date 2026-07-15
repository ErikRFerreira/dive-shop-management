import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import * as React from 'react';

import type { BookingDetailsItem } from '@/features/bookings/queries';
import type { AssignableStaff } from '@/features/schedule/types';
import {
  ActivityType,
  BookingCustomerRole,
  BookingParticipantStatus,
  BookingStatus,
  DepositStatus,
  ScheduleAssignmentRole,
  ScheduleTimeSlot,
  UserRole,
} from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  addCustomerToScheduledBooking: vi.fn(),
  addScheduledCourseDay: vi.fn(),
  addScheduleAssignment: vi.fn(),
  assignStaffToAllCourseDays: vi.fn(),
  cancelBooking: vi.fn(),
  refresh: vi.fn(),
  removeScheduledCourseDay: vi.fn(),
  removeScheduleAssignment: vi.fn(),
  searchBookingCustomers: vi.fn(),
  updateScheduleAssignmentRole: vi.fn(),
  updateBookingParticipantStatus: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mocks.refresh,
  }),
}));

vi.mock('@/features/schedule/actions', () => ({
  addScheduledCourseDay: mocks.addScheduledCourseDay,
  addScheduleAssignment: mocks.addScheduleAssignment,
  assignStaffToAllCourseDays: mocks.assignStaffToAllCourseDays,
  removeScheduledCourseDay: mocks.removeScheduledCourseDay,
  removeScheduleAssignment: mocks.removeScheduleAssignment,
  updateScheduleAssignmentRole: mocks.updateScheduleAssignmentRole,
}));

vi.mock('@/features/bookings/actions', () => ({
  addCustomerToScheduledBooking: mocks.addCustomerToScheduledBooking,
  cancelBooking: mocks.cancelBooking,
  updateBookingParticipantStatus: mocks.updateBookingParticipantStatus,
}));

vi.mock('@/features/customers/booking-actions', () => ({
  searchBookingCustomers: mocks.searchBookingCustomers,
}));

vi.mock('@/components/ui/select', () => {
  /**
   * Extracts native option elements from mocked shadcn Select children.
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
   * Finds the trigger ID so labels target the mocked native select.
   *
   * @param children - Select children that may contain a mocked trigger.
   * @returns The trigger ID when one exists.
   */
  function getTriggerId(children: React.ReactNode): string | undefined {
    for (const child of React.Children.toArray(children)) {
      if (
        !React.isValidElement<{ id?: string; children?: React.ReactNode }>(
          child,
        )
      ) {
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

beforeEach(() => {
  mocks.addCustomerToScheduledBooking.mockResolvedValue({ success: true });
  mocks.addScheduledCourseDay.mockResolvedValue({ success: true });
  mocks.assignStaffToAllCourseDays.mockResolvedValue({ success: true });
  mocks.cancelBooking.mockResolvedValue({});
  mocks.removeScheduledCourseDay.mockResolvedValue({ success: true });
  mocks.searchBookingCustomers.mockResolvedValue([]);
  mocks.updateBookingParticipantStatus.mockResolvedValue({ success: true });
});

afterEach(() => {
  cleanup();
  mocks.addCustomerToScheduledBooking.mockReset();
  mocks.addScheduledCourseDay.mockReset();
  mocks.addScheduleAssignment.mockReset();
  mocks.assignStaffToAllCourseDays.mockReset();
  mocks.cancelBooking.mockReset();
  mocks.refresh.mockReset();
  mocks.removeScheduledCourseDay.mockReset();
  mocks.removeScheduleAssignment.mockReset();
  mocks.searchBookingCustomers.mockReset();
  mocks.updateScheduleAssignmentRole.mockReset();
  mocks.updateBookingParticipantStatus.mockReset();
});

import BookingDetails from './booking-details';

/**
 * Builds assignable staff used by booking detail assignment tests.
 *
 * @param overrides - Staff fields to override.
 * @returns Assignable staff record.
 */
function assignableStaff(
  overrides: Partial<AssignableStaff> = {},
): AssignableStaff {
  return {
    id: 'instructor-1',
    name: 'Inez Instructor',
    email: 'inez@example.test',
    role: UserRole.INSTRUCTOR,
    ...overrides,
  };
}

/**
 * Builds a scheduled day row for booking detail schedule tests.
 *
 * @param overrides - Schedule item fields to override.
 * @returns Schedule item detail data used by the booking detail component.
 */
function scheduledDay(overrides = {}) {
  return {
    id: 'schedule-1',
    bookingActivityId: 'activity-1',
    date: new Date('2026-07-14T00:00:00.000Z'),
    startTime: '08:00',
    timeSlot: ScheduleTimeSlot.AM,
    dayNumber: 1,
    totalDays: 3,
    activityType: ActivityType.OPEN_WATER_COURSE,
    scheduleNotes: null,
    assignments: [],
    ...overrides,
  };
}

/**
 * Builds a booking detail payload for component tests.
 *
 * @param overrides - Booking fields to override for a scenario.
 * @returns Booking detail data matching the component contract.
 */
function booking(
  overrides: Partial<BookingDetailsItem> = {},
): BookingDetailsItem {
  const createdAt = new Date('2026-07-01T08:00:00.000Z');

  return {
    id: 'booking-1',
    status: BookingStatus.SCHEDULED,
    activityType: ActivityType.FUN_DIVE,
    specialtyCourse: null,
    source: null,
    requestedDate: new Date('2026-07-14T00:00:00.000Z'),
    requestedTime: '08:00',
    requestedTimeSlot: ScheduleTimeSlot.AM,
    numberOfPeople: 2,
    referrerName: null,
    startAt: null,
    endAt: null,
    notes: 'Customer asked for a morning trip.',
    internalNotes: null,
    adminNotes: null,
    needsMoreInfoReason: null,
    createdById: 'cs-1',
    createdBy: {
      id: 'cs-1',
      name: 'Casey Service',
    },
    activities: [
      {
        id: 'activity-1',
        bookingRequestId: 'booking-1',
        activityType: ActivityType.FUN_DIVE,
        specialtyCourse: null,
        requestedDate: new Date('2026-07-14T00:00:00.000Z'),
        requestedTime: '08:00',
        requestedTimeSlot: ScheduleTimeSlot.AM,
        notes: null,
        sortOrder: 0,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    customers: [
      {
        bookingRequestId: 'booking-1',
        customerId: 'customer-1',
        role: BookingCustomerRole.PRIMARY_CONTACT,
        participationStatus: BookingParticipantStatus.ACTIVE,
        participationStatusChangedAt: null,
        participationStatusNote: null,
        hotelAtBooking: null,
        equipmentNeeded: null,
        notes: null,
        certificationAgency: null,
        certificationLevel: null,
        lastDiveAt: null,
        heightCm: null,
        weightKg: null,
        shoeSize: null,
        divesLogged: null,
        createdAt,
        updatedAt: createdAt,
        customer: {
          id: 'customer-1',
          fullName: 'Maria Santos',
          firstName: null,
          lastName: null,
          chineseName: null,
          weChatId: null,
          whatsAppNumber: null,
          email: null,
          phone: null,
          hotel: null,
          preferredLanguage: null,
          notes: null,
          createdAt,
          updatedAt: createdAt,
        },
      },
    ],
    deposits: [],
    scheduleItem: null,
    createdAt,
    updatedAt: createdAt,
    displayCustomer: {
      id: 'customer-1',
      fullName: 'Maria Santos',
      firstName: null,
      lastName: null,
      chineseName: null,
      weChatId: null,
      whatsAppNumber: null,
      email: null,
      phone: null,
      hotel: null,
      preferredLanguage: null,
      notes: null,
      createdAt,
      updatedAt: createdAt,
    },
    activeParticipantCount: 1,
    ...overrides,
  } as BookingDetailsItem;
}

/**
 * Creates the decimal-like positive amount needed by booking detail deposit tests.
 *
 * @returns A deposit amount supporting comparison and display operations.
 */
function positiveDepositAmount(): BookingDetailsItem['deposits'][number]['amount'] {
  return {
    gt: (value: number) => value === 0,
    toString: () => '100',
  } as unknown as BookingDetailsItem['deposits'][number]['amount'];
}

/**
 * Builds a complete deposit record for booking detail component tests.
 *
 * @param overrides - Deposit fields to override for a readiness scenario.
 * @returns Deposit data matching the booking detail component contract.
 */
function deposit(
  overrides: Partial<BookingDetailsItem['deposits'][number]> = {},
): BookingDetailsItem['deposits'][number] {
  const timestamp = new Date('2026-07-01T08:00:00.000Z');

  return {
    id: 'deposit-1',
    bookingRequestId: 'booking-1',
    amount: null,
    status: DepositStatus.PENDING,
    currency: null,
    paidTo: null,
    paymentMethod: null,
    dueAt: null,
    paidAt: null,
    notes: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

/**
 * Renders booking details with default read-only assignment and participant props.
 *
 * @param props - Optional component props to override.
 * @returns React Testing Library render result.
 */
function renderBookingDetails(
  props: Partial<React.ComponentProps<typeof BookingDetails>> = {},
) {
  return render(
    <BookingDetails
      assignableStaff={[]}
      booking={booking()}
      canCancel={false}
      canEdit={false}
      canManageAssignments={false}
      canManageParticipantStatus={false}
      canShowManagerAssignmentAvailabilityCopy={false}
      canResubmit={false}
      canReview={false}
      {...props}
    />,
  );
}

/**
 * Creates a promise that intentionally remains unresolved for pending UI tests.
 *
 * @returns A never-resolving promise for mocked workflow server actions.
 */
function pendingPromise() {
  return new Promise(() => {});
}

test('hides assignment controls before a booking has a schedule item', () => {
  renderBookingDetails();

  expect(screen.queryByLabelText('Staff')).toBeNull();
  expect(screen.queryByLabelText('Role')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Add assignment' })).toBeNull();
});

test('hides assignment controls for approvers until a booking is scheduled', () => {
  renderBookingDetails({
    canShowManagerAssignmentAvailabilityCopy: true,
  });

  expect(screen.queryByLabelText('Staff')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Add assignment' })).toBeNull();
});

test('renders status-aware actions for draft bookings', () => {
  renderBookingDetails({
    booking: booking({ status: BookingStatus.DRAFT }),
    canEdit: true,
    canReview: true,
  });

  expect(screen.getByRole('link', { name: 'Edit booking' })).not.toBeNull();
  expect(screen.queryByRole('link', { name: 'Review booking' })).toBeNull();
  expect(
    screen.getAllByRole('link', { name: 'Back to booking requests' }).length,
  ).toBeGreaterThan(0);
});

test('renders status-aware actions for pending approval bookings', () => {
  renderBookingDetails({
    booking: booking({ status: BookingStatus.PENDING_APPROVAL }),
    canEdit: true,
    canReview: true,
  });

  expect(screen.getByRole('link', { name: 'Review booking' })).not.toBeNull();
  expect(screen.getByRole('link', { name: 'Edit booking' })).not.toBeNull();
});

test('renders fix details instead of review for needs-more-info bookings', () => {
  renderBookingDetails({
    booking: booking({
      status: BookingStatus.NEEDS_MORE_INFO,
      needsMoreInfoReason: 'Please confirm diver certification.',
    }),
    canEdit: true,
    canReview: true,
  });

  expect(screen.getByRole('link', { name: 'Fix details' })).not.toBeNull();
  expect(screen.queryByRole('link', { name: 'Review booking' })).toBeNull();
  expect(
    screen.getAllByText('Please confirm diver certification.').length,
  ).toBeGreaterThan(0);
});

test('renders schedule action for scheduled bookings with schedule items', () => {
  renderBookingDetails({
    booking: booking({
      status: BookingStatus.SCHEDULED,
      scheduleItem: {
        id: 'schedule-1',
        date: new Date('2026-07-14T00:00:00.000Z'),
        startTime: '08:00',
        timeSlot: ScheduleTimeSlot.AM,
        scheduleNotes: null,
        assignments: [],
      },
    }),
  });

  expect(screen.getByRole('link', { name: 'View schedule' })).not.toBeNull();
  expect(screen.queryByRole('link', { name: 'Review booking' })).toBeNull();
});

test('renders scheduled cancellation action for authorized detail users', async () => {
  renderBookingDetails({
    booking: booking({
      status: BookingStatus.SCHEDULED,
      scheduleItem: {
        id: 'schedule-1',
        date: new Date('2026-07-14T00:00:00.000Z'),
        startTime: '08:00',
        timeSlot: ScheduleTimeSlot.AM,
        scheduleNotes: null,
        assignments: [],
      },
    }),
    canCancel: true,
  });

  fireEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));

  expect(await screen.findByText('Cancel scheduled booking?')).not.toBeNull();
  expect(
    screen.getByText(
      'This booking is already on the schedule. Cancelling it will remove it from active schedule views and assigned staff will no longer see it as active work.',
    ),
  ).not.toBeNull();
  expect(screen.getByRole('button', { name: 'Keep booking' })).not.toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));

  expect(mocks.cancelBooking).toHaveBeenCalled();
});

test('shows pending copy while detail scheduled cancellation submits', async () => {
  mocks.cancelBooking.mockReturnValue(pendingPromise());
  renderBookingDetails({
    booking: booking({ status: BookingStatus.SCHEDULED }),
    canCancel: true,
  });

  fireEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));
  const cancelButton = await screen.findByRole('button', {
    name: 'Cancel booking',
  });
  fireEvent.click(cancelButton);

  const pendingButton = await screen.findByRole('button', {
    name: 'Cancelling...',
  });

  expect(pendingButton.hasAttribute('disabled')).toBe(true);
  expect(mocks.cancelBooking).toHaveBeenCalledTimes(1);
});

test('hides scheduled cancellation action when detail user cannot cancel', () => {
  renderBookingDetails({
    booking: booking({ status: BookingStatus.SCHEDULED }),
    canCancel: false,
  });

  expect(screen.queryByRole('button', { name: 'Cancel booking' })).toBeNull();
});

test('renders read-only navigation for cancelled bookings', () => {
  renderBookingDetails({
    booking: booking({ status: BookingStatus.CANCELLED }),
    canEdit: true,
    canReview: true,
  });

  expect(
    screen.getAllByRole('link', { name: 'Back to booking requests' }).length,
  ).toBeGreaterThan(0);
  expect(screen.queryByRole('link', { name: 'Edit booking' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'Review booking' })).toBeNull();
});

test('renders multiple assigned staff with assignment roles', () => {
  renderBookingDetails({
    booking: booking({
      scheduleItem: {
        id: 'schedule-1',
        date: new Date('2026-07-14T00:00:00.000Z'),
        startTime: '08:00',
        timeSlot: ScheduleTimeSlot.AM,
        scheduleNotes: null,
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
      },
    }),
  });

  expect(screen.getAllByText('Assigned staff').length).toBeGreaterThan(0);
  expect(screen.getByText('Inez Instructor')).not.toBeNull();
  expect(screen.getByText('Dina Divemaster')).not.toBeNull();
  expect(screen.getByText('Lead Instructor')).not.toBeNull();
  expect(screen.getByText('Divemaster')).not.toBeNull();
});

test('renders the unassigned state when the schedule item has no assignments', () => {
  renderBookingDetails({
    booking: booking({
      scheduleItem: {
        id: 'schedule-1',
        date: new Date('2026-07-14T00:00:00.000Z'),
        startTime: '08:00',
        timeSlot: ScheduleTimeSlot.AM,
        scheduleNotes: null,
        assignments: [],
      },
    }),
  });

  expect(screen.getAllByText('Assigned staff').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Unassigned').length).toBeGreaterThan(0);
  expect(screen.getByText('No staff assigned')).not.toBeNull();
});

test('renders active and historical participant groups on booking detail cards', () => {
  renderBookingDetails({
    booking: booking({
      activeParticipantCount: 1,
      customers: [
        booking().customers[0],
        {
          ...booking().customers[0],
          customerId: 'customer-2',
          role: BookingCustomerRole.PARTICIPANT,
          participationStatus: BookingParticipantStatus.NO_SHOW,
          customer: {
            ...booking().customers[0].customer,
            id: 'customer-2',
            fullName: 'Kai Chen',
          },
        },
        {
          ...booking().customers[0],
          customerId: 'customer-3',
          role: BookingCustomerRole.PARTICIPANT,
          participationStatus: BookingParticipantStatus.CANCELLED,
          customer: {
            ...booking().customers[0].customer,
            id: 'customer-3',
            fullName: 'Lina Park',
          },
        },
      ],
    }),
  });

  expect(screen.getAllByText('Active participants').length).toBeGreaterThan(0);
  expect(screen.getByText('Historical participants')).not.toBeNull();
  expect(screen.getByText('Active')).not.toBeNull();
  expect(screen.getByText('No-show')).not.toBeNull();
  expect(screen.getByText('Cancelled')).not.toBeNull();
  expect(screen.getAllByText('Kai Chen').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Lina Park').length).toBeGreaterThan(0);
});

test('renders participant status controls for scheduled admin and manager users', () => {
  renderBookingDetails({
    canManageParticipantStatus: true,
  });

  expect(screen.getByLabelText('Participant status')).not.toBeNull();
});

test('renders add participant control for scheduled participant managers', () => {
  renderBookingDetails({
    canManageParticipantStatus: true,
  });

  expect(
    screen.getByRole('button', { name: 'Add customer / diver' }),
  ).not.toBeNull();
});

test('hides participant status controls for read-only detail users', () => {
  renderBookingDetails({
    canManageParticipantStatus: false,
  });

  expect(screen.getByText('Active')).not.toBeNull();
  expect(screen.queryByLabelText('Participant status')).toBeNull();
  expect(
    screen.queryByRole('button', { name: 'Add customer / diver' }),
  ).toBeNull();
});

test('refreshes booking details after updating a participant status', async () => {
  renderBookingDetails({
    canManageParticipantStatus: true,
  });

  fireEvent.change(screen.getByLabelText('Participant status'), {
    target: { value: BookingParticipantStatus.DROPPED_OUT },
  });

  await waitFor(() => {
    expect(mocks.updateBookingParticipantStatus).toHaveBeenCalledWith(
      'booking-1',
      'customer-1',
      BookingParticipantStatus.DROPPED_OUT,
    );
  });
  expect(mocks.refresh).toHaveBeenCalled();
});

test('adds a new scheduled booking participant from booking details', async () => {
  renderBookingDetails({
    canManageParticipantStatus: true,
  });

  fireEvent.click(screen.getByRole('button', { name: 'Add customer / diver' }));
  fireEvent.change(await screen.findByLabelText('Customer name'), {
    target: { value: 'Lina Park' },
  });
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'lina@example.test' },
  });
  fireEvent.change(screen.getByLabelText('Hotel / pickup location'), {
    target: { value: 'Ocean View' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add participant' }));

  await waitFor(() => {
    expect(mocks.addCustomerToScheduledBooking).toHaveBeenCalledWith(
      'booking-1',
      expect.objectContaining({
        customerName: 'Lina Park',
        email: 'lina@example.test',
        hotelAtBooking: 'Ocean View',
      }),
    );
  });
  expect(mocks.refresh).toHaveBeenCalled();
});

test('adds an existing searched customer from booking details', async () => {
  mocks.searchBookingCustomers.mockResolvedValue([
    {
      id: 'customer-3',
      name: 'Lina Park',
      fullName: 'Lina Park',
      firstName: null,
      lastName: null,
      chineseName: null,
      hotel: 'Ocean View',
      preferredLanguage: null,
      certificationLevel: 'Open Water',
      certificationAgency: 'PADI',
      lastDiveDate: '2026-06-01',
      divesLogged: 12,
      email: 'lina@example.test',
      phone: null,
      weChatId: null,
      whatsAppNumber: null,
      lastBookingDate: '2026-07-01',
      lastActivity: ActivityType.FUN_DIVE,
      bookingCount: 2,
    },
  ]);
  renderBookingDetails({
    canManageParticipantStatus: true,
  });

  fireEvent.click(screen.getByRole('button', { name: 'Add customer / diver' }));
  fireEvent.change(await screen.findByLabelText('Search existing customers'), {
    target: { value: 'Lina' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));

  expect(await screen.findByText('Lina Park')).not.toBeNull();
  expect(mocks.searchBookingCustomers).toHaveBeenCalledWith('Lina');

  fireEvent.click(screen.getByRole('button', { name: 'Use customer' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add participant' }));

  await waitFor(() => {
    expect(mocks.addCustomerToScheduledBooking).toHaveBeenCalledWith(
      'booking-1',
      expect.objectContaining({
        customerId: 'customer-3',
        customerName: 'Lina Park',
        email: 'lina@example.test',
      }),
    );
  });
  expect(mocks.refresh).toHaveBeenCalled();
});

test('shows inline add participant errors returned by the server action', async () => {
  mocks.addCustomerToScheduledBooking.mockResolvedValue({
    success: false,
    formError: 'Only scheduled bookings can have participants added.',
  });
  renderBookingDetails({
    canManageParticipantStatus: true,
  });

  fireEvent.click(screen.getByRole('button', { name: 'Add customer / diver' }));
  fireEvent.change(await screen.findByLabelText('Customer name'), {
    target: { value: 'Lina Park' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add participant' }));

  expect(
    await screen.findByText(
      'Only scheduled bookings can have participants added.',
    ),
  ).not.toBeNull();
  expect(mocks.refresh).not.toHaveBeenCalled();
});

test('shows inline participant status errors returned by the server action', async () => {
  mocks.updateBookingParticipantStatus.mockResolvedValue({
    success: false,
    formError: 'Only scheduled bookings can have participant statuses changed.',
  });
  renderBookingDetails({
    canManageParticipantStatus: true,
  });

  fireEvent.change(screen.getByLabelText('Participant status'), {
    target: { value: BookingParticipantStatus.CANCELLED },
  });

  expect(
    await screen.findByText(
      'Only scheduled bookings can have participant statuses changed.',
    ),
  ).not.toBeNull();
  expect(mocks.refresh).not.toHaveBeenCalled();
});

test('renders assignment controls for admin and manager users', () => {
  renderBookingDetails({
    assignableStaff: [assignableStaff()],
    booking: booking({
      scheduleItem: scheduledDay(),
    }),
    canManageAssignments: true,
  });

  expect(screen.getByLabelText('Staff')).not.toBeNull();
  expect(screen.getByLabelText('Role')).not.toBeNull();
  expect(screen.getByRole('button', { name: 'Add assignment' })).not.toBeNull();
});

test('shows deposit not required readiness when no deposit is recorded', () => {
  renderBookingDetails();

  expect(screen.getByText('Deposit not required')).not.toBeNull();
  expect(screen.getAllByText('No deposit recorded.').length).toBeGreaterThan(0);
  expect(screen.queryByText('Deposit details complete')).toBeNull();
});

test('shows complete readiness for a partially paid deposit with required details', () => {
  renderBookingDetails({
    booking: booking({
      deposits: [
        deposit({
          status: DepositStatus.PARTIALLY_PAID,
          amount: positiveDepositAmount(),
          currency: 'USD',
          paidTo: 'Front desk',
        }),
      ],
    }),
  });

  expect(screen.getByText('Deposit details complete')).not.toBeNull();
  expect(screen.getByText('Payment details are recorded.')).not.toBeNull();
});

test('shows incomplete readiness with missing paid deposit fields', () => {
  renderBookingDetails({
    booking: booking({
      deposits: [
        deposit({
          status: DepositStatus.PAID,
          amount: null,
          currency: ' ',
          paidTo: null,
        }),
      ],
    }),
  });

  expect(screen.getByText('Deposit details incomplete')).not.toBeNull();
  expect(
    screen.getByText('Missing payment details: amount, currency, and paid to.'),
  ).not.toBeNull();
});

test('renders all-days assignment action for multi-day booking detail schedule rows', () => {
  renderBookingDetails({
    assignableStaff: [assignableStaff()],
    booking: booking({
      scheduleItem: scheduledDay({
        totalDays: 3,
      }),
    }),
    canManageAssignments: true,
  });

  expect(
    screen.getByRole('button', { name: 'Assign to all course days' }),
  ).not.toBeNull();
});

test('hides all-days assignment action for single-day booking detail schedule rows', () => {
  renderBookingDetails({
    assignableStaff: [assignableStaff()],
    booking: booking({
      scheduleItem: scheduledDay({
        dayNumber: null,
        totalDays: 1,
      }),
    }),
    canManageAssignments: true,
  });

  expect(
    screen.queryByRole('button', { name: 'Assign to all course days' }),
  ).toBeNull();
});

test('assigns staff to all course days from booking details', async () => {
  renderBookingDetails({
    assignableStaff: [assignableStaff()],
    booking: booking({
      scheduleItem: scheduledDay(),
    }),
    canManageAssignments: true,
  });

  fireEvent.change(screen.getByLabelText('Staff'), {
    target: { value: 'instructor-1' },
  });
  fireEvent.change(screen.getByLabelText('Role'), {
    target: { value: ScheduleAssignmentRole.LEAD_INSTRUCTOR },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Assign to all course days' }),
  );

  await waitFor(() => {
    expect(mocks.assignStaffToAllCourseDays).toHaveBeenCalledWith(
      'schedule-1',
      'instructor-1',
      ScheduleAssignmentRole.LEAD_INSTRUCTOR,
    );
  });
  expect(mocks.refresh).toHaveBeenCalled();
});

test('renders scheduled day controls for admin and manager users', () => {
  renderBookingDetails({
    assignableStaff: [assignableStaff()],
    booking: booking({
      scheduleItem: scheduledDay(),
    }),
    canManageAssignments: true,
  });

  expect(screen.getByRole('button', { name: 'Add day' })).not.toBeNull();
  expect(screen.getByRole('button', { name: 'Remove day' })).not.toBeNull();
});

test('hides assignment controls for customer service read-only users', () => {
  renderBookingDetails({
    assignableStaff: [assignableStaff()],
    booking: booking({
      scheduleItem: scheduledDay(),
    }),
    canManageAssignments: false,
  });

  expect(screen.queryByLabelText('Staff')).toBeNull();
  expect(screen.queryByLabelText('Role')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Add assignment' })).toBeNull();
});

test('hides scheduled day controls for customer service read-only users', () => {
  renderBookingDetails({
    assignableStaff: [assignableStaff()],
    booking: booking({
      scheduleItem: scheduledDay(),
    }),
    canManageAssignments: false,
  });

  expect(screen.queryByRole('button', { name: 'Add day' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Remove day' })).toBeNull();
});

test('confirms assigned scheduled day removal from booking details', async () => {
  renderBookingDetails({
    assignableStaff: [assignableStaff()],
    booking: booking({
      scheduleItem: scheduledDay({
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
    }),
    canManageAssignments: true,
  });

  fireEvent.click(screen.getByRole('button', { name: 'Remove day' }));

  expect(await screen.findByText('Remove scheduled day?')).not.toBeNull();
  expect(
    screen.getByText(
      'This day has assigned staff. Removing it will delete this scheduled day and its assignments only.',
    ),
  ).not.toBeNull();

  fireEvent.click(
    screen.getAllByRole('button', { name: 'Remove day' }).at(-1)!,
  );

  await waitFor(() => {
    expect(mocks.removeScheduledCourseDay).toHaveBeenCalledWith(
      'schedule-1',
      true,
    );
  });
  expect(mocks.refresh).toHaveBeenCalled();
});

test('hides assignment controls for cancelled bookings with stale schedule items', () => {
  renderBookingDetails({
    assignableStaff: [assignableStaff()],
    booking: booking({
      status: BookingStatus.CANCELLED,
      scheduleItem: scheduledDay(),
    }),
    canManageAssignments: false,
  });

  expect(screen.queryByLabelText('Staff')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Add assignment' })).toBeNull();
});
