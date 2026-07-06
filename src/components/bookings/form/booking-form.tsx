'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch, type FieldPath } from 'react-hook-form';

import { BookingFormActions } from '@/components/bookings/form/booking-form-actions';
import { collectBookingFormErrorMessages } from '@/components/bookings/form/booking-form-controls';
import { buildCreateReadinessItems } from '@/components/bookings/form/booking-form-readiness';
import { BookingReadinessCard } from '@/components/bookings/form/booking-readiness-card';
import { BookingDetailsSection } from '@/components/bookings/form/sections/booking-details-section';
import { CustomerDiverDetailsSection } from '@/components/bookings/form/sections/customer-diver-details-section';
import { DepositPaymentSection } from '@/components/bookings/form/sections/deposit-payment-section';
import { RawBookingSection } from '@/components/bookings/form/sections/raw-booking-section';
import { StickyRailLayout } from '@/components/common/sticky-rail-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  ActivityType,
  BookingStatus,
  DepositStatus,
} from '@/generated/prisma/enums';

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

/**
 * Renders the create/edit booking intake form and handles workflow submissions.
 *
 * @param props - Create mode options or edit mode booking identity and initial values.
 * @returns The booking intake form with a sticky rail containing readiness items (create mode) or workflow actions (edit mode).
 */
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
  const customers =
    useWatch({ control: form.control, name: 'customers' }) ?? [];
  const source = useWatch({ control: form.control, name: 'source' });
  const numberOfPeople = useWatch({
    control: form.control,
    name: 'numberOfPeople',
  });
  const depositStatus = useWatch({
    control: form.control,
    name: 'depositStatus',
  });
  const amount = useWatch({ control: form.control, name: 'amount' });
  const currency = useWatch({ control: form.control, name: 'currency' });
  const paidTo = useWatch({ control: form.control, name: 'paidTo' });
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

  function submitCurrentForm(intent: SubmitIntent) {
    setSubmitIntent(intent);
    showValidationErrors({}, []);
    void form.handleSubmit((values) => submitBooking(values, intent))();
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
  const createReadinessItems = buildCreateReadinessItems({
    activities,
    amount,
    currency,
    customers,
    depositStatus,
    numberOfPeople,
    paidTo,
    source,
  });
  const createActions = (
    <BookingFormActions
      mode="create"
      layout="rail"
      errorMessages={errorMessages}
      isSubmitting={isSubmitting}
      submitIntent={submitIntent === 'edit' ? 'draft' : submitIntent}
      onSaveDraft={() => submitCurrentForm('draft')}
      onSubmitForApproval={() => setSubmitIntent('submit')}
      clearAutosave={clearAutosave}
    />
  );

  const formSections = (
    <div className="space-y-6">
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
    </div>
  );

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submitCurrentForm(isEdit ? 'edit' : 'submit');
      }}
    >
      {isEdit ? (
        <StickyRailLayout
          rail={
            <Card className="rounded-2xl border border-border bg-card shadow-sm">
              <CardHeader className="border-b border-border">
                <CardTitle className="font-heading text-base font-semibold">
                  Booking actions
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Review and save your changes
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                <BookingFormActions
                  mode="edit"
                  layout="rail"
                  errorMessages={errorMessages}
                  isSubmitting={isSubmitting}
                  initialStatus={editProps!.initialStatus}
                  submitIntent={submitIntent}
                  cancelHref={`/bookings/${editProps!.bookingId}`}
                  onSaveChanges={() => submitCurrentForm('edit')}
                  onSubmitForApproval={() => submitCurrentForm('submit')}
                  onResubmitForApproval={() => submitCurrentForm('resubmit')}
                  clearAutosave={clearAutosave}
                />
              </CardContent>
            </Card>
          }
        >
          {formSections}
        </StickyRailLayout>
      ) : (
        <StickyRailLayout
          rail={
            <BookingReadinessCard items={createReadinessItems}>
              {createActions}
            </BookingReadinessCard>
          }
        >
          {formSections}
        </StickyRailLayout>
      )}
    </form>
  );
}
