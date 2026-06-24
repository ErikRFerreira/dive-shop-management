import { expect, test } from 'vitest';

import {
  canResubmitBookingForApproval,
  canReviewBookingRequest,
} from '@/features/bookings/permissions';
import { UserRole } from '@/generated/prisma/enums';

test('allows only admin and manager users to access booking review', () => {
  expect(canReviewBookingRequest({ role: UserRole.ADMIN })).toBe(true);
  expect(canReviewBookingRequest({ role: UserRole.MANAGER })).toBe(true);
  expect(canReviewBookingRequest({ role: UserRole.CUSTOMER_SERVICE })).toBe(
    false,
  );
  expect(canReviewBookingRequest({ role: UserRole.INSTRUCTOR })).toBe(false);
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
