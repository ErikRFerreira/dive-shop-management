import { expect, test } from 'vitest';

import { BookingStatus } from '@/generated/prisma/enums';
import {
  buildBookingFilterHref,
  buildBookingPageHref,
  buildBookingSortHref,
  getVisiblePages,
} from './booking-pagination-helpers';

test('builds booking page hrefs with status, queue, and unfiltered state', () => {
  expect(
    buildBookingPageHref({
      page: 2,
      pageSize: 10,
      selectedSort: 'recently-updated',
    }),
  ).toBe('/bookings?sort=recently-updated&page=2&pageSize=10');
  expect(
    buildBookingPageHref({
      page: 3,
      pageSize: 10,
      selectedSort: 'newest-created',
      selectedStatus: BookingStatus.DRAFT,
    }),
  ).toBe('/bookings?status=DRAFT&sort=newest-created&page=3&pageSize=10');
  expect(
    buildBookingPageHref({
      page: 4,
      pageSize: 10,
      selectedQueue: 'unassigned',
      selectedSort: 'activity-date',
      selectedStatus: BookingStatus.DRAFT,
    }),
  ).toBe('/bookings?queue=unassigned&sort=activity-date&page=4&pageSize=10');
});

test('builds booking filter and sort hrefs that preserve list state', () => {
  expect(
    buildBookingFilterHref({
      pageSize: 10,
      selectedSort: 'activity-date',
      selectedStatus: BookingStatus.PENDING_APPROVAL,
    }),
  ).toBe(
    '/bookings?status=PENDING_APPROVAL&sort=activity-date&page=1&pageSize=10',
  );
  expect(
    buildBookingSortHref({
      pageSize: 10,
      selectedQueue: 'unassigned',
      selectedSort: 'newest-created',
      selectedStatus: BookingStatus.DRAFT,
    }),
  ).toBe('/bookings?queue=unassigned&sort=newest-created&page=1&pageSize=10');
});

test('computes compact visible page windows', () => {
  expect(getVisiblePages(1, 10)).toEqual([1, 2, 3, 4, 10]);
  expect(getVisiblePages(5, 10)).toEqual([1, 4, 5, 6, 10]);
  expect(getVisiblePages(9, 10)).toEqual([1, 7, 8, 9, 10]);
});
