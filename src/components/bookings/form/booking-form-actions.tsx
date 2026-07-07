import Link from 'next/link';

import { PendingButton } from '@/components/common/pending-button';
import { Button } from '@/components/ui/button';
import { BookingStatus } from '@/generated/prisma/enums';
import { cn } from '@/lib/utils';
import { Send } from 'lucide-react';

type SubmitIntent = 'draft' | 'submit' | 'edit' | 'resubmit';

type SharedBookingFormActionsProps = {
  errorMessages: string[];
  isSubmitting: boolean;
  layout?: 'footer' | 'rail';
};

type CreateBookingFormActionsProps = SharedBookingFormActionsProps & {
  mode: 'create';
  submitIntent: SubmitIntent;
  onSaveDraft: () => void;
  onSubmitForApproval: () => void;
  clearAutosave: () => void;
};

type EditBookingFormActionsProps = SharedBookingFormActionsProps & {
  mode: 'edit';
  initialStatus: BookingStatus;
  submitIntent: SubmitIntent;
  onSaveChanges: () => void;
  onSubmitForApproval: () => void;
  onResubmitForApproval: () => void;
  clearAutosave: () => void;
  cancelHref: string;
};

type BookingFormActionsProps =
  | CreateBookingFormActionsProps
  | EditBookingFormActionsProps;

type BookingFormValidationFeedbackProps = {
  errorMessages: string[];
};

/**
 * Renders booking form validation feedback in the parent layout's available
 * space without imposing its own nested scroll behavior.
 *
 * @param props - Validation messages collected from client and server checks.
 * @returns A validation summary alert, or null when there are no errors.
 */
export function BookingFormValidationFeedback({
  errorMessages,
}: BookingFormValidationFeedbackProps) {
  if (errorMessages.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-md border border-destructive/50 p-3 text-sm text-destructive"
      role="alert"
    >
      <p>Please fix the following before continuing:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {errorMessages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Renders validation feedback and workflow actions for booking intake forms.
 *
 * @param props - Form mode, submit state, validation messages, handlers, and layout.
 * @returns Booking form action controls for either the page footer or readiness rail.
 */
export function BookingFormActions({
  errorMessages,
  isSubmitting,
  layout = 'footer',
  ...props
}: BookingFormActionsProps) {
  const isRailLayout = layout === 'rail';
  const actionsClassName = isRailLayout
    ? 'flex flex-col gap-2'
    : 'flex flex-wrap justify-end gap-2';
  const buttonClassName = isRailLayout ? 'w-full' : undefined;

  return (
    <>
      <BookingFormValidationFeedback errorMessages={errorMessages} />

      <div className={actionsClassName}>
        {props.mode === 'edit' ? (
          <>
            {isSubmitting ? (
              <Button disabled type="button" variant="outline">
                Cancel
              </Button>
            ) : (
              <Button asChild type="button" variant="outline">
                <Link href={props.cancelHref} onClick={props.clearAutosave}>
                  Cancel
                </Link>
              </Button>
            )}
            <PendingButton
              onClick={props.onSaveChanges}
              pending={isSubmitting && props.submitIntent === 'edit'}
              pendingLabel="Saving..."
              type="button"
            >
              Save Changes
            </PendingButton>
            {props.initialStatus === BookingStatus.DRAFT ? (
              <PendingButton
                disabled={isSubmitting}
                onClick={props.onSubmitForApproval}
                pending={isSubmitting && props.submitIntent === 'submit'}
                pendingLabel="Submitting..."
                type="button"
              >
                <Send />
                Submit for Approval
              </PendingButton>
            ) : null}
            {props.initialStatus === BookingStatus.NEEDS_MORE_INFO ? (
              <PendingButton
                disabled={isSubmitting}
                onClick={props.onResubmitForApproval}
                pending={isSubmitting && props.submitIntent === 'resubmit'}
                pendingLabel="Resubmitting..."
                type="button"
              >
                <Send />
                Resubmit for Approval
              </PendingButton>
            ) : null}
          </>
        ) : (
          <>
            <PendingButton
              type="button"
              disabled={isSubmitting}
              onClick={props.onSubmitForApproval}
              className={buttonClassName}
              pending={isSubmitting && props.submitIntent === 'submit'}
              pendingLabel="Submitting..."
            >
              <Send />
              Submit for Approval
            </PendingButton>
            <PendingButton
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={props.onSaveDraft}
              className={buttonClassName}
              pending={isSubmitting && props.submitIntent === 'draft'}
              pendingLabel="Saving draft..."
            >
              Save Draft
            </PendingButton>
            {isSubmitting ? (
              <Button
                disabled
                type="button"
                variant={isRailLayout ? 'ghost' : 'outline'}
                className={cn(
                  buttonClassName,
                  isRailLayout && 'text-muted-foreground',
                )}
              >
                Cancel
              </Button>
            ) : (
              <Button
                asChild
                type="button"
                variant={isRailLayout ? 'ghost' : 'outline'}
                className={cn(
                  buttonClassName,
                  isRailLayout && 'text-muted-foreground',
                )}
              >
                <Link href="/bookings" onClick={props.clearAutosave}>
                  Cancel
                </Link>
              </Button>
            )}
          </>
        )}
      </div>
    </>
  );
}
