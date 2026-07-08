import { expect, test } from 'vitest';

import {
  canApproveBookingRequest,
  canCancelBooking,
  canEditBooking,
  canManageScheduledBookingParticipants,
  canReviewBooking,
  canViewBooking,
  canResubmitBookingForApproval,
  canReviewBookingRequest,
  getAvailableBookingRowActions,
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

test('allows only visible booking owners and operations roles to view bookings', () => {
  expect(canViewBooking({ id: 'admin', role: UserRole.ADMIN }, 'owner')).toBe(
    true,
  );
  expect(canViewBooking({ id: 'manager', role: UserRole.MANAGER }, 'owner')).toBe(
    true,
  );
  expect(
    canViewBooking({ id: 'owner', role: UserRole.CUSTOMER_SERVICE }, 'owner'),
  ).toBe(true);
  expect(
    canViewBooking({ id: 'other', role: UserRole.CUSTOMER_SERVICE }, 'owner'),
  ).toBe(false);
  expect(
    canViewBooking({ id: 'instructor', role: UserRole.INSTRUCTOR }, 'owner'),
  ).toBe(false);
});

test('shows review navigation only to admin and manager users for pending bookings', () => {
  expect(canReviewBooking({ role: UserRole.ADMIN }, BookingStatus.PENDING_APPROVAL)).toBe(
    true,
  );
  expect(
    canReviewBooking({ role: UserRole.MANAGER }, BookingStatus.PENDING_APPROVAL),
  ).toBe(true);
  expect(
    canReviewBooking(
      { role: UserRole.CUSTOMER_SERVICE },
      BookingStatus.PENDING_APPROVAL,
    ),
  ).toBe(false);
  expect(canReviewBooking({ role: UserRole.ADMIN }, BookingStatus.DRAFT)).toBe(
    false,
  );
});

test('allows only admin and manager users to approve bookings', () => {
  expect(canApproveBookingRequest({ role: UserRole.ADMIN })).toBe(true);
  expect(canApproveBookingRequest({ role: UserRole.MANAGER })).toBe(true);
  expect(canApproveBookingRequest({ role: UserRole.CUSTOMER_SERVICE })).toBe(
    false,
  );
  expect(canApproveBookingRequest({ role: UserRole.INSTRUCTOR })).toBe(false);
});

test.each([
  [UserRole.ADMIN, BookingStatus.SCHEDULED, true],
  [UserRole.MANAGER, BookingStatus.SCHEDULED, true],
  [UserRole.ADMIN, BookingStatus.PENDING_APPROVAL, true],
  [UserRole.MANAGER, BookingStatus.NEEDS_MORE_INFO, true],
  [UserRole.CUSTOMER_SERVICE, BookingStatus.SCHEDULED, false],
  [UserRole.INSTRUCTOR, BookingStatus.SCHEDULED, false],
  [UserRole.ADMIN, BookingStatus.DRAFT, false],
  [UserRole.MANAGER, BookingStatus.CANCELLED, false],
] as const)('allows cancellation for %s on %s: %s', (role, status, expected) => {
  expect(canCancelBooking({ role }, status)).toBe(expected);
});

test.each([
  [UserRole.ADMIN, BookingStatus.SCHEDULED, true],
  [UserRole.MANAGER, BookingStatus.SCHEDULED, true],
  [UserRole.CUSTOMER_SERVICE, BookingStatus.SCHEDULED, false],
  [UserRole.INSTRUCTOR, BookingStatus.SCHEDULED, false],
  [UserRole.ADMIN, BookingStatus.DRAFT, false],
  [UserRole.MANAGER, BookingStatus.PENDING_APPROVAL, false],
  [UserRole.ADMIN, BookingStatus.NEEDS_MORE_INFO, false],
  [UserRole.MANAGER, BookingStatus.APPROVED, false],
  [UserRole.ADMIN, BookingStatus.CANCELLED, false],
] as const)(
  'allows participant status management for %s on %s: %s',
  (role, status, expected) => {
    expect(canManageScheduledBookingParticipants({ role }, status)).toBe(
      expected,
    );
  },
);

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

test.each([
  [
    { id: 'admin', role: UserRole.ADMIN },
    { createdById: 'owner', status: BookingStatus.PENDING_APPROVAL },
    ['view', 'edit', 'review'],
  ],
  [
    { id: 'manager', role: UserRole.MANAGER },
    { createdById: 'owner', status: BookingStatus.NEEDS_MORE_INFO },
    ['view', 'edit'],
  ],
  [
    { id: 'owner', role: UserRole.CUSTOMER_SERVICE },
    { createdById: 'owner', status: BookingStatus.DRAFT },
    ['view', 'edit'],
  ],
  [
    { id: 'owner', role: UserRole.CUSTOMER_SERVICE },
    { createdById: 'owner', status: BookingStatus.PENDING_APPROVAL },
    ['view'],
  ],
  [
    { id: 'instructor', role: UserRole.INSTRUCTOR },
    { createdById: 'owner', status: BookingStatus.PENDING_APPROVAL },
    [],
  ],
  [
    { id: 'admin', role: UserRole.ADMIN },
    { createdById: 'owner', status: BookingStatus.SCHEDULED },
    ['view', 'cancel'],
  ],
  [
    { id: 'manager', role: UserRole.MANAGER },
    { createdById: 'owner', status: BookingStatus.SCHEDULED },
    ['view', 'cancel'],
  ],
  [
    { id: 'owner', role: UserRole.CUSTOMER_SERVICE },
    { createdById: 'owner', status: BookingStatus.SCHEDULED },
    ['view'],
  ],
  [
    { id: 'instructor', role: UserRole.INSTRUCTOR },
    { createdById: 'owner', status: BookingStatus.SCHEDULED },
    [],
  ],
] as const)(
  'returns booking row actions for %s on %s',
  (currentUser, booking, expectedActions) => {
    expect(getAvailableBookingRowActions(currentUser, booking)).toEqual(
      expectedActions,
    );
  },
);
