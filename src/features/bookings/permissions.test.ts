import { expect, test } from 'vitest';

import {
  canApproveBookingRequest,
  canEditBooking,
  canResubmitBookingForApproval,
  canReviewBookingRequest,
} from '@/features/bookings/permissions';
import { BookingStatus, UserRole } from '@/generated/prisma/enums';

test('allows only admin and manager users to access booking review', () => {
  expect(canReviewBookingRequest({ role: UserRole.ADMIN })).toBe(true);
  expect(canReviewBookingRequest({ role: UserRole.MANAGER })).toBe(true);
  expect(canReviewBookingRequest({ role: UserRole.CUSTOMER_SERVICE })).toBe(
    false,
  );
  expect(canReviewBookingRequest({ role: UserRole.INSTRUCTOR })).toBe(false);
});

test('allows only admin and manager users to approve bookings', () => {
  expect(canApproveBookingRequest({ role: UserRole.ADMIN })).toBe(true);
  expect(canApproveBookingRequest({ role: UserRole.MANAGER })).toBe(true);
  expect(canApproveBookingRequest({ role: UserRole.CUSTOMER_SERVICE })).toBe(
    false,
  );
  expect(canApproveBookingRequest({ role: UserRole.INSTRUCTOR })).toBe(false);
});

test('allows only the owner in Customer Service to resubmit a booking', () => {
  const owner = { id: 'owner', role: UserRole.CUSTOMER_SERVICE };
  const otherCustomerServiceUser = {
    id: 'other-user',
    role: UserRole.CUSTOMER_SERVICE,
  };

  expect(canResubmitBookingForApproval(owner, 'owner')).toBe(true);
  expect(canResubmitBookingForApproval(otherCustomerServiceUser, 'owner')).toBe(
    false,
  );
  expect(
    canResubmitBookingForApproval({ id: 'admin', role: UserRole.ADMIN }, 'owner'),
  ).toBe(true);
  expect(
    canResubmitBookingForApproval({ id: 'manager', role: UserRole.MANAGER }, 'owner'),
  ).toBe(true);
});

test.each([
  [UserRole.CUSTOMER_SERVICE, 'owner', BookingStatus.DRAFT, true],
  [UserRole.CUSTOMER_SERVICE, 'owner', BookingStatus.NEEDS_MORE_INFO, true],
  [UserRole.CUSTOMER_SERVICE, 'other', BookingStatus.DRAFT, false],
  [UserRole.CUSTOMER_SERVICE, 'owner', BookingStatus.PENDING_APPROVAL, false],
  [UserRole.ADMIN, 'owner', BookingStatus.DRAFT, true],
  [UserRole.ADMIN, 'owner', BookingStatus.PENDING_APPROVAL, true],
  [UserRole.MANAGER, 'owner', BookingStatus.NEEDS_MORE_INFO, true],
  [UserRole.ADMIN, 'owner', BookingStatus.SCHEDULED, false],
  [UserRole.MANAGER, 'owner', BookingStatus.CANCELLED, false],
  [UserRole.ADMIN, 'owner', BookingStatus.APPROVED, false],
  [UserRole.INSTRUCTOR, 'owner', BookingStatus.DRAFT, false],
] as const)(
  'allows edit for %s on %s when created by %s: %s',
  (role, createdById, status, expected) => {
    expect(
      canEditBooking({ id: 'owner', role }, createdById, status),
    ).toBe(expected);
  },
);
