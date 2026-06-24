import { expect, test } from 'vitest';

import { canReviewBookingRequest } from '@/features/bookings/permissions';
import { UserRole } from '@/generated/prisma/enums';

test('allows only admin and manager users to access booking review', () => {
  expect(canReviewBookingRequest({ role: UserRole.ADMIN })).toBe(true);
  expect(canReviewBookingRequest({ role: UserRole.MANAGER })).toBe(true);
  expect(canReviewBookingRequest({ role: UserRole.CUSTOMER_SERVICE })).toBe(
    false,
  );
  expect(canReviewBookingRequest({ role: UserRole.INSTRUCTOR })).toBe(false);
});
