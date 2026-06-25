'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch, type FieldPath } from 'react-hook-form';

import { BookingFormActions } from '@/components/bookings/booking-form-actions';
import { collectBookingFormErrorMessages } from '@/components/bookings/booking-form-controls';
import { BookingDetailsSection } from '@/components/bookings/booking-details-section';
import { CustomerDiverDetailsSection } from '@/components/bookings/customer-diver-details-section';
import { DepositPaymentSection } from '@/components/bookings/deposit-payment-section';
import { RawBookingSection } from '@/components/bookings/raw-booking-section';
import {
  createBookingDraft,
  resubmitEditedBookingForApproval,
  submitEditedBookingForApproval,
  submitBookingForApproval,
  updateBooking,
} from '@/features/bookings/actions';
import { bookingFormDefaultValues } from '@/features/bookings/form-values';
import { normalizeBookingFormValues } from '@/features/bookings/form-mappers';
import type { BookingFormValues } from '@/features/bookings/types';
import {
  getBookingEditFormAutosaveKey,
  NEW_BOOKING_FORM_AUTOSAVE_KEY,
  useBookingFormAutosave,
} from '@/features/bookings/use-booking-form-autosave';
import {
  validateBookingIntake,
  type BookingIntakeFieldErrors,
} from '@/features/bookings/validation';
import { ActivityType, BookingStatus, DepositStatus } from '@/generated/prisma/enums';

type SubmitIntent = 'draft' | 'submit' | 'edit' | 'resubmit';

type CreateBookingFormProps = {
  mode?: 'create';
};

type EditBookingFormProps = {
  mode: 'edit';
  bookingId: string;
  initialValues: BookingFormValues;
  initialStatus: BookingStatus;
};

type BookingFormProps = CreateBookingFormProps | EditBookingFormProps;

export function BookingForm(props: BookingFormProps) {
  const editProps = props.mode === 'edit' ? props : null;
  const isEdit = editProps !== null;
  const router = useRouter();
  const [submitIntent, setSubmitIntent] = useState<SubmitIntent>(
    isEdit ? 'edit' : 'draft',
  );
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const form = useForm<BookingFormValues>({
    defaultValues: editProps?.initialValues ?? bookingFormDefaultValues,
  });
  const { clearAutosave } = useBookingFormAutosave(form, {
    storageKey: editProps
      ? getBookingEditFormAutosaveKey(editProps.bookingId)
      : NEW_BOOKING_FORM_AUTOSAVE_KEY,
    restoreBaseValues: editProps?.initialValues ?? bookingFormDefaultValues,
  });
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

    const validationIntent =
      intent === 'draft' ||
      (intent === 'edit' &&
        editProps?.initialStatus !== BookingStatus.PENDING_APPROVAL)
        ? 'draft'
        : 'submit';
    const validation = validateBookingIntake(
      normalizeBookingFormValues(values),
      validationIntent,
    );
    if (!validation.success) {
      showValidationErrors(validation.fieldErrors, validation.formErrors);
      return;
    }

    const result = isEdit
      ? intent === 'submit'
        ? await submitEditedBookingForApproval(editProps!.bookingId, values)
        : intent === 'resubmit'
          ? await resubmitEditedBookingForApproval(editProps!.bookingId, values)
          : await updateBooking(editProps!.bookingId, values)
      : intent === 'draft'
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
      onSubmit={form.handleSubmit((values) =>
        submitBooking(values, isEdit ? 'edit' : 'submit'),
      )}
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
      {isEdit ? (
        <BookingFormActions
          mode="edit"
          errorMessages={errorMessages}
          isSubmitting={isSubmitting}
          initialStatus={editProps!.initialStatus}
          submitIntent={submitIntent}
          cancelHref={`/bookings/${editProps!.bookingId}`}
          onSaveChanges={() =>
            void form.handleSubmit((values) => submitBooking(values, 'edit'))()
          }
          onSubmitForApproval={() =>
            void form.handleSubmit((values) => submitBooking(values, 'submit'))()
          }
          onResubmitForApproval={() =>
            void form.handleSubmit((values) =>
              submitBooking(values, 'resubmit'),
            )()
          }
          clearAutosave={clearAutosave}
        />
      ) : (
        <BookingFormActions
          mode="create"
          errorMessages={errorMessages}
          isSubmitting={isSubmitting}
          submitIntent={submitIntent === 'edit' ? 'draft' : submitIntent}
          onSaveDraft={() =>
            void form.handleSubmit((values) => submitBooking(values, 'draft'))()
          }
          onSubmitForApproval={() => setSubmitIntent('submit')}
          clearAutosave={clearAutosave}
        />
      )}
    </form>
  );
}
