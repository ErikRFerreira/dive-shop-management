import type { BookingReadinessItem } from '@/components/bookings/form/booking-readiness-card';
import { hasUsefulSpecialtyCourseName } from '@/features/bookings/activity-utils';
import type { BookingFormValues } from '@/features/bookings/types';
import {
  ActivityType,
  BookingCustomerRole,
  DepositStatus,
} from '@/generated/prisma/enums';

/**
 * Checks whether a browser form value contains visible text.
 *
 * @param value - Optional string value from React Hook Form state.
 * @returns True when the value has non-whitespace content.
 */
function hasText(value: string | undefined) {
  return Boolean(value?.trim());
}

/**
 * Checks whether a browser numeric form value is a valid positive number.
 *
 * @param value - Browser string value to validate.
 * @returns True when the value represents a positive number.
 */
function hasPositiveNumber(value: string | undefined) {
  return Number(value) >= 1;
}

/**
 * Checks whether a customer/diver row can represent a booking participant.
 *
 * @param customer - Browser customer/diver form row.
 * @returns True when the row links an existing customer or includes identity/contact data.
 */
function hasParticipantIdentity(
  customer: BookingFormValues['customers'][number] | undefined,
) {
  return Boolean(
    customer?.customerId ||
      hasText(customer?.customerName) ||
      hasText(customer?.chineseName) ||
      hasText(customer?.weChatId) ||
      hasText(customer?.whatsAppNumber) ||
      hasText(customer?.email) ||
      hasText(customer?.phone),
  );
}

/**
 * Builds the create-form submission readiness checklist from current form state.
 *
 * @param values - Current watched booking form values that affect submission readiness.
 * @returns Checklist items shown in the sticky booking readiness card.
 */
export function buildCreateReadinessItems(values: {
  activities: BookingFormValues['activities'];
  amount: string | undefined;
  currency: BookingFormValues['currency'] | undefined;
  customers: BookingFormValues['customers'];
  depositStatus: DepositStatus | undefined;
  paidTo: string | undefined;
  source: BookingFormValues['source'] | undefined;
}): BookingReadinessItem[] {
  const primaryCustomer =
    values.customers.find(
      (customer) => customer.role === BookingCustomerRole.PRIMARY_CONTACT,
    ) ?? values.customers[0];
  const hasPaidDeposit =
    values.depositStatus === DepositStatus.PAID ||
    values.depositStatus === DepositStatus.PARTIALLY_PAID;
  const includesFunDive = values.activities.some(
    (activity) => activity.activityType === ActivityType.FUN_DIVE,
  );
  const includesSpecialtyCourse = values.activities.some(
    (activity) => activity.activityType === ActivityType.SPECIALTY_COURSE,
  );

  const readinessItems: BookingReadinessItem[] = [
    {
      label: 'Source / referrer',
      complete: Boolean(values.source),
    },
    {
      label: 'At least one customer/diver',
      complete: values.customers.some(hasParticipantIdentity),
    },
    {
      label: 'At least one activity',
      complete: values.activities.some((activity) =>
        Boolean(activity.activityType),
      ),
    },
    {
      label: 'Requested date',
      complete:
        values.activities.length > 0 &&
        values.activities.every((activity) => hasText(activity.requestedDate)),
    },
    {
      label: 'Primary customer name',
      complete: hasText(primaryCustomer?.customerName),
    },
    {
      label: 'At least one contact method',
      complete: [
        primaryCustomer?.weChatId,
        primaryCustomer?.whatsAppNumber,
        primaryCustomer?.email,
        primaryCustomer?.phone,
      ].some(hasText),
      helperText: 'WeChat, WhatsApp, email, or phone',
    },
    {
      label: 'Deposit amount, currency & paid to',
      complete:
        !hasPaidDeposit ||
        (Number(values.amount) > 0 &&
          Boolean(values.currency) &&
          hasText(values.paidTo)),
      helperText: hasPaidDeposit ? undefined : 'No deposit recorded',
    },
  ];

  if (includesSpecialtyCourse) {
    readinessItems.push({
      label: 'Specialty name',
      complete: values.activities
        .filter(
          (activity) => activity.activityType === ActivityType.SPECIALTY_COURSE,
        )
        .every((activity) =>
          hasUsefulSpecialtyCourseName(activity.specialtyCourse),
        ),
      helperText: 'Example: Nitrox, Deep, Wreck, Sidemount',
    });
  }

  if (includesFunDive) {
    readinessItems.push({
      label: 'Diving experience details',
      complete: values.customers.every(
        (customer) =>
          hasText(customer.certificationLevel) &&
          hasPositiveNumber(customer.divesLogged),
      ),
      helperText: 'Recommended for course activities',
    });
  }

  return readinessItems;
}
