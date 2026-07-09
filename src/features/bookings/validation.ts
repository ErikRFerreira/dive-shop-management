/**
 * Purpose: This module provides validation logic for the booking intake form. It defines schemas for both draft and submission intents, ensuring that the form data adheres to the required structure and business rules before processing.
 *
 * The validation logic uses the `zod` library to define schemas for activities, customers, and the overall booking intake form. It includes custom validation rules to enforce business requirements, such as ensuring at least one activity or customer is provided, and that required fields are filled based on the booking's context (e.g., deposit status, activity type).
 *
 * @module features/bookings/validation
 */

import { z } from 'zod';

import {
  ActivityType,
  BookingCustomerRole,
  BookingParticipantStatus,
  BookingSource,
  Currency,
  DepositStatus,
  PreferredLanguage,
} from '@/generated/prisma/enums';
import { hasPersistableBookingCustomer } from './form-mappers';
import { primaryContactMethodError } from './validation-messages';
import type { NormalizedBookingFormValues } from './types';

export type BookingIntakeIntent = 'draft' | 'submit';

/** Errors keyed by React Hook Form paths, such as `activities.0.activityType`. */
export type BookingIntakeFieldErrors = Record<string, string[]>;

export type BookingIntakeValidationResult =
  | {
      success: true;
      fieldErrors: BookingIntakeFieldErrors;
      formErrors: string[];
    }
  | {
      success: false;
      fieldErrors: BookingIntakeFieldErrors;
      formErrors: string[];
    };

/** Validates the information an admin must provide when requesting follow-up. */
export const markBookingNeedsMoreInfoSchema = z.object({
  bookingId: z.string().trim().min(1, 'Booking ID is required.'),
  needsMoreInfoReason: z
    .string()
    .trim()
    .min(1, 'A reason is required when requesting more information.'),
});

/** Validates the booking selected for a cancellation action. */
export const cancelBookingSchema = z.object({
  bookingId: z.string().trim().min(1, 'Booking ID is required.'),
  adminNotes: z.preprocess(
    (value) => (typeof value === 'string' ? value : ''),
    z
      .string()
      .trim()
      .transform((value) => value || null),
  ),
});

/** Validates the booking selected for the admin approval and scheduling step. */
export const approveBookingSchema = z.object({
  bookingId: z.string().trim().min(1, 'Booking ID is required.'),
  adminNotes: z.preprocess(
    (value) => (typeof value === 'string' ? value : ''),
    z
      .string()
      .trim()
      .transform((value) => value || null),
  ),
});

/** Validates the booking selected for a resubmission action. */
export const resubmitBookingForApprovalSchema = z.object({
  bookingId: z.string().trim().min(1, 'Booking ID is required.'),
});

/** Validates the booking selected for an edit action. */
export const updateBookingSchema = z.object({
  bookingId: z.string().trim().min(1, 'Booking ID is required.'),
});

/** Validates an admin participant status update for a scheduled booking. */
export const updateBookingParticipantStatusSchema = z.object({
  bookingId: z.string().trim().min(1, 'Booking ID is required.'),
  customerId: z.string().trim().min(1, 'Customer ID is required.'),
  participationStatus: z.enum(BookingParticipantStatus),
});

const nullableTextSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() || null : null),
  z.string().nullable(),
);

const optionalCustomerIdSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return undefined;
  return value.trim() || undefined;
}, z.string().min(1).optional());

const nullablePreferredLanguageSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() ? value : null),
  z.enum(PreferredLanguage).nullable(),
);

const nullableDateSchema = z.preprocess((value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}, z.date().nullable());

const nullableIntegerSchema = z.preprocess((value) => {
  if (typeof value !== 'string' || !value.trim()) return null;

  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}, z.number().int().nullable());

const nullableNumberSchema = z.preprocess((value) => {
  if (typeof value !== 'string' || !value.trim()) return null;

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}, z.number().nullable());

