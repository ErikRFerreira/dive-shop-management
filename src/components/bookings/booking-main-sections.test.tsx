import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import type { BookingDetailsItem } from '@/features/bookings/queries';
import {
  ActivityType,
  BookingCustomerRole,
  BookingSource,
  BookingStatus,
  PreferredLanguage,
} from '@/generated/prisma/enums';
import { BookingMainSections } from './booking-main-sections';

afterEach(() => {
  cleanup();
});

/**
 * Builds a booking detail payload for shared left-column section tests.
 *
 * @param overrides - Booking fields to override for a scenario.
 * @returns Booking detail data matching the shared section contract.
 */
function booking(
  overrides: Partial<BookingDetailsItem> = {},
): BookingDetailsItem {
  const createdAt = new Date('2026-07-01T08:00:00.000Z');

  return {
    id: 'booking-1',
    status: BookingStatus.PENDING_APPROVAL,
    activityType: ActivityType.FUN_DIVE,
    specialtyCourse: null,
    source: BookingSource.WHATSAPP,
    requestedDate: new Date('2026-07-14T00:00:00.000Z'),
    requestedTime: '08:00',
    numberOfPeople: 2,
    referrerName: 'Reef Club',
    startAt: null,
    endAt: null,
    notes: null,
    internalNotes: null,
    adminNotes: null,
    needsMoreInfoReason: null,
    createdById: 'cs-1',
    createdBy: {
      id: 'cs-1',
      name: 'Casey Service',
    },
    activities: [
      {
        id: 'activity-1',
        bookingRequestId: 'booking-1',
        activityType: ActivityType.FUN_DIVE,
        specialtyCourse: null,
        requestedDate: new Date('2026-07-14T00:00:00.000Z'),
        requestedTime: '08:00',
        notes: null,
        sortOrder: 0,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    customers: [
      {
        bookingRequestId: 'booking-1',
        customerId: 'customer-1',
        role: BookingCustomerRole.PRIMARY_CONTACT,
        hotelAtBooking: 'Blue Hotel',
        equipmentNeeded: null,
        notes: null,
        certificationAgency: null,
        certificationLevel: null,
        lastDiveAt: null,
        heightCm: null,
        weightKg: null,
        shoeSize: null,
        divesLogged: null,
        createdAt,
        updatedAt: createdAt,
        customer: {
          id: 'customer-1',
          fullName: 'Maria Santos',
          firstName: null,
          lastName: null,
          chineseName: null,
          weChatId: null,
          whatsAppNumber: null,
          email: null,
          phone: null,
          hotel: null,
          preferredLanguage: PreferredLanguage.ENGLISH,
          notes: null,
          createdAt,
          updatedAt: createdAt,
        },
      },
    ],
    deposits: [],
    scheduleItem: null,
    createdAt,
    updatedAt: createdAt,
    displayCustomer: {
      id: 'customer-1',
      fullName: 'Maria Santos',
      firstName: null,
      lastName: null,
      chineseName: null,
      weChatId: null,
      whatsAppNumber: null,
      email: null,
      phone: null,
      hotel: null,
      preferredLanguage: PreferredLanguage.ENGLISH,
      notes: null,
      createdAt,
      updatedAt: createdAt,
    },
    ...overrides,
  } as BookingDetailsItem;
}

test('renders the details summary and internal notes variants', () => {
  render(
    <BookingMainSections
      activities={booking().activities}
      booking={booking({
        adminNotes: null,
        internalNotes: null,
      })}
      includesFunDive
      internalNotesVariant="details"
      summaryTitle="Booking reference"
    />,
  );

  expect(screen.getByText('Booking reference')).not.toBeNull();
  expect(screen.getByText(/Booking ID:/)).not.toBeNull();
  expect(screen.getAllByText('Hotel / pickup location').length).toBeGreaterThan(
    0,
  );
  expect(screen.getByText('Assigned staff')).not.toBeNull();
  expect(screen.getByText('No internal notes.')).not.toBeNull();
  expect(screen.getByText('No admin notes yet.')).not.toBeNull();
});

test('renders the review summary and customer-service internal notes variant', () => {
  render(
    <BookingMainSections
      activities={booking().activities}
      booking={booking({
        internalNotes: 'Customer service note for admin.',
      })}
      includesFunDive
      internalNotesVariant="review"
      summaryTitle="Booking summary"
    />,
  );

  expect(screen.getByText('Booking summary')).not.toBeNull();
  expect(screen.getByText(/Booking ID:/)).not.toBeNull();
  expect(screen.getByText('Activity')).not.toBeNull();
  expect(screen.getAllByText('Hotel / pickup location').length).toBeGreaterThan(
    0,
  );
  expect(screen.getByText('Assigned staff')).not.toBeNull();
  expect(screen.getByText('Internal notes from customer service')).not.toBeNull();
  expect(screen.getByText('Customer service note for admin.')).not.toBeNull();
});
