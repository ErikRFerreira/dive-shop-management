/**
 * Booking intake validation for draft saving and approval submission.
 *
 * @module features/bookings/validation
 */

import { z } from 'zod';

import {
  ActivityType,
  BookingSource,
  Currency,
  DepositStatus,
  PreferredLanguage,
} from '@/generated/prisma/enums';
import type {
  BookingFormValues,
  NormalizedBookingFormValues,
} from './types';

/** The supported validation intents for a booking intake form. */
export type BookingIntakeIntent = 'draft' | 'submit';

/** Field-level validation messages, keyed by booking form field name. */
export type BookingIntakeFieldErrors = Partial<
  Record<keyof BookingFormValues, string[]>
>;

/**
 * The normalized validation outcome returned to the booking form and actions.
 *
 * @remarks `formErrors` contains errors not associated with one field.
 */
export type BookingIntakeValidationResult =
  | { success: true; fieldErrors: BookingIntakeFieldErrors; formErrors: string[] }
  | {
      success: false;
      fieldErrors: BookingIntakeFieldErrors;
      formErrors: string[];
    };

const normalizedBookingIntakeSchema = z.object({
  rawBookingText: z.string().nullable(),
  activityType: z.enum(ActivityType).nullable(),
  specialtyCourse: z.string().nullable(),
  requestedDate: z.date().nullable(),
  requestedTime: z.string().nullable(),
  numberOfPeople: z.number().int().nullable(),
  source: z.enum(BookingSource).nullable(),
  referrerName: z.string().nullable(),
  internalNotes: z.string().nullable(),
  customerName: z.string().nullable(),
  chineseName: z.string().nullable(),
  weChatId: z.string().nullable(),
  whatsAppNumber: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  hotel: z.string().nullable(),
  preferredLanguage: z.enum(PreferredLanguage).nullable(),
  heightCm: z.number().int().nullable(),
  weightKg: z.number().nullable(),
  shoeSize: z.number().nullable(),
  depositStatus: z.enum(DepositStatus),
  amount: z.number().nullable(),
  currency: z.enum(Currency).nullable(),
  paidTo: z.string().nullable(),
  paymentMethod: z.string().nullable(),
  paymentNotes: z.string().nullable(),
  certificationLevel: z.string().nullable(),
  certificationAgency: z.string().nullable(),
  lastDiveDate: z.date().nullable(),
  divesLogged: z.number().int().nonnegative().nullable(),
});

const meaningfulDraftFields = [
  'rawBookingText',
  'activityType',
  'customerName',
  'chineseName',
  'weChatId',
  'whatsAppNumber',
  'email',
  'phone',
] as const;

/**
 * Validates the minimum information needed to retain a non-empty draft.
 *
 * @remarks Drafts deliberately allow incomplete booking and deposit details.
 */
export const draftBookingIntakeSchema = normalizedBookingIntakeSchema.superRefine(
  (values, context) => {
    if (meaningfulDraftFields.some((field) => values[field] !== null)) {
      return;
    }

    context.addIssue({
      code: 'custom',
      message: 'Enter at least one booking or customer detail before saving a draft.',
    });
  },
);

/**
 * Validates booking intake fields required before administrative review.
 *
 * @remarks FUN_DIVE and paid-deposit requirements are conditional on their
 * corresponding activity and deposit status.
 */
export const submitBookingIntakeSchema = normalizedBookingIntakeSchema.superRefine(
  (values, context) => {
    if (values.activityType === null) {
      context.addIssue({
        code: 'custom',
        path: ['activityType'],
        message: 'Activity type is required before submitting for approval.',
      });
    }

    if (values.requestedDate === null) {
      context.addIssue({
        code: 'custom',
        path: ['requestedDate'],
        message: 'Requested date is required before submitting for approval.',
      });
    }

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

    if (values.customerName === null) {
      context.addIssue({
        code: 'custom',
        path: ['customerName'],
        message: 'Customer name is required before submitting for approval.',
      });
    }

    if (
      values.weChatId === null &&
      values.whatsAppNumber === null &&
      values.email === null &&
      values.phone === null
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'Provide at least one contact method: WeChat ID, WhatsApp number, email, or phone.',
      });
    }

    if (
      values.activityType === ActivityType.SPECIALTY_COURSE &&
      values.specialtyCourse === null
    ) {
      context.addIssue({
        code: 'custom',
        path: ['specialtyCourse'],
        message:
          'Specialty course is required when submitting a Specialty Course booking.',
      });
    }

    if (values.activityType === ActivityType.FUN_DIVE) {
      const funDiveRequirements: Array<{
        field: 'certificationLevel' | 'lastDiveDate' | 'divesLogged';
        label: string;
      }> = [
        { field: 'certificationLevel', label: 'Certification level' },
        { field: 'lastDiveDate', label: 'Last dive date' },
        { field: 'divesLogged', label: 'Dives logged' },
      ];

      for (const { field, label } of funDiveRequirements) {
        if (values[field] !== null) {
          continue;
        }

        context.addIssue({
          code: 'custom',
          path: [field],
          message: `${label} is required when submitting a Fun Dive booking.`,
        });
      }
    }

    if (
      values.depositStatus === DepositStatus.PAID ||
      values.depositStatus === DepositStatus.PARTIALLY_PAID
    ) {
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
  },
);

/**
 * Converts Zod issues into the form's field- and form-level error contract.
 *
 * @param error - The failed Zod validation result.
 * @returns Structured validation errors suitable for form rendering.
 */
function formatValidationErrors(error: z.ZodError): BookingIntakeValidationResult {
  const fieldErrors: BookingIntakeFieldErrors = {};
  const formErrors: string[] = [];

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (typeof field !== 'string') {
      formErrors.push(issue.message);
      continue;
    }

    const fieldName = field as keyof BookingFormValues;
    fieldErrors[fieldName] = [...(fieldErrors[fieldName] ?? []), issue.message];
  }

  return { success: false, fieldErrors, formErrors };
}

/**
 * Validates normalized intake values for the requested booking workflow intent.
 *
 * @param values - Intake values after browser strings have been normalized.
 * @param intent - Whether the user is saving a draft or submitting for review.
 * @returns Structured field and form errors suitable for client display.
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
