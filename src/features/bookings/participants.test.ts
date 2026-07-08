import { describe, expect, it } from 'vitest';

import {
  BookingCustomerRole,
  BookingParticipantStatus,
} from '@/generated/prisma/enums';
import {
  formatActiveParticipantCount,
  formatBookingCustomerDisplayName,
  formatParticipantStatusLabel,
  getActiveBookingParticipants,
  getActiveParticipantCount,
  getInactiveBookingParticipants,
  getPrimaryActiveBookingCustomer,
} from './participants';

/**
 * Creates a compact booking/customer join row for participant helper tests.
 *
 * @param id - Stable row identifier used to assert ordering.
 * @param participationStatus - Operational participation status to assign.
 * @param role - Booking/customer role to assign.
 * @returns Minimal participant row accepted by the booking participant helpers.
 */
function participant(
  id: string,
  participationStatus: BookingParticipantStatus,
  role = BookingCustomerRole.PARTICIPANT,
) {
  return {
    id,
    participationStatus,
    role,
  };
}

describe('booking participant helpers', () => {
  const participants = [
    participant(
      'dropped-primary',
      BookingParticipantStatus.DROPPED_OUT,
      BookingCustomerRole.PRIMARY_CONTACT,
    ),
    participant('active-participant', BookingParticipantStatus.ACTIVE),
    participant(
      'active-primary',
      BookingParticipantStatus.ACTIVE,
      BookingCustomerRole.PRIMARY_CONTACT,
    ),
    participant('cancelled', BookingParticipantStatus.CANCELLED),
    participant('no-show', BookingParticipantStatus.NO_SHOW),
  ];

  it('separates active operational participants from inactive history', () => {
    expect(getActiveBookingParticipants(participants).map((row) => row.id)).toEqual(
      ['active-participant', 'active-primary'],
    );
    expect(
      getInactiveBookingParticipants(participants).map((row) => row.id),
    ).toEqual(['dropped-primary', 'cancelled', 'no-show']);
    expect(getActiveParticipantCount(participants)).toBe(2);
  });

  it('prefers the primary contact only when that participant is active', () => {
    expect(getPrimaryActiveBookingCustomer(participants)?.id).toBe(
      'active-primary',
    );
    expect(getPrimaryActiveBookingCustomer(participants.slice(0, 2))?.id).toBe(
      'active-participant',
    );
  });

  it('formats active counts and customer display names', () => {
    expect(formatActiveParticipantCount(1)).toBe('1 active participant');
    expect(formatActiveParticipantCount(3)).toBe('3 active participants');
    expect(formatParticipantStatusLabel(BookingParticipantStatus.ACTIVE)).toBe(
      'Active',
    );
    expect(
      formatParticipantStatusLabel(BookingParticipantStatus.DROPPED_OUT),
    ).toBe('Dropped out');
    expect(
      formatParticipantStatusLabel(BookingParticipantStatus.CANCELLED),
    ).toBe('Cancelled');
    expect(formatParticipantStatusLabel(BookingParticipantStatus.NO_SHOW)).toBe(
      'No-show',
    );
    expect(
      formatBookingCustomerDisplayName({
        firstName: ' Mei ',
        lastName: ' Chen ',
      }),
    ).toBe('Mei Chen');
  });
});
