/**
 * Purpose: This module provides a function to validate booking details,
 * and return a list of warnings for any missing or invalid information.
 * It checks for required fields in activities, customers, deposits, and other booking-related data.
 *
 * @module features/bookings/review-requirements
 */

import type { BookingDetailsItem } from '@/features/bookings/queries';
import { getDepositReadiness } from '@/features/bookings/deposit-readiness';
import { isEquipmentNeeded } from '@/features/bookings/equipment';
import { getActiveBookingParticipants } from '@/features/bookings/participants';
import {
  ActivityType,
  BookingCustomerRole,
  DepositStatus,
} from '@/generated/prisma/enums';

export type ReviewReadinessStatus =
  | 'complete'
  | 'missing'
  | 'recommended/optional'
  | 'not required';

export type ReviewReadinessItem = {
  label: string;
  status: ReviewReadinessStatus;
  description: string;
};

/**
 * Checks if a string has non-whitespace text.
 *
 * @param value - The string to check.
 * @returns True if the string has non-whitespace text, false otherwise.
 */
function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

/**
 * Returns activities used for review checks, preserving the legacy booking fields fallback.
 *
 * @param booking - Booking detail payload being reviewed.
 * @returns Activity rows from the relation, or one fallback row from legacy booking fields.
 */
function getRequirementActivities(booking: BookingDetailsItem) {
  return booking.activities.length > 0
    ? booking.activities
    : [
        {
          activityType: booking.activityType,
          requestedDate: booking.requestedDate,
        },
      ];
}

/**
 * Checks if a customer has a valid name.
 *
 * @param customer - The customer to check.
 * @returns True if the customer has a valid name, false otherwise.
 */
function hasCustomerName(customer: BookingDetailsItem['displayCustomer']) {
  return Boolean(
    customer?.fullName?.trim() ||
      [customer?.firstName, customer?.lastName].some(hasText),
  );
}

/**
 * Finds the active booking customer marked as the primary contact.
 *
 * @param booking - Booking detail payload with customer join rows.
 * @returns Primary contact row when exactly one exists, otherwise null.
 */
function getPrimaryContact(booking: BookingDetailsItem) {
  const primaryContacts = getActiveBookingParticipants(booking.customers).filter(
    (bookingCustomer) =>
      bookingCustomer.role === BookingCustomerRole.PRIMARY_CONTACT,
  );

  return primaryContacts.length === 1 ? primaryContacts[0] : null;
}

/**
 * Checks whether a customer has any supported contact method.
 *
 * @param customer - Customer profile fields attached to a booking customer.
 * @returns True when WeChat, WhatsApp, email, or phone is present.
 */
function hasContactMethod(
  customer: BookingDetailsItem['customers'][number]['customer'],
) {
  return [
    customer.weChatId,
    customer.whatsAppNumber,
    customer.email,
    customer.phone,
  ].some(hasText);
}

/**
 * Checks whether a booking includes a fun dive activity.
 *
 * @param booking - Booking detail payload being reviewed.
 * @returns True when any review activity is a fun dive.
 */
function bookingIncludesFunDive(booking: BookingDetailsItem) {
  return getRequirementActivities(booking).some(
    (activity) => activity.activityType === ActivityType.FUN_DIVE,
  );
}

/**
 * Checks whether every active diver has the required fun-dive experience fields.
 *
 * @param booking - Booking detail payload with customer join rows.
 * @returns True when certification level, last dive date, and logged dives are present for every active customer.
 */
function hasCompleteDivingExperience(booking: BookingDetailsItem) {
  return getActiveBookingParticipants(booking.customers).every(
    (bookingCustomer) =>
      hasText(bookingCustomer.certificationLevel) &&
      bookingCustomer.lastDiveAt !== null &&
      bookingCustomer.divesLogged !== null,
  );
}

/**
 * Checks whether equipment sizing is complete for active customers who clearly need equipment.
 *
 * @param booking - Booking detail payload with customer equipment fields.
 * @returns True when height, weight, and shoe size are present for every equipment-requesting customer.
 */
function hasCompleteEquipmentSizing(booking: BookingDetailsItem) {
  return getActiveBookingParticipants(booking.customers)
    .filter((bookingCustomer) =>
      isEquipmentNeeded(bookingCustomer.equipmentNeeded),
    )
    .every(
      (bookingCustomer) =>
        bookingCustomer.heightCm !== null &&
        bookingCustomer.weightKg !== null &&
        bookingCustomer.shoeSize !== null,
    );
}

/**
 * Builds the read-only checklist used by admins to judge whether a booking is ready for review decisions.
 *
 * @param booking - Booking detail payload already loaded for the admin review page.
 * @returns Review readiness items with stable labels, status values, and short descriptions.
 */
