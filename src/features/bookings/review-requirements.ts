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
    warnings.push('Number of people must be at least 1.');
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
