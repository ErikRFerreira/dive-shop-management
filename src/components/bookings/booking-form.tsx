'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch, type FieldPath } from 'react-hook-form';

import { BookingFormActions } from '@/components/bookings/booking-form-actions';
import { collectBookingFormErrorMessages } from '@/components/bookings/booking-form-controls';
import {
  BookingReadinessCard,
  type BookingReadinessItem,
} from '@/components/bookings/booking-readiness-card';
import { BookingDetailsSection } from '@/components/bookings/booking-details-section';
import { CustomerDiverDetailsSection } from '@/components/bookings/customer-diver-details-section';
import { DepositPaymentSection } from '@/components/bookings/deposit-payment-section';
import { RawBookingSection } from '@/components/bookings/raw-booking-section';
import { StickyRailLayout } from '@/components/common/sticky-rail-layout';
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
  BookingCustomerRole,
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
function buildCreateReadinessItems(values: {
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
      helperText: hasPaidDeposit
        ? undefined
        : 'No deposit recorded',
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

/**
 * Renders the create/edit booking intake form and handles workflow submissions.
 *
 * @param props - Create mode options or edit mode booking identity and initial values.
 * @returns The booking intake form with create-mode readiness rail or edit-mode footer actions.
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
      className={isEdit ? 'space-y-6' : undefined}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submitCurrentForm(isEdit ? 'edit' : 'submit');
      }}
    >
      {isEdit ? (
        <>
          {formSections}
          <BookingFormActions
            mode="edit"
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
        </>
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
