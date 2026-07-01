import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import type { BookingListItem } from '@/features/bookings/queries';
import {
  ActivityType,
  BookingCustomerRole,
  BookingStatus,
  BookingSource,
  UserRole,
} from '@/generated/prisma/enums';
import { BookingList } from './booking-list';

afterEach(() => {
  cleanup();
});

/**
 * Builds a booking list item for table rendering tests.
 *
 * @param overrides - Booking fields to override for a scenario.
 * @returns Booking list data matching the component contract.
 */
function booking(overrides: Partial<BookingListItem> = {}): BookingListItem {
  const createdAt = new Date('2026-07-01T08:00:00.000Z');
  const primaryCustomer = {
    id: 'customer-1',
    fullName: 'Maria Santos',
    firstName: null,
    lastName: null,
    chineseName: null,
    weChatId: null,
    whatsAppNumber: null,
    email: 'maria@example.test',
    phone: null,
    hotel: 'Customer Profile Hotel',
    preferredLanguage: null,
    notes: null,
    createdAt,
    updatedAt: createdAt,
  };

  return {
    id: 'booking-1',
    status: BookingStatus.SCHEDULED,
    activityType: ActivityType.FUN_DIVE,
    specialtyCourse: null,
    source: BookingSource.WHATSAPP,
    requestedDate: new Date('2026-07-14T00:00:00.000Z'),
    requestedTime: '08:00',
    numberOfPeople: 2,
    referrerName: null,
    startAt: null,
    endAt: null,
    notes: null,
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
        hotelAtBooking: 'Booking Hotel',
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
        customer: primaryCustomer,
      },
    ],
    deposits: [],
    scheduleItem: {
      id: 'schedule-1',
      date: new Date('2026-07-15T00:00:00.000Z'),
      startTime: '13:00',
      assignments: [
        {
          id: 'assignment-1',
          user: {
            name: 'Inez Instructor',
          },
        },
      ],
    },
    createdAt,
    updatedAt: createdAt,
    displayCustomer: primaryCustomer,
    ...overrides,
  } as BookingListItem;
}

/**
 * Renders the booking list with an admin user so row actions are visible.
 *
 * @param bookings - Booking rows to render.
 * @returns React Testing Library render result.
 */
function renderBookingList(bookings: BookingListItem[]) {
  return render(
    <BookingList
      bookings={bookings}
      currentUser={{ id: 'admin-1', role: UserRole.ADMIN }}
    />,
  );
}

test('renders operational columns and hides cluttered default columns', () => {
  renderBookingList([booking()]);

  expect(screen.getByRole('columnheader', { name: 'Status' })).not.toBeNull();
  expect(
    screen.getByRole('columnheader', { name: 'Customers/divers' }),
  ).not.toBeNull();
  expect(
    screen.getByRole('columnheader', { name: 'Activities' }),
  ).not.toBeNull();
  expect(screen.getByRole('columnheader', { name: 'Date/time' })).not.toBeNull();
  expect(screen.getByRole('columnheader', { name: 'Staff' })).not.toBeNull();
  expect(screen.getByRole('columnheader', { name: 'Hotel' })).not.toBeNull();
  expect(screen.getByRole('columnheader', { name: 'Actions' })).not.toBeNull();
  expect(screen.queryByRole('columnheader', { name: 'Source/referrer' })).toBeNull();
  expect(
    screen.queryByRole('columnheader', { name: 'Customer service owner' }),
  ).toBeNull();
  expect(screen.queryByRole('columnheader', { name: 'Created date' })).toBeNull();
  expect(screen.queryByRole('columnheader', { name: 'Updated date' })).toBeNull();
});

test('renders assigned staff names without exposing emails', () => {
  renderBookingList([
    booking({
      scheduleItem: {
        id: 'schedule-1',
        date: new Date('2026-07-15T00:00:00.000Z'),
        startTime: '13:00',
        assignments: [
          { id: 'assignment-1', user: { name: 'Inez Instructor' } },
          { id: 'assignment-2', user: { name: 'Dina Divemaster' } },
        ],
      },
    }),
  ]);

  expect(screen.getByText('Inez Instructor, Dina Divemaster')).not.toBeNull();
  expect(screen.queryByText('inez@example.test')).toBeNull();
  expect(screen.queryByText('dina@example.test')).toBeNull();
});

test('renders staff state for unassigned and unscheduled bookings', () => {
  renderBookingList([
    booking({
      id: 'booking-unassigned',
      scheduleItem: {
        id: 'schedule-1',
        date: new Date('2026-07-15T00:00:00.000Z'),
        startTime: '13:00',
        assignments: [],
      },
    }),
    booking({
      id: 'booking-unscheduled',
      status: BookingStatus.APPROVED,
      scheduleItem: null,
    }),
  ]);

  expect(screen.getByText('Unassigned')).not.toBeNull();
  expect(screen.getAllByText('\u2014').length).toBeGreaterThan(0);
});

test('renders every customer, safe fallback, date time, hotel, and row actions', () => {
  const createdAt = new Date('2026-07-01T08:00:00.000Z');
  const participantCustomer = {
    id: 'customer-2',
    fullName: 'Lina Chen',
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
  };
  const unnamedCustomer = {
    ...participantCustomer,
    id: 'customer-3',
    fullName: null,
  };

  renderBookingList([
    booking({
      customers: [
        ...(booking().customers ?? []),
        {
          bookingRequestId: 'booking-1',
          customerId: 'customer-2',
          role: BookingCustomerRole.PARTICIPANT,
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
          customer: participantCustomer,
        },
      ],
    }),
    booking({
      id: 'booking-missing-customer',
      displayCustomer: unnamedCustomer,
      customers: [
        {
          bookingRequestId: 'booking-missing-customer',
          customerId: 'customer-3',
          role: BookingCustomerRole.PRIMARY_CONTACT,
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
          customer: unnamedCustomer,
        },
      ],
      requestedDate: new Date('2026-07-16T00:00:00.000Z'),
      requestedTime: null,
      scheduleItem: null,
    }),
  ]);

  expect(screen.getByText('Maria Santos')).not.toBeNull();
  expect(screen.getByText('Lina Chen')).not.toBeNull();
  expect(screen.queryByText('Maria Santos + 1 more')).toBeNull();
  expect(screen.getByText('Unnamed customer')).not.toBeNull();
  expect(screen.getByText('15 Jul 2026 13:00')).not.toBeNull();
  expect(screen.getByText('16 Jul 2026 TBD')).not.toBeNull();
  expect(screen.getByText('Booking Hotel')).not.toBeNull();
  expect(
    screen.getAllByRole('button', { name: /Open actions for booking/ }).length,
  ).toBeGreaterThan(0);
});

test('falls back to customer profile hotel when booking-specific hotel is missing', () => {
  const row = booking();

  renderBookingList([
    booking({
      customers: row.customers.map((customer) => ({
        ...customer,
        hotelAtBooking: null,
      })),
    }),
  ]);

  const table = screen.getByRole('table');

  expect(within(table).getByText('Customer Profile Hotel')).not.toBeNull();
});
