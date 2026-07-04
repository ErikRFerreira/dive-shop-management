import Link from 'next/link';

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
      {errorMessages.length > 0 ? (
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
      ) : null}

      <div className={actionsClassName}>
        {props.mode === 'edit' ? (
          <>
            <Button asChild type="button" variant="outline">
              <Link href={props.cancelHref} onClick={props.clearAutosave}>
                Cancel
              </Link>
            </Button>
            <Button
              disabled={isSubmitting}
              onClick={props.onSaveChanges}
              type="button"
            >
              {isSubmitting && props.submitIntent === 'edit'
                ? 'Saving...'
                : 'Save Changes'}
            </Button>
            {props.initialStatus === BookingStatus.DRAFT ? (
              <Button
                disabled={isSubmitting}
                onClick={props.onSubmitForApproval}
                type="button"
              >
                <Send />
                {isSubmitting && props.submitIntent === 'submit'
                  ? 'Submitting...'
                  : 'Submit for Approval'}
              </Button>
            ) : null}
            {props.initialStatus === BookingStatus.NEEDS_MORE_INFO ? (
              <Button
                disabled={isSubmitting}
                onClick={props.onResubmitForApproval}
                type="button"
              >
                <Send />
                {isSubmitting && props.submitIntent === 'resubmit'
                  ? 'Resubmitting...'
                  : 'Resubmit for Approval'}
              </Button>
            ) : null}
          </>
        ) : (
          <>
            <Button
              type="submit"
              disabled={isSubmitting}
              onClick={props.onSubmitForApproval}
              className={buttonClassName}
            >
              <Send />
              {isSubmitting && props.submitIntent === 'submit'
                ? 'Submitting...'
                : 'Submit for Approval'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={props.onSaveDraft}
              className={buttonClassName}
            >
              {isSubmitting && props.submitIntent === 'draft'
                ? 'Saving...'
                : 'Save Draft'}
            </Button>
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
          </>
        )}
      </div>
    </>
  );
}
