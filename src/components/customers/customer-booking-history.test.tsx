import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import {
  ActivityType,
  BookingCustomerRole,
  BookingSource,
  BookingStatus,
} from '@/generated/prisma/enums';
import { CustomerBookingHistory } from './customer-booking-history';

afterEach(() => {
  cleanup();
});

test('renders operational booking history details with booking-specific values', () => {
  render(
    <CustomerBookingHistory
      bookings={[
        {
          bookingId: 'booking-1',
          status: BookingStatus.SCHEDULED,
          date: new Date('2026-07-03T00:00:00.000Z'),
          requestedDate: new Date('2026-07-02T00:00:00.000Z'),
          requestedTime: '09:00',
          scheduledDate: new Date('2026-07-03T00:00:00.000Z'),
          scheduledTime: null,
          activityType: ActivityType.ADVANCED_OPEN_WATER_COURSE,
          activities: [
            {
              activityType: ActivityType.ADVANCED_OPEN_WATER_COURSE,
              requestedDate: new Date('2026-07-02T00:00:00.000Z'),
              requestedTime: '09:00',
            },
          ],
          role: BookingCustomerRole.PRIMARY_CONTACT,
          isPrimaryContact: true,
          numberOfPeople: 2,
          source: BookingSource.WHATSAPP,
          referrerName: null,
          hotelAtBooking: 'Marks hause',
          createdAt: new Date('2026-07-01T08:00:00.000Z'),
          updatedAt: new Date('2026-07-01T10:00:00.000Z'),
        },
      ]}
    />,
  );

  expect(screen.getByText('Activity / Schedule')).not.toBeNull();
  expect(screen.getByText('Primary contact')).not.toBeNull();
  expect(screen.getByText('People: 2')).not.toBeNull();
  expect(screen.getByText('Whatsapp')).not.toBeNull();
  expect(screen.getByText('Hotel: Marks hause')).not.toBeNull();
  expect(screen.getByLabelText('View booking').getAttribute('href')).toBe(
    '/bookings/booking-1',
  );
});
