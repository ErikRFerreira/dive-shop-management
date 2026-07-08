import {
  BookingCustomerRole,
  BookingParticipantStatus,
} from '@/generated/prisma/enums';

type BookingParticipantStatusCarrier = {
  participationStatus: BookingParticipantStatus | null;
};

type BookingParticipantRoleCarrier = BookingParticipantStatusCarrier & {
  role: BookingCustomerRole;
};

type BookingCustomerNameFields = {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  chineseName?: string | null;
};

/**
 * Returns only booking/customer join rows that count toward current operations.
 *
 * @typeParam TParticipant - Booking/customer join row shape being filtered.
 * @param participants - Booking participants attached to a booking request.
 * @returns Participants whose participation status is `ACTIVE`.
 */
export function getActiveBookingParticipants<
  TParticipant extends BookingParticipantStatusCarrier,
>(participants: TParticipant[]): TParticipant[] {
  return participants.filter(
    (participant) =>
      participant.participationStatus === BookingParticipantStatus.ACTIVE,
  );
}

/**
 * Returns historical booking/customer join rows that should stay attached but not counted.
 *
 * @typeParam TParticipant - Booking/customer join row shape being filtered.
 * @param participants - Booking participants attached to a booking request.
 * @returns Participants with a non-active participation status.
 */
export function getInactiveBookingParticipants<
  TParticipant extends BookingParticipantStatusCarrier,
>(participants: TParticipant[]): TParticipant[] {
  return participants.filter(
    (participant) =>
      participant.participationStatus !== BookingParticipantStatus.ACTIVE,
  );
}

/**
 * Counts the active operational participants for a booking.
 *
 * @param participants - Booking/customer join rows attached to a booking request.
 * @returns The number of participants whose participation status is `ACTIVE`.
 */
export function getActiveParticipantCount(
  participants: BookingParticipantStatusCarrier[],
) {
  return getActiveBookingParticipants(participants).length;
}

/**
 * Formats an active participant count for staff-facing operational displays.
 *
 * @param activeParticipantCount - Count already derived from active booking participants.
 * @returns A compact singular or plural participant label.
 */
export function formatActiveParticipantCount(activeParticipantCount: number) {
  const label = activeParticipantCount === 1 ? 'participant' : 'participants';

  return `${activeParticipantCount} active ${label}`;
}

/**
 * Formats a booking participant status for staff-facing badges.
 *
 * @param status - Stored participant status enum value.
 * @returns Short display copy that distinguishes active work from historical participants.
 */
export function formatParticipantStatusLabel(
  status: BookingParticipantStatus,
) {
  switch (status) {
    case BookingParticipantStatus.ACTIVE:
      return 'Active';
    case BookingParticipantStatus.DROPPED_OUT:
      return 'Dropped out';
    case BookingParticipantStatus.CANCELLED:
      return 'Cancelled';
    case BookingParticipantStatus.NO_SHOW:
      return 'No-show';
  }
}

/**
 * Finds the primary active booking/customer join row for operational display.
 *
 * @typeParam TParticipant - Booking/customer join row shape being searched.
 * @param participants - Booking participants attached to a booking request in stable display order.
 * @returns The active primary contact, first active participant fallback, or null.
 */
export function getPrimaryActiveBookingCustomer<
  TParticipant extends BookingParticipantRoleCarrier,
>(participants: TParticipant[]): TParticipant | null {
  const activeParticipants = getActiveBookingParticipants(participants);

  return (
    activeParticipants.find(
      (participant) => participant.role === BookingCustomerRole.PRIMARY_CONTACT,
    ) ??
    activeParticipants[0] ??
    null
  );
}

/**
 * Formats a customer name from booking/customer display fields.
 *
 * @param customer - Customer name fields selected through a booking participant.
 * @param emptyValue - Fallback text to use when no customer name has been recorded.
 * @returns Full name, first/last name, Chinese name, or the provided fallback.
 */
export function formatBookingCustomerDisplayName(
  customer: BookingCustomerNameFields | null | undefined,
  emptyValue = 'Unnamed customer',
) {
  const fullName = customer?.fullName?.trim();
  if (fullName) {
    return fullName;
  }

  const englishName = [customer?.firstName, customer?.lastName]
    .filter((part): part is string => Boolean(part?.trim()))
    .map((part) => part.trim())
    .join(' ')
    .trim();

  return englishName || customer?.chineseName?.trim() || emptyValue;
}
