import { expect, test } from 'vitest';

import {
  canPerformBookingStatusTransition,
} from '@/features/bookings/permissions';
import {
  assertCanTransitionBookingStatus,
  canTransitionBookingStatus,
} from '@/features/bookings/status';
import { BookingStatus, UserRole } from '@/generated/prisma/enums';

const validTransitions = [
  [BookingStatus.DRAFT, BookingStatus.PENDING_APPROVAL],
  [BookingStatus.PENDING_APPROVAL, BookingStatus.NEEDS_MORE_INFO],
  [BookingStatus.PENDING_APPROVAL, BookingStatus.CANCELLED],
  [BookingStatus.PENDING_APPROVAL, BookingStatus.SCHEDULED],
  [BookingStatus.NEEDS_MORE_INFO, BookingStatus.PENDING_APPROVAL],
  [BookingStatus.NEEDS_MORE_INFO, BookingStatus.CANCELLED],
] as const;

/** Verifies every transition defined for the Sprint 2 booking workflow. */
test.each(validTransitions)(
  'allows %s -> %s',
  (currentStatus, nextStatus) => {
    expect(canTransitionBookingStatus(currentStatus, nextStatus)).toBe(true);
    expect(() =>
      assertCanTransitionBookingStatus(currentStatus, nextStatus),
    ).not.toThrow();
  },
);

/** Verifies unsupported, reversed, and terminal booking transitions are denied. */
test.each([
  [BookingStatus.PENDING_APPROVAL, BookingStatus.DRAFT],
  [BookingStatus.NEEDS_MORE_INFO, BookingStatus.SCHEDULED],
  [BookingStatus.SCHEDULED, BookingStatus.CANCELLED],
  [BookingStatus.CANCELLED, BookingStatus.PENDING_APPROVAL],
  [BookingStatus.APPROVED, BookingStatus.SCHEDULED],
])('denies %s -> %s', (currentStatus, nextStatus) => {
  expect(canTransitionBookingStatus(currentStatus, nextStatus)).toBe(false);
});

/** Verifies invalid transitions produce a clear assertion error. */
test('throws an error naming both statuses for an invalid transition', () => {
  expect(() =>
    assertCanTransitionBookingStatus(
      BookingStatus.PENDING_APPROVAL,
      BookingStatus.DRAFT,
    ),
  ).toThrow('Invalid booking status transition: PENDING_APPROVAL -> DRAFT.');
});

/** Verifies admin review transitions are restricted to the intended roles. */
test('enforces booking transition permissions by role', () => {
  const admin = { role: UserRole.ADMIN };
  const manager = { role: UserRole.MANAGER };
  const customerService = { role: UserRole.CUSTOMER_SERVICE };
  const instructor = { role: UserRole.INSTRUCTOR };

  for (const [currentStatus, nextStatus] of validTransitions) {
    expect(
      canPerformBookingStatusTransition(admin, currentStatus, nextStatus),
    ).toBe(true);
    expect(
      canPerformBookingStatusTransition(manager, currentStatus, nextStatus),
    ).toBe(true);
    expect(
      canPerformBookingStatusTransition(instructor, currentStatus, nextStatus),
    ).toBe(false);
  }

  expect(
    canPerformBookingStatusTransition(
      customerService,
      BookingStatus.DRAFT,
      BookingStatus.PENDING_APPROVAL,
    ),
  ).toBe(false);
  expect(
    canPerformBookingStatusTransition(
      customerService,
      BookingStatus.NEEDS_MORE_INFO,
      BookingStatus.PENDING_APPROVAL,
    ),
  ).toBe(true);
  expect(
    canPerformBookingStatusTransition(
      customerService,
      BookingStatus.PENDING_APPROVAL,
      BookingStatus.SCHEDULED,
    ),
  ).toBe(false);
  expect(
    canPerformBookingStatusTransition(
      customerService,
      BookingStatus.PENDING_APPROVAL,
      BookingStatus.NEEDS_MORE_INFO,
    ),
  ).toBe(false);
  expect(
    canPerformBookingStatusTransition(
      customerService,
      BookingStatus.PENDING_APPROVAL,
      BookingStatus.CANCELLED,
    ),
  ).toBe(false);
});
