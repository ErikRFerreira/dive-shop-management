/**
 * Purpose: This module provides a function to validate booking details,
 * and return a list of warnings for any missing or invalid information.
 * It checks for required fields in activities, customers, deposits, and other booking-related data.
 *
 * @module features/bookings/review-requirements
 */

import type { BookingDetailsItem } from '@/features/bookings/queries';
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
 * Checks whether a decimal-like value is present and greater than zero.
 *
 * @param value - Nullable Prisma decimal value from a booking deposit.
 * @returns True when the value supports comparison and is greater than zero.
 */
function hasPositiveDecimal(
  value: BookingDetailsItem['deposits'][number]['amount'],
) {
  return value !== null && value.gt(0);
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
 * Finds the booking customer marked as the primary contact.
 *
 * @param booking - Booking detail payload with customer join rows.
 * @returns Primary contact row when exactly one exists, otherwise null.
 */
function getPrimaryContact(booking: BookingDetailsItem) {
  const primaryContacts = booking.customers.filter(
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
 * Checks whether every diver has the required fun-dive experience fields.
 *
 * @param booking - Booking detail payload with customer join rows.
 * @returns True when certification level, last dive date, and logged dives are present for every customer.
 */
function hasCompleteDivingExperience(booking: BookingDetailsItem) {
  return booking.customers.every(
    (bookingCustomer) =>
      hasText(bookingCustomer.certificationLevel) &&
      bookingCustomer.lastDiveAt !== null &&
      bookingCustomer.divesLogged !== null,
  );
}

/**
 * Checks whether all paid deposit records include required payment details.
 *
 * @param booking - Booking detail payload with deposit rows.
 * @returns True when every paid or partially paid deposit has amount, currency, and paid-to details.
 */
function hasCompletePaidDepositInfo(booking: BookingDetailsItem) {
  return booking.deposits
    .filter(
      (deposit) =>
        deposit.status === DepositStatus.PAID ||
        deposit.status === DepositStatus.PARTIALLY_PAID,
    )
    .every(
      (deposit) =>
        hasPositiveDecimal(deposit.amount) &&
        hasText(deposit.currency) &&
        hasText(deposit.paidTo),
    );
}

/**
 * Classifies a free-text equipment field into a review readiness decision.
 *
 * @param value - Booking-specific equipment need text.
 * @returns Whether the field clearly requests equipment, clearly says it is not needed, or is unknown.
 */
function getEquipmentNeedDecision(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return 'unknown';
  }

  if (
    ['no', 'none', 'n/a', 'na', 'not needed'].includes(normalized) ||
    normalized.includes('no equipment') ||
    normalized.includes('own equipment') ||
    normalized.includes('bringing own')
  ) {
    return 'not-needed';
  }

  return 'needed';
}

/**
 * Checks whether equipment sizing is complete for customers who clearly need equipment.
 *
 * @param booking - Booking detail payload with customer equipment fields.
 * @returns True when height, weight, and shoe size are present for every equipment-requesting customer.
 */
function hasCompleteEquipmentSizing(booking: BookingDetailsItem) {
  return booking.customers
    .filter(
      (bookingCustomer) =>
        getEquipmentNeedDecision(bookingCustomer.equipmentNeeded) === 'needed',
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
  const includesFunDive = bookingIncludesFunDive(booking);
  const paidDeposits = booking.deposits.filter(
    (deposit) =>
      deposit.status === DepositStatus.PAID ||
      deposit.status === DepositStatus.PARTIALLY_PAID,
  );
  const equipmentDecisions = booking.customers.map((bookingCustomer) =>
    getEquipmentNeedDecision(bookingCustomer.equipmentNeeded),
  );
  const hasEquipmentNeeded = equipmentDecisions.includes('needed');
  const hasUnknownEquipment = equipmentDecisions.includes('unknown');

  return [
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
      label: 'Diving experience',
      status: includesFunDive
        ? hasCompleteDivingExperience(booking)
          ? 'complete'
          : 'missing'
        : 'not required',
      description: includesFunDive
        ? 'Fun dives need certification, last dive date, and logged dives.'
        : 'Not required for the selected activity type.',
    },
    {
      label: 'Deposit info',
      status:
        paidDeposits.length === 0
          ? 'not required'
          : hasCompletePaidDepositInfo(booking)
            ? 'complete'
            : 'missing',
      description:
        paidDeposits.length === 0
          ? 'No paid deposit details are required.'
          : 'Paid deposits need amount, currency, and paid-to details.',
    },
    {
      label: 'Equipment sizing',
      status: hasEquipmentNeeded
        ? hasCompleteEquipmentSizing(booking)
          ? 'complete'
          : 'missing'
        : hasUnknownEquipment
          ? 'recommended/optional'
          : 'not required',
      description: hasEquipmentNeeded
        ? 'Equipment requests should include height, weight, and shoe size.'
        : hasUnknownEquipment
          ? 'Confirm whether rental equipment is needed when possible.'
          : 'No rental equipment sizing is required.',
    },
  ];
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

  if (booking.numberOfPeople === null || booking.numberOfPeople < 1) {
    warnings.push('Total participants must be at least 1.');
  }

  if (booking.source === null) {
    warnings.push('Booking source is required.');
  }

  if (booking.customers.length === 0) {
    warnings.push('Add at least one customer or diver.');
  }

  booking.customers.forEach((bookingCustomer, index) => {
    const customerLabel = `Customer/diver ${index + 1}`;

    if (!hasCustomerName(bookingCustomer.customer)) {
      warnings.push(`${customerLabel}: name is required.`);
    }
  });

  const primaryContacts = booking.customers.filter(
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
    booking.customers.forEach((bookingCustomer, index) => {
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
