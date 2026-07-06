import type { BookingReadinessItem } from '@/components/bookings/form/booking-readiness-card';
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
 * Checks whether the participant count is a valid positive number.
 *
 * @param value - Browser string value for total participants.
 * @returns True when the value represents at least one participant.
 */
function hasValidParticipantCount(value: string | undefined) {
  return Number(value) >= 1;
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
  numberOfPeople: string | undefined;
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

  return [
    {
      label: 'Source / referrer',
      complete: Boolean(values.source),
    },
    {
      label: 'Total participants',
      complete: hasValidParticipantCount(values.numberOfPeople),
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
    {
      label: 'Diving experience details',
      complete:
        !includesFunDive ||
        values.customers.every(
          (customer) =>
            hasText(customer.certificationLevel) &&
            hasValidParticipantCount(customer.divesLogged),
        ),
      helperText: includesFunDive
        ? 'Recommended for course activities'
        : 'No fun dive activities',
    },
  ];
}