/** Validates the participant payload appended to an already scheduled booking. */
export const addScheduledBookingParticipantSchema = z
  .object({
    bookingId: z.string().trim().min(1, 'Booking ID is required.'),
    customerId: optionalCustomerIdSchema,
    customerName: nullableTextSchema,
    chineseName: nullableTextSchema,
    weChatId: nullableTextSchema,
    whatsAppNumber: nullableTextSchema,
    email: nullableTextSchema,
    phone: nullableTextSchema,
    hotelAtBooking: nullableTextSchema,
    equipmentNeeded: nullableTextSchema,
    customerNotes: nullableTextSchema,
    preferredLanguage: nullablePreferredLanguageSchema,
    heightCm: nullableIntegerSchema,
    weightKg: nullableNumberSchema,
    shoeSize: nullableNumberSchema,
    certificationLevel: nullableTextSchema,
    certificationAgency: nullableTextSchema,
    lastDiveDate: nullableDateSchema,
    divesLogged: nullableIntegerSchema,
  })
  .superRefine((values, context) => {
    const identifiesCustomer = Boolean(
      values.customerId ||
        values.customerName ||
        values.chineseName ||
        values.weChatId ||
        values.whatsAppNumber ||
        values.email ||
        values.phone,
    );

    if (!identifiesCustomer) {
      context.addIssue({
        code: 'custom',
        path: ['customerName'],
        message:
          'Select an existing customer or enter enough details for a new customer.',
      });
    }
  });

const activitySchema = z.object({
  activityType: z.enum(ActivityType).nullable(),
  specialtyCourse: z.string().nullable(),
  durationDays: z.number().int().positive(),
  requestedDate: z.date().nullable(),
  requestedTime: z.string().nullable(),
  notes: z.string().nullable(),
});

const customerSchema = z.object({
  customerId: z.string().trim().min(1).optional(),
  role: z.enum(BookingCustomerRole),
  participationStatus: z.enum(BookingParticipantStatus),
  customerName: z.string().nullable(),
  chineseName: z.string().nullable(),
  weChatId: z.string().nullable(),
  whatsAppNumber: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  hotelAtBooking: z.string().nullable(),
  equipmentNeeded: z.string().nullable(),
  customerNotes: z.string().nullable(),
  preferredLanguage: z.enum(PreferredLanguage).nullable(),
  heightCm: z.number().int().nullable(),
  weightKg: z.number().nullable(),
  shoeSize: z.number().nullable(),
  certificationLevel: z.string().nullable(),
  certificationAgency: z.string().nullable(),
  lastDiveDate: z.date().nullable(),
  divesLogged: z.number().int().nonnegative().nullable(),
});

const normalizedBookingIntakeSchema = z.object({
  rawBookingText: z.string().nullable(),
  activities: z.array(activitySchema),
  numberOfPeople: z.number().int().nullable(),
  source: z.enum(BookingSource).nullable(),
  referrerName: z.string().nullable(),
  internalNotes: z.string().nullable(),
  customers: z.array(customerSchema),
  depositStatus: z.enum(DepositStatus),
  amount: z.number().nullable(),
  currency: z.enum(Currency).nullable(),
  paidTo: z.string().nullable(),
  paymentMethod: z.string().nullable(),
  paymentNotes: z.string().nullable(),
});

/**
 * Checks if the booking intake form has at least one meaningful activity, customer, or deposit information.
 *
 * @param values - The normalized booking form values to check for meaningful data.
 * @returns  True if there is at least one meaningful activity, customer, or deposit information; otherwise, false.
 */
function hasMeaningfulActivity(values: NormalizedBookingFormValues) {
  return values.activities.some((activity) =>
    [
      activity.activityType,
      activity.specialtyCourse,
      activity.requestedDate,
      activity.requestedTime,
      activity.notes,
    ].some((value) => value !== null),
  );
}

/**
 * Checks if the booking intake form has at least one meaningful customer with
 * non-null values for fields other than `role`.
 *
 * @param values - The normalized booking form values to check for meaningful customer data.
 * @returns - True if there is at least one meaningful customer; otherwise, false.
 */
