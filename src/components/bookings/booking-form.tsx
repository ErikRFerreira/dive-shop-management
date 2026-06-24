'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  useForm,
  useWatch,
  type FieldPath,
} from 'react-hook-form';

import { BookingFormActions } from '@/components/bookings/booking-form-actions';
import { collectBookingFormErrorMessages } from '@/components/bookings/booking-form-controls';
import { BookingDetailsSection } from '@/components/bookings/booking-details-section';
import { CustomerDiverDetailsSection } from '@/components/bookings/customer-diver-details-section';
import { DepositPaymentSection } from '@/components/bookings/deposit-payment-section';
import { RawBookingSection } from '@/components/bookings/raw-booking-section';
import {
  createBookingDraft,
  submitBookingForApproval,
} from '@/features/bookings/actions';
import { bookingFormDefaultValues } from '@/features/bookings/form-values';
import { normalizeBookingFormValues } from '@/features/bookings/form-mappers';
import type { BookingFormValues } from '@/features/bookings/types';
import { useBookingFormAutosave } from '@/features/bookings/use-booking-form-autosave';
import {
  validateBookingIntake,
  type BookingIntakeFieldErrors,
} from '@/features/bookings/validation';
import { ActivityType, DepositStatus } from '@/generated/prisma/enums';

type SubmitIntent = 'draft' | 'submit';

export function BookingForm() {
  const router = useRouter();
  const [submitIntent, setSubmitIntent] = useState<SubmitIntent>('draft');
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const form = useForm<BookingFormValues>({
    defaultValues: bookingFormDefaultValues,
  });
  const { clearAutosave } = useBookingFormAutosave(form);
  const activities =
    useWatch({ control: form.control, name: 'activities' }) ?? [];
  const depositStatus = useWatch({
    control: form.control,
    name: 'depositStatus',
  });
  const isSubmitting = form.formState.isSubmitting;
  const includesFunDive = activities.some(
    (activity) => activity.activityType === ActivityType.FUN_DIVE,
  );

  function getFieldError(path: FieldPath<BookingFormValues>) {
    return form.getFieldState(path, form.formState).error?.message;
  }

  function showValidationErrors(
    fieldErrors: BookingIntakeFieldErrors,
    nextFormErrors: string[],
  ) {
    form.clearErrors();
    Object.entries(fieldErrors).forEach(([field, messages]) => {
      const message = messages[0];
      if (message) {
        form.setError(field as FieldPath<BookingFormValues>, {
          type: 'validate',
          message,
        });
      }
    });
    setFormErrors(nextFormErrors);
  }

  async function submitBooking(
    values: BookingFormValues,
    intent: SubmitIntent,
  ) {
    setSubmitIntent(intent);
    showValidationErrors({}, []);

    const validation = validateBookingIntake(
      normalizeBookingFormValues(values),
      intent,
    );
    if (!validation.success) {
      showValidationErrors(validation.fieldErrors, validation.formErrors);
      return;
    }

    const result =
      intent === 'draft'
        ? await createBookingDraft(values)
        : await submitBookingForApproval(values);

    if (!result.success) {
      showValidationErrors(
        result.fieldErrors,
        result.formError ? [result.formError] : [],
      );
      return;
    }

    clearAutosave();
    router.push(result.redirectTo);
  }

  const isPaidDeposit =
    depositStatus === DepositStatus.PAID ||
    depositStatus === DepositStatus.PARTIALLY_PAID;
  const errorMessages = [
    ...new Set([
      ...formErrors,
      ...collectBookingFormErrorMessages(form.formState.errors),
    ]),
  ];

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={form.handleSubmit((values) => submitBooking(values, 'submit'))}
    >
      <RawBookingSection form={form} />
      <BookingDetailsSection
        form={form}
        activities={activities}
        getFieldError={getFieldError}
      />
      <CustomerDiverDetailsSection
        form={form}
        includesFunDive={includesFunDive}
        getFieldError={getFieldError}
      />
      <DepositPaymentSection
        form={form}
        isPaidDeposit={isPaidDeposit}
        getFieldError={getFieldError}
      />
      <BookingFormActions
        errorMessages={errorMessages}
        isSubmitting={isSubmitting}
        submitIntent={submitIntent}
        onSaveDraft={() =>
          void form.handleSubmit((values) => submitBooking(values, 'draft'))()
        }
        onSubmitForApproval={() => setSubmitIntent('submit')}
        clearAutosave={clearAutosave}
      />
    </form>
  );
}
