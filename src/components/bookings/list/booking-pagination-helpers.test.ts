import { expect, test } from 'vitest';

import { BookingStatus } from '@/generated/prisma/enums';
import {
  buildBookingPageHref,
  getVisiblePages,
} from './booking-pagination-helpers';

test('builds booking page hrefs with status, queue, and unfiltered state', () => {
  expect(buildBookingPageHref({ page: 2, pageSize: 10 })).toBe(
    '/bookings?page=2&pageSize=10',
  );
  expect(
    buildBookingPageHref({
      page: 3,
      pageSize: 10,
      selectedStatus: BookingStatus.DRAFT,
    }),
  ).toBe('/bookings?status=DRAFT&page=3&pageSize=10');
  expect(
    buildBookingPageHref({
      page: 4,
      pageSize: 10,
      selectedQueue: 'unassigned',
      selectedStatus: BookingStatus.DRAFT,
    }),
  ).toBe('/bookings?queue=unassigned&page=4&pageSize=10');
});

test('computes compact visible page windows', () => {
  expect(getVisiblePages(1, 10)).toEqual([1, 2, 3, 4, 10]);
  expect(getVisiblePages(5, 10)).toEqual([1, 4, 5, 6, 10]);
  expect(getVisiblePages(9, 10)).toEqual([1, 7, 8, 9, 10]);
});
