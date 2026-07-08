'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useForm, useWatch, type FieldPath } from 'react-hook-form';

import {
  BookingFormActions,
  BookingFormValidationFeedback,
} from '@/components/bookings/form/booking-form-actions';
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
import { primaryContactMethodError } from '@/features/bookings/validation-messages';
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
  const [pendingIntent, setPendingIntent] = useState<SubmitIntent | null>(null);
  const pendingIntentRef = useRef<SubmitIntent | null>(null);
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

  /**
   * Reads one field's current validation error from react-hook-form state.
   *
   * @param path - Booking form field path to inspect.
   * @returns The current validation message for the field, when present.
   */
  function getFieldError(path: FieldPath<BookingFormValues>) {
    return form.getFieldState(path, form.formState).error?.message;
  }

  /**
   * Releases the client-side action lock after validation or action failure.
   */
  function releasePendingIntent() {
    pendingIntentRef.current = null;
    setPendingIntent(null);
  }

  /**
   * Converts linked customer rows with blocking submit errors into editable new
   * customer rows so staff can fix data that the booking form can persist.
   *
   * @param fieldErrors - Validation errors keyed by React Hook Form path.
   */
  function unlockIncompleteLinkedCustomers(
    fieldErrors: BookingIntakeFieldErrors,
  ) {
    const currentCustomers = form.getValues('customers');
    const hasPrimaryContactMethodError = fieldErrors.customers?.includes(
      primaryContactMethodError,
    );

    currentCustomers.forEach((customer, index) => {
      if (!customer.customerId) {
        return;
      }

      const hasCustomerNameError = Boolean(
        fieldErrors[`customers.${index}.customerName`]?.length,
      );
      const hasContactMethodError =
        hasPrimaryContactMethodError &&
        customer.role === BookingCustomerRole.PRIMARY_CONTACT;

      if (!hasCustomerNameError && !hasContactMethodError) {
        return;
      }

      form.setValue(`customers.${index}.customerId`, undefined, {
        shouldDirty: true,
        shouldValidate: false,
      });
    });
  }

  /**
   * Applies validation errors returned by client or server-side booking checks.
   *
   * @param fieldErrors - Field-specific validation messages keyed by form path.
   * @param nextFormErrors - Form-level errors shown in the readiness/action rail.
   */
  function showValidationErrors(
    fieldErrors: BookingIntakeFieldErrors,
    nextFormErrors: string[],
  ) {
    form.clearErrors();
    unlockIncompleteLinkedCustomers(fieldErrors);
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

  /**
   * Validates and persists the booking according to the requested workflow action.
   *
   * @param values - Current booking form values.
   * @param intent - Workflow action the user started.
   */
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
      releasePendingIntent();
      return;
    }

    const result = await (async () => {
      try {
        return isEdit
          ? intent === 'submit'
            ? await submitEditedBookingForApproval(editProps!.bookingId, values)
            : intent === 'resubmit'
              ? await resubmitEditedBookingForApproval(
                  editProps!.bookingId,
                  values,
                )
              : await updateBooking(editProps!.bookingId, values)
          : intent === 'draft'
            ? await createBookingDraft(values)
            : await submitBookingForApproval(values);
      } catch (error) {
        releasePendingIntent();
        throw error;
      }
    })();

    if (!result.success) {
      showValidationErrors(
        result.fieldErrors,
        result.formError ? [result.formError] : [],
      );
      releasePendingIntent();
      return;
    }

    clearAutosave();
    router.push(result.redirectTo);
  }

  /**
   * Starts one booking form action and ignores competing actions while pending.
   *
   * @param intent - Workflow action requested by the clicked button or form submit.
   */
  function submitCurrentForm(intent: SubmitIntent) {
    if (pendingIntentRef.current) {
      return;
    }

    pendingIntentRef.current = intent;
    setPendingIntent(intent);
    setSubmitIntent(intent);
    showValidationErrors({}, []);
    void form.handleSubmit(
      (values) => submitBooking(values, intent),
      releasePendingIntent,
    )();
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
  const isActionPending = pendingIntent !== null || isSubmitting;
  const activeSubmitIntent = pendingIntent ?? submitIntent;
  const createReadinessItems = buildCreateReadinessItems({
    activities,
    amount,
    currency,
    customers,
    depositStatus,
    paidTo,
    source,
  });
  const createActions = (
    <BookingFormActions
      mode="create"
      layout="rail"
      errorMessages={[]}
      isSubmitting={isActionPending}
      submitIntent={
        activeSubmitIntent === 'edit' ? 'draft' : activeSubmitIntent
      }
      onSaveDraft={() => submitCurrentForm('draft')}
      onSubmitForApproval={() => submitCurrentForm('submit')}
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
              <CardContent className="pt-2">
                <BookingFormActions
                  mode="edit"
                  layout="rail"
                  errorMessages={errorMessages}
                  isSubmitting={isActionPending}
                  initialStatus={editProps!.initialStatus}
                  submitIntent={activeSubmitIntent}
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
            <BookingReadinessCard
              feedback={
                <BookingFormValidationFeedback errorMessages={errorMessages} />
              }
              items={createReadinessItems}
            >
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
