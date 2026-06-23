import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildBookingRequestWhere,
  parseBookingStatusFilter,
  resolveDisplayCustomer,
} from '@/features/bookings/list-utils';
import { BookingCustomerRole, BookingStatus, UserRole } from '@/generated/prisma/enums';

test('accepts only supported single booking status filters', () => {
  assert.equal(
    parseBookingStatusFilter(BookingStatus.PENDING_APPROVAL),
    BookingStatus.PENDING_APPROVAL,
  );
  assert.equal(parseBookingStatusFilter(BookingStatus.SCHEDULED), undefined);
  assert.equal(parseBookingStatusFilter(['DRAFT', 'APPROVED']), undefined);
  assert.equal(parseBookingStatusFilter('unknown'), undefined);
});

test('uses the primary contact as the display customer', () => {
  const firstCustomer = { id: 'first' };
  const primaryCustomer = { id: 'primary' };

  assert.equal(
    resolveDisplayCustomer([
      { role: BookingCustomerRole.PARTICIPANT, customer: firstCustomer },
      { role: BookingCustomerRole.PRIMARY_CONTACT, customer: primaryCustomer },
    ]),
    primaryCustomer,
  );
});

test('falls back to the first booking customer or null', () => {
  const firstCustomer = { id: 'first' };

  assert.equal(
    resolveDisplayCustomer([
      { role: BookingCustomerRole.PARTICIPANT, customer: firstCustomer },
    ]),
    firstCustomer,
  );
  assert.equal(resolveDisplayCustomer([]), null);
});

test('scopes booking queries to the current user role', () => {
  const customerServiceUser = {
    id: 'customer-service-user',
    name: 'Customer Service',
    email: 'cs@example.test',
    role: UserRole.CUSTOMER_SERVICE,
  };
  const adminUser: CurrentUser = {
    ...customerServiceUser,
    id: 'admin-user',
    role: UserRole.ADMIN,
  };
  const managerUser: CurrentUser = {
    ...customerServiceUser,
    id: 'manager-user',
    role: UserRole.MANAGER,
  };

  assert.deepEqual(
    buildBookingRequestWhere(customerServiceUser, BookingStatus.DRAFT),
    { status: BookingStatus.DRAFT, createdById: customerServiceUser.id },
  );
  assert.deepEqual(buildBookingRequestWhere(adminUser), {});
  assert.deepEqual(buildBookingRequestWhere(managerUser), {});
});
