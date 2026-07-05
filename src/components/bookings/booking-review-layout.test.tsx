import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { BookingReview } from '@/components/bookings/booking-review';
import type { BookingDetailsItem } from '@/features/bookings/queries';
import {
  ActivityType,
  BookingCustomerRole,
  BookingSource,
  BookingStatus,
  PreferredLanguage,
} from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  approveBooking: vi.fn(),
  cancelBooking: vi.fn(),
  markBookingNeedsMoreInfo: vi.fn(),
}));

vi.mock('@/features/bookings/actions', () => ({
  approveBooking: mocks.approveBooking,
  cancelBooking: mocks.cancelBooking,
  markBookingNeedsMoreInfo: mocks.markBookingNeedsMoreInfo,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/**
 * Asserts that one rendered element appears before another in document order.
 *
 * @param first - Element expected to appear first.
 * @param second - Element expected to appear second.
 */
function expectElementBefore(first: HTMLElement, second: HTMLElement) {
  expect(
    first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
}

/**
 * Builds a reviewable booking payload with complete required information.
 *
 * @param overrides - Booking fields to override for focused layout scenarios.
 * @returns Booking detail data matching the review component contract.
 */
function booking(
  overrides: Partial<BookingDetailsItem> = {},
): BookingDetailsItem {
  const createdAt = new Date('2026-07-01T08:00:00.000Z');

  return {
    id: 'booking-1',
    status: BookingStatus.PENDING_APPROVAL,
    activityType: ActivityType.RESCUE_DIVER_COURSE,
    specialtyCourse: null,
    source: BookingSource.WALK_IN,
    requestedDate: new Date('2026-07-14T00:00:00.000Z'),
    requestedTime: null,
    numberOfPeople: 1,
    referrerName: null,
    startAt: null,
    endAt: null,
    notes: null,
    internalNotes: null,
    adminNotes: null,
    needsMoreInfoReason: null,
    createdById: 'cs-1',
    createdBy: {
      id: 'cs-1',
      name: 'Customer Service User',
    },
    activities: [
      {
        id: 'activity-1',
        bookingRequestId: 'booking-1',
        activityType: ActivityType.RESCUE_DIVER_COURSE,
        specialtyCourse: null,
        requestedDate: new Date('2026-07-14T00:00:00.000Z'),
        requestedTime: null,
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
        hotelAtBooking: 'Mark Hotel',
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
          fullName: 'Anchie',
          firstName: null,
          lastName: null,
          chineseName: null,
          weChatId: '213213321',
          whatsAppNumber: null,
          email: 'test@mail.com',
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
      fullName: 'Anchie',
      firstName: null,
      lastName: null,
      chineseName: null,
      weChatId: '213213321',
      whatsAppNumber: null,
      email: 'test@mail.com',
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

test('renders review sections before the sticky decision rail', () => {
  render(<BookingReview booking={booking()} canApprove />);

  const sidebar = screen.getByTestId('booking-review-sidebar');
  const stickyRail = sidebar.parentElement;

  expect(stickyRail).not.toBeNull();
  expect(stickyRail?.tagName).toBe('ASIDE');
  expect(stickyRail?.className).toContain('lg:sticky');
  expectElementBefore(
    screen.getByRole('heading', { name: 'Admin review' }),
    screen.getByText('Booking summary'),
  );
  expectElementBefore(
    screen.getByText('Internal notes from customer service'),
    sidebar,
  );
  expect(screen.getByText('Review readiness')).not.toBeNull();
  expect(screen.getByText('Admin decision')).not.toBeNull();
});
