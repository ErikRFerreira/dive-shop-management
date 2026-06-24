import Link from 'next/link';

import { Button } from '@/components/ui/button';

type SubmitIntent = 'draft' | 'submit';

type SharedBookingFormActionsProps = {
  errorMessages: string[];
  isSubmitting: boolean;
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
  onSaveChanges: () => void;
  cancelHref: string;
};

type BookingFormActionsProps =
  | CreateBookingFormActionsProps
  | EditBookingFormActionsProps;

export function BookingFormActions({
  errorMessages,
  isSubmitting,
  ...props
}: BookingFormActionsProps) {
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

      <div className="flex flex-wrap justify-end gap-2">
        <Button asChild type="button" variant="outline">
          <Link
            href={props.mode === 'edit' ? props.cancelHref : '/bookings'}
            onClick={props.mode === 'create' ? props.clearAutosave : undefined}
          >
            Cancel
          </Link>
        </Button>
        {props.mode === 'edit' ? (
          <Button disabled={isSubmitting} onClick={props.onSaveChanges} type="submit">
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={props.onSaveDraft}
            >
              {isSubmitting && props.submitIntent === 'draft'
                ? 'Saving…'
                : 'Save Draft'}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              onClick={props.onSubmitForApproval}
            >
              {isSubmitting && props.submitIntent === 'submit'
                ? 'Submitting…'
                : 'Submit for Approval'}
            </Button>
          </>
        )}
      </div>
    </>
  );
}
