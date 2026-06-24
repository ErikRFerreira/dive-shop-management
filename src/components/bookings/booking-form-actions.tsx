import Link from 'next/link';

import { Button } from '@/components/ui/button';

type SubmitIntent = 'draft' | 'submit';

type BookingFormActionsProps = {
  errorMessages: string[];
  isSubmitting: boolean;
  submitIntent: SubmitIntent;
  onSaveDraft: () => void;
  onSubmitForApproval: () => void;
  clearAutosave: () => void;
};

export function BookingFormActions({
  errorMessages,
  isSubmitting,
  submitIntent,
  onSaveDraft,
  onSubmitForApproval,
  clearAutosave,
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
          <Link href="/bookings" onClick={clearAutosave}>
            Cancel
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={onSaveDraft}
        >
          {isSubmitting && submitIntent === 'draft' ? 'Saving…' : 'Save Draft'}
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          onClick={onSubmitForApproval}
        >
          {isSubmitting && submitIntent === 'submit'
            ? 'Submitting…'
            : 'Submit for Approval'}
        </Button>
      </div>
    </>
  );
}
