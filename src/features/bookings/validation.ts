import { z } from 'zod';

import { ActivityType } from '@/generated/prisma/enums';
import type { NormalizedBookingFormValues } from './types';

const bookingSubmissionSchema = z
  .object({
    activityType: z.enum(ActivityType).nullable(),
    specialtyCourse: z.string().nullable(),
    certificationLevel: z.string().nullable(),
    certificationAgency: z.string().nullable(),
    lastDiveDate: z.date().nullable(),
    divesLogged: z.number().int().nonnegative().nullable(),
  })
  .superRefine((values, context) => {
    if (
      values.activityType === ActivityType.SPECIALTY_COURSE &&
      !values.specialtyCourse
    ) {
      context.addIssue({
        code: 'custom',
        path: ['specialtyCourse'],
        message: 'Specialty course is required when submitting a Specialty Course booking.',
      });
    }

    if (values.activityType !== ActivityType.FUN_DIVE) {
      return;
    }

    const funDiverRequirements: Array<{
      field: keyof Pick<
        NormalizedBookingFormValues,
        | 'certificationLevel'
        | 'certificationAgency'
        | 'lastDiveDate'
        | 'divesLogged'
      >;
      label: string;
    }> = [
      { field: 'certificationLevel', label: 'Certification level' },
      { field: 'certificationAgency', label: 'Certification agency' },
      { field: 'lastDiveDate', label: 'Last dive date' },
      { field: 'divesLogged', label: 'Dives logged' },
    ];

    for (const { field, label } of funDiverRequirements) {
      if (values[field] === null) {
        context.addIssue({
          code: 'custom',
          path: [field],
          message: `${label} is required when submitting a Fun Dive booking.`,
        });
      }
    }
  });

/**
 * Validates the fields required before a booking can enter approval.
 * Drafts intentionally bypass this validation and can remain incomplete.
 */
export function validateBookingSubmission(
  values: NormalizedBookingFormValues,
): string | null {
  const result = bookingSubmissionSchema.safeParse(values);

  return result.success ? null : (result.error.issues[0]?.message ?? 'Invalid booking details.');
}
