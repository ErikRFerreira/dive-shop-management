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
  BookingSource,
  Currency,
  DepositStatus,
  PreferredLanguage,
} from '@/generated/prisma/enums';
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

/** Validates the booking selected for a resubmission action. */
export const resubmitBookingForApprovalSchema = z.object({
  bookingId: z.string().trim().min(1, 'Booking ID is required.'),
});

/** Validates the booking selected for an edit action. */
export const updateBookingSchema = z.object({
  bookingId: z.string().trim().min(1, 'Booking ID is required.'),
});

const activitySchema = z.object({
  activityType: z.enum(ActivityType).nullable(),
  specialtyCourse: z.string().nullable(),
  requestedDate: z.date().nullable(),
  requestedTime: z.string().nullable(),
  notes: z.string().nullable(),
});

const customerSchema = z.object({
  role: z.enum(BookingCustomerRole),
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

function hasMeaningfulActivity(values: NormalizedBookingFormValues) {
  return values.activities.some((activity) =>
    Object.values(activity).some((value) => value !== null),
  );
}

function hasMeaningfulCustomer(values: NormalizedBookingFormValues) {
  return values.customers.some((customer) =>
    Object.entries(customer).some(
      ([field, value]) =>
        field !== 'role' && field !== 'customerId' && value !== null,
    ),
  );
}

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
      values.numberOfPeople !== null ||
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

    if (values.numberOfPeople === null || values.numberOfPeople < 1) {
      context.addIssue({
        code: 'custom',
        path: ['numberOfPeople'],
        message: 'Number of people must be at least 1 before submitting.',
      });
    }

    if (values.source === null) {
      context.addIssue({
        code: 'custom',
        path: ['source'],
        message: 'Source is required before submitting for approval.',
      });
    }

    if (values.customers.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['customers'],
        message: 'Add at least one customer or diver before submitting.',
      });
    }

    values.customers.forEach((customer, index) => {
      if (customer.customerName === null) {
        context.addIssue({
          code: 'custom',
          path: ['customers', index, 'customerName'],
          message: 'Customer name is required before submitting for approval.',
        });
      }
    });

    const primaryContacts = values.customers.filter(
      (customer) => customer.role === BookingCustomerRole.PRIMARY_CONTACT,
    );

    if (primaryContacts.length !== 1) {
      context.addIssue({
        code: 'custom',
        path: ['customers'],
        message: 'Select exactly one primary contact before submitting.',
      });
    } else {
      const primaryContact = primaryContacts[0];
      if (
        primaryContact.weChatId === null &&
        primaryContact.whatsAppNumber === null &&
        primaryContact.email === null &&
        primaryContact.phone === null
      ) {
        context.addIssue({
          code: 'custom',
          path: ['customers'],
          message:
            'Provide at least one contact method for the primary contact: WeChat ID, WhatsApp number, email, or phone.',
        });
      }
    }

    if (
      values.activities.some(
        (activity) => activity.activityType === ActivityType.FUN_DIVE,
      )
    ) {
      values.customers.forEach((customer, index) => {
        const requirements: Array<{
          field: 'certificationLevel' | 'lastDiveDate' | 'divesLogged';
          label: string;
        }> = [
          { field: 'certificationLevel', label: 'Certification level' },
          { field: 'divesLogged', label: 'Dives logged' },
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
