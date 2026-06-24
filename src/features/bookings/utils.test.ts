import { expect, test } from 'vitest';

import {
  buildBookingRequestWhere,
  parseBookingStatusFilter,
  resolveDisplayCustomer,
  summarizeBookingActivities,
} from '@/features/bookings/utils';
import {
  BookingCustomerRole,
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

/** Verifies that a primary contact takes precedence over earlier participants. */
test('uses the primary contact as the display customer', () => {
  const firstCustomer = { id: 'first' };
  const primaryCustomer = { id: 'primary' };

  expect(
    resolveDisplayCustomer([
      { role: BookingCustomerRole.PARTICIPANT, customer: firstCustomer },
      { role: BookingCustomerRole.PRIMARY_CONTACT, customer: primaryCustomer },
    ]),
  ).toBe(primaryCustomer);
});

/** Verifies the fallback customer selection when a primary contact is absent. */
test('falls back to the first booking customer or null', () => {
  const firstCustomer = { id: 'first' };

  expect(
    resolveDisplayCustomer([
      { role: BookingCustomerRole.PARTICIPANT, customer: firstCustomer },
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