function hasMeaningfulCustomer(values: NormalizedBookingFormValues) {
  return values.customers.some(hasPersistableBookingCustomer);
}

/**
 * Returns active booking customer rows that identify a real customer record.
 *
 * @param values - The normalized booking form values to inspect.
 * @returns Active customer entries with their original form indexes.
 */
function getActivePersistableCustomerEntries(
  values: NormalizedBookingFormValues,
) {
  return values.customers
    .map((customer, index) => ({ customer, index }))
    .filter(
      ({ customer }) =>
        customer.participationStatus === BookingParticipantStatus.ACTIVE &&
        hasPersistableBookingCustomer(customer),
    );
}

/**
 * Checks if the booking intake form has any meaningful deposit information, including deposit status, amount, currency, paidTo, paymentMethod, or paymentNotes.
 *
 * @param values - The normalized booking form values to check for meaningful deposit information.
 * @returns True if there is any meaningful deposit information; otherwise, false.
 */
function hasMeaningfulDeposit(values: NormalizedBookingFormValues) {
  return (
    values.depositStatus !== DepositStatus.UNKNOWN ||
    values.amount !== null ||
    values.currency !== null ||
    values.paidTo !== null ||
    values.paymentMethod !== null ||
    values.paymentNotes !== null
  );
}

/**
 * Validates the deposit information in the booking intake form based on the deposit status.
 * If the deposit status is 'PAID' or 'PARTIALLY_PAID', it checks for required fields such as amount, currency, and paidTo,
 * and adds issues to the validation context if any of these fields are missing or invalid.
 *
 * @param values - The normalized booking form values to validate for deposit information.
 * @param context - The Zod refinement context used to add validation issues for missing or invalid deposit information.
 * @returns void
 */
function validatePaidDeposit(
  values: NormalizedBookingFormValues,
  context: z.RefinementCtx,
) {
  if (
    values.depositStatus !== DepositStatus.PAID &&
    values.depositStatus !== DepositStatus.PARTIALLY_PAID
  ) {
    return;
  }

  if (values.amount === null) {
    context.addIssue({
      code: 'custom',
      path: ['amount'],
      message: 'Deposit amount is required when a deposit is paid.',
    });
  } else if (values.amount <= 0) {
    context.addIssue({
      code: 'custom',
      path: ['amount'],
      message: 'Deposit amount must be a positive number.',
    });
  }

  if (values.currency === null) {
    context.addIssue({
      code: 'custom',
      path: ['currency'],
      message: 'Deposit currency is required when a deposit is paid.',
    });
  }

  if (values.paidTo === null) {
    context.addIssue({
      code: 'custom',
      path: ['paidTo'],
      message: 'Paid to is required when a deposit is paid.',
    });
  }
}

export const draftBookingIntakeSchema =
  normalizedBookingIntakeSchema.superRefine((values, context) => {
    const hasMeaningfulValue =
      values.rawBookingText !== null ||
      values.source !== null ||
      values.referrerName !== null ||
      values.internalNotes !== null ||
      hasMeaningfulActivity(values) ||
      hasMeaningfulCustomer(values) ||
      hasMeaningfulDeposit(values);

    if (!hasMeaningfulValue) {
      context.addIssue({
        code: 'custom',
        message:
          'Enter at least one booking, activity, or customer detail before saving a draft.',
      });
    }

    validatePaidDeposit(values, context);
  });