export function getBookingReviewReadiness(
  booking: BookingDetailsItem,
): ReviewReadinessItem[] {
  const activities = getRequirementActivities(booking);
  const hasActivity = activities.some((activity) => activity.activityType);
  const hasRequestedDates =
    activities.length > 0 &&
    activities.every((activity) => activity.requestedDate !== null);
  const primaryContact = getPrimaryContact(booking);
  const activeCustomers = getActiveBookingParticipants(booking.customers);
  const includesFunDive = bookingIncludesFunDive(booking);
  const depositReadiness = getDepositReadiness(booking.deposits);
  const hasEquipmentNeeded = activeCustomers.some((bookingCustomer) =>
    isEquipmentNeeded(bookingCustomer.equipmentNeeded),
  );

  const readinessItems: ReviewReadinessItem[] = [
    {
      label: 'Activity selected',
      status: hasActivity ? 'complete' : 'missing',
      description: hasActivity
        ? 'At least one activity is selected.'
        : 'Select an activity before approval.',
    },
    {
      label: 'Requested date set',
      status: hasRequestedDates ? 'complete' : 'missing',
      description: hasRequestedDates
        ? 'All activities have requested dates.'
        : 'Every activity needs a requested date before approval.',
    },
    {
      label: 'Primary customer set',
      status: primaryContact ? 'complete' : 'missing',
      description: primaryContact
        ? 'Exactly one primary contact is selected.'
        : 'Select exactly one primary contact.',
    },
    {
      label: 'Contact method present',
      status:
        primaryContact && hasContactMethod(primaryContact.customer)
          ? 'complete'
          : 'missing',
      description:
        primaryContact && hasContactMethod(primaryContact.customer)
          ? 'Primary contact has at least one contact method.'
          : 'Primary contact needs WeChat, WhatsApp, email, or phone.',
    },
    {
      ...depositReadiness,
    },
    {
      label: 'Equipment sizing',
      status: hasEquipmentNeeded
        ? hasCompleteEquipmentSizing(booking)
          ? 'complete'
          : 'missing'
        : 'not required',
      description: hasEquipmentNeeded
        ? 'Equipment requests should include height, weight, and shoe size.'
        : 'No rental equipment sizing is required.',
    },
  ];

  if (includesFunDive) {
    readinessItems.splice(4, 0, {
      label: 'Diving experience',
      status: hasCompleteDivingExperience(booking) ? 'complete' : 'missing',
      description:
        'Fun dives need certification, last dive date, and logged dives.',
    });
  }

  return readinessItems;
}

/**
 * Validates the booking details and returns a list of warnings for any missing or invalid information.
 *
 * @param booking - The booking details to validate.
 * @returns An array of warning messages for any missing or invalid information.
 */
export function getMissingBookingReviewInformation(
  booking: BookingDetailsItem,
) {
  const warnings: string[] = [];
  const activities = booking.activities;

  if (activities.length === 0) {
    warnings.push('Add at least one activity.');
  }
  const activeCustomers = getActiveBookingParticipants(booking.customers);

  activities.forEach((activity, index) => {
    const activityLabel = `Activity ${index + 1}`;

    if (activity.activityType === null) {
      warnings.push(`${activityLabel}: activity type is required.`);
    }

    if (activity.requestedDate === null) {
      warnings.push(`${activityLabel}: requested date is required.`);
    }

    if (
      activity.activityType === ActivityType.SPECIALTY_COURSE &&
      !hasText(activity.specialtyCourse)
    ) {
      warnings.push(`${activityLabel}: specialty course is required.`);
    }
  });

  if (booking.source === null) {
    warnings.push('Booking source is required.');
  }

  if (activeCustomers.length === 0) {
    warnings.push('Add at least one active customer or diver.');
  }

  activeCustomers.forEach((bookingCustomer, index) => {
    const customerLabel = `Customer/diver ${index + 1}`;

    if (!hasCustomerName(bookingCustomer.customer)) {
      warnings.push(`${customerLabel}: name is required.`);
    }
  });

  const primaryContacts = activeCustomers.filter(
    (bookingCustomer) =>
      bookingCustomer.role === BookingCustomerRole.PRIMARY_CONTACT,
  );

  if (primaryContacts.length !== 1) {
    warnings.push('Select exactly one primary contact.');
  } else {
    const primaryContact = primaryContacts[0].customer;
    const hasContactMethod = [
      primaryContact.weChatId,
      primaryContact.whatsAppNumber,
      primaryContact.email,
      primaryContact.phone,
    ].some(hasText);

    if (!hasContactMethod) {
      warnings.push('Primary contact needs at least one contact method.');
    }
  }

  const includesFunDive = activities.some(
    (activity) => activity.activityType === ActivityType.FUN_DIVE,
  );

  if (includesFunDive) {
    activeCustomers.forEach((bookingCustomer, index) => {
      const customerLabel = `Customer/diver ${index + 1}`;

      if (!hasText(bookingCustomer.certificationLevel)) {
        warnings.push(`${customerLabel}: certification level is required.`);
      }

      if (bookingCustomer.lastDiveAt === null) {
        warnings.push(`${customerLabel}: last dive date is required.`);
      }

      if (bookingCustomer.divesLogged === null) {
        warnings.push(`${customerLabel}: logged dives are required.`);
      }
    });
  }

  booking.deposits.forEach((deposit, index) => {
    if (
      deposit.status !== DepositStatus.PAID &&
      deposit.status !== DepositStatus.PARTIALLY_PAID
    ) {
      return;
    }

    const depositLabel = `Deposit ${index + 1}`;

    if (deposit.amount === null || deposit.amount.lte(0)) {
      warnings.push(`${depositLabel}: a positive amount is required.`);
    }

    if (!hasText(deposit.currency)) {
      warnings.push(`${depositLabel}: currency is required.`);
    }

    if (!hasText(deposit.paidTo)) {
      warnings.push(`${depositLabel}: paid to is required.`);
    }
  });

  return warnings;
}
