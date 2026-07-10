import { expect, test } from 'vitest';

import {
  buildBookingRequestWhere,
  parseBookingPageParam,
  parseBookingPageSizeParam,
  parseBookingQueueFilter,
  parseBookingSortParam,
  parseBookingStatusFilter,
  resolveDisplayCustomer,
  summarizeBookingActivities,
} from '@/features/bookings/utils';
import {
  BookingCustomerRole,
  BookingParticipantStatus,
  BookingStatus,
  UserRole,
} from '@/generated/prisma/enums';

/** Verifies that only a single supported status is accepted from the URL. */
test('accepts only supported single booking status filters', () => {
  expect(parseBookingStatusFilter(BookingStatus.PENDING_APPROVAL)).toBe(
    BookingStatus.PENDING_APPROVAL,
  );
  expect(parseBookingStatusFilter(BookingStatus.SCHEDULED)).toBeUndefined();
  expect(parseBookingStatusFilter(['DRAFT', 'APPROVED'])).toBeUndefined();
  expect(parseBookingStatusFilter('unknown')).toBeUndefined();
});

test('accepts Needs More Info as a booking status filter', () => {
  expect(parseBookingStatusFilter(BookingStatus.NEEDS_MORE_INFO)).toBe(
    BookingStatus.NEEDS_MORE_INFO,
  );
});

/** Verifies that operational queues are parsed separately from statuses. */
test('accepts only supported single booking queue filters', () => {
  expect(parseBookingQueueFilter('unassigned')).toBe('unassigned');
  expect(parseBookingQueueFilter(['unassigned'])).toBeUndefined();
  expect(parseBookingQueueFilter(BookingStatus.SCHEDULED)).toBeUndefined();
  expect(parseBookingQueueFilter('unknown')).toBeUndefined();
});

/** Verifies that booking sort params fall back to the default safely. */
test('parses supported booking sort params', () => {
  expect(parseBookingSortParam('recently-updated')).toBe('recently-updated');
  expect(parseBookingSortParam('newest-created')).toBe('newest-created');
  expect(parseBookingSortParam('activity-date')).toBe('activity-date');
  expect(parseBookingSortParam(undefined)).toBe('recently-updated');
  expect(parseBookingSortParam(['activity-date'])).toBe('recently-updated');
  expect(parseBookingSortParam('unknown')).toBe('recently-updated');
});

/** Verifies that booking pagination URL params resolve to safe defaults. */
test('parses booking pagination params', () => {
  expect(parseBookingPageParam('3')).toBe(3);
  expect(parseBookingPageParam(undefined)).toBe(1);
  expect(parseBookingPageParam(['1', '2'])).toBe(1);
  expect(parseBookingPageParam('0')).toBe(1);
  expect(parseBookingPageParam('-1')).toBe(1);
  expect(parseBookingPageParam('1.5')).toBe(1);
  expect(parseBookingPageParam('unknown')).toBe(1);

  expect(parseBookingPageSizeParam('10')).toBe(10);
  expect(parseBookingPageSizeParam(undefined)).toBe(10);
  expect(parseBookingPageSizeParam(['10'])).toBe(10);
  expect(parseBookingPageSizeParam('25')).toBe(10);
  expect(parseBookingPageSizeParam('unknown')).toBe(10);
});

/** Verifies that a primary contact takes precedence over earlier participants. */
test('uses the primary contact as the display customer', () => {
  const firstCustomer = { id: 'first' };
  const primaryCustomer = { id: 'primary' };

  expect(
    resolveDisplayCustomer([
      {
        role: BookingCustomerRole.PARTICIPANT,
        participationStatus: BookingParticipantStatus.ACTIVE,
        customer: firstCustomer,
      },
      {
        role: BookingCustomerRole.PRIMARY_CONTACT,
        participationStatus: BookingParticipantStatus.ACTIVE,
        customer: primaryCustomer,
      },
    ]),
  ).toBe(primaryCustomer);
});

/** Verifies the fallback customer selection when a primary contact is absent. */
test('falls back to the first booking customer or null', () => {
  const firstCustomer = { id: 'first' };

  expect(
    resolveDisplayCustomer([
      {
        role: BookingCustomerRole.PARTICIPANT,
        participationStatus: BookingParticipantStatus.ACTIVE,
        customer: firstCustomer,
      },
    ]),
  ).toBe(firstCustomer);
  expect(resolveDisplayCustomer([])).toBeNull();
});

test('summarizes multiple booking activities for list display', () => {
  expect(
    summarizeBookingActivities([
      { activityType: 'OPEN_WATER_COURSE' },
      { activityType: 'ADVANCED_OPEN_WATER_COURSE' },
    ]),
  ).toBe('Open Water Course + Advanced Open Water Course');
  expect(
    summarizeBookingActivities([
      { activityType: 'OPEN_WATER_COURSE' },
      { activityType: 'ADVANCED_OPEN_WATER_COURSE' },
      { activityType: 'FUN_DIVE' },
    ]),
  ).toBe('Open Water Course + 2 more');
  expect(summarizeBookingActivities([], 'FUN_DIVE')).toBe('Fun Dive');
});

/** Verifies that Customer Service is scoped while Admin and Manager are not. */
test('scopes booking queries to the current user role', () => {
  const customerServiceUser = {
    id: 'customer-service-user',
    name: 'Customer Service',
    email: 'cs@example.test',
    role: UserRole.CUSTOMER_SERVICE,
  };
  const adminUser = {
    ...customerServiceUser,
    id: 'admin-user',
    role: UserRole.ADMIN,
  };
  const managerUser = {
    ...customerServiceUser,
    id: 'manager-user',
    role: UserRole.MANAGER,
  };
  const instructorUser = {
    ...customerServiceUser,
    id: 'instructor-user',
    role: UserRole.INSTRUCTOR,
  };

  expect(
    buildBookingRequestWhere(customerServiceUser, BookingStatus.DRAFT),
  ).toEqual({
    status: BookingStatus.DRAFT,
    createdById: customerServiceUser.id,
  });
  expect(buildBookingRequestWhere(adminUser)).toEqual({});
  expect(buildBookingRequestWhere(managerUser)).toEqual({});
  expect(buildBookingRequestWhere(instructorUser)).toEqual({
    id: { in: [] },
  });
});

/** Verifies that the unassigned queue is not treated as a booking status. */
test('builds an operational unassigned schedule queue predicate', () => {
  const adminUser = {
    id: 'admin-user',
    name: 'Admin User',
    email: 'admin@example.test',
    role: UserRole.ADMIN,
  };

  expect(
    buildBookingRequestWhere(
      adminUser,
      BookingStatus.DRAFT,
      'unassigned',
    ),
  ).toEqual({
    status: BookingStatus.SCHEDULED,
    scheduleItems: {
      some: {},
      none: {
        assignments: {
          some: {},
        },
      },
    },
  });
});