export const submitBookingIntakeSchema =
  normalizedBookingIntakeSchema.superRefine((values, context) => {
    validatePaidDeposit(values, context);
    const activeCustomerEntries = getActivePersistableCustomerEntries(values);

    if (values.activities.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['activities'],
        message: 'Add at least one activity before submitting for approval.',
      });
    }

    values.activities.forEach((activity, index) => {
      if (activity.activityType === null) {
        context.addIssue({
          code: 'custom',
          path: ['activities', index, 'activityType'],
          message: 'Activity type is required before submitting for approval.',
        });
      }

      if (activity.requestedDate === null) {
        context.addIssue({
          code: 'custom',
          path: ['activities', index, 'requestedDate'],
          message: 'Requested date is required before submitting for approval.',
        });
      }

      if (
        activity.activityType === ActivityType.SPECIALTY_COURSE &&
        activity.specialtyCourse === null
      ) {
        context.addIssue({
          code: 'custom',
          path: ['activities', index, 'specialtyCourse'],
          message: 'Specialty course is required for this activity.',
        });
      }
    });

    if (values.source === null) {
      context.addIssue({
        code: 'custom',
        path: ['source'],
        message: 'Source / referrer is required before submitting for approval.',
      });
    }

    if (activeCustomerEntries.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['customers'],
        message: 'Add at least one active customer or diver before submitting.',
      });
    }

    activeCustomerEntries.forEach(({ customer, index }) => {
      if (customer.customerName === null) {
        context.addIssue({
          code: 'custom',
          path: ['customers', index, 'customerName'],
          message: 'Customer name is required before submitting for approval.',
        });
      }
    });

    const primaryContacts = activeCustomerEntries.filter(
      ({ customer }) => customer.role === BookingCustomerRole.PRIMARY_CONTACT,
    );

    if (primaryContacts.length !== 1) {
      context.addIssue({
        code: 'custom',
        path: ['customers'],
        message: 'Select exactly one primary contact before submitting.',
      });
    } else {
      const primaryContact = primaryContacts[0].customer;
      if (
        primaryContact.weChatId === null &&
        primaryContact.whatsAppNumber === null &&
        primaryContact.email === null &&
        primaryContact.phone === null
      ) {
        context.addIssue({
          code: 'custom',
          path: ['customers'],
          message: primaryContactMethodError,
        });
      }
    }

    if (
      values.activities.some(
        (activity) => activity.activityType === ActivityType.FUN_DIVE,
      )
    ) {
      activeCustomerEntries.forEach(({ customer, index }) => {
        const requirements: Array<{
          field: 'certificationLevel' | 'lastDiveDate' | 'divesLogged';
          label: string;
        }> = [
          { field: 'certificationLevel', label: 'Certification level' },
          { field: 'divesLogged', label: 'Logged dives' },
        ];

        requirements.forEach(({ field, label }) => {
          if (customer[field] !== null) return;

          context.addIssue({
            code: 'custom',
            path: ['customers', index, field],
            message: `${label} is required when the booking includes a Fun Dive.`,
          });
        });
      });
    }
  });

/**
 * Formats Zod validation errors into a structured result containing field-specific errors and general form errors.
 *
 * @param error - The ZodError object containing validation issues.
 * @returns A BookingIntakeValidationResult object with success status, field errors, and form errors.
 */
function formatValidationErrors(
  error: z.ZodError,
): BookingIntakeValidationResult {
  const fieldErrors: BookingIntakeFieldErrors = {};
  const formErrors: string[] = [];

  for (const issue of error.issues) {
    if (issue.path.length === 0) {
      formErrors.push(issue.message);
      continue;
    }

    const field = issue.path.join('.');
    fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
  }

  return { success: false, fieldErrors, formErrors };
}

/**
 * Validates the booking intake form values based on the specified intent ('draft' or 'submit').
 *
 * @param values - The normalized booking form values to validate.
 * @param intent - The intent of the validation, either 'draft' for saving a draft or 'submit' for submitting for approval.
 * @returns A BookingIntakeValidationResult object indicating whether the validation was successful, along with any field-specific or general form errors.
 */
export function validateBookingIntake(
  values: NormalizedBookingFormValues,
  intent: BookingIntakeIntent,
): BookingIntakeValidationResult {
  const result =
    intent === 'draft'
      ? draftBookingIntakeSchema.safeParse(values)
      : submitBookingIntakeSchema.safeParse(values);

  return result.success
    ? { success: true, fieldErrors: {}, formErrors: [] }
    : formatValidationErrors(result.error);
}
