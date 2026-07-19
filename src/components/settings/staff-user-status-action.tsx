'use client';

import { useRouter } from 'next/navigation';
import {
  useRef,
  useState,
  useTransition,
  type MouseEvent,
} from 'react';
import { toast } from 'sonner';

import { PendingButton } from '@/components/common/pending-button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  deactivateStaffUser,
  reactivateStaffUser,
} from '@/features/settings/actions';
import type { StaffUserActionResult } from '@/features/settings/types';

type StatusActionStaffUser = {
  id: string;
  name: string;
  isActive: boolean;
};

type StaffUserStatusActionProps = {
  isCurrentUser: boolean;
  isFinalActiveAdmin: boolean;
  staffUser: StatusActionStaffUser;
};

/**
 * Extracts the safest useful message from a rejected staff status action.
 *
 * @param result - Structured failure returned by the authoritative action.
 * @param fallback - Generic operation-specific message used as a final fallback.
 * @returns A non-technical message suitable for the alert dialog.
 */
function getStatusActionFailureMessage(
  result: Extract<StaffUserActionResult, { success: false }>,
  fallback: string,
): string {
  return (
    result.formError ??
    Object.values(result.fieldErrors ?? {}).flat()[0] ??
    fallback
  );
}

/**
 * Renders safe activate/deactivate controls for one supported login account.
 *
 * @param props - Persisted account status plus advisory self/final-ADMIN state.
 * @returns A controlled confirmation dialog or an explanatory disabled action.
 */
export function StaffUserStatusAction({
  isCurrentUser,
  isFinalActiveAdmin,
  staffUser,
}: StaffUserStatusActionProps) {
  const router = useRouter();
  const submissionRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [isActionInFlight, setIsActionInFlight] = useState(false);
  const [isTransitionPending, startTransition] = useTransition();
  const isPending = isActionInFlight || isTransitionPending;
  const isDeactivation = staffUser.isActive;

  /** Updates dialog state while preventing dismissal during a mutation. */
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && isPending) {
      return;
    }

    setOpen(nextOpen);
    setError(undefined);
  }

  /** Submits the requested status change once and handles safe UI feedback. */
  function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    if (submissionRef.current || isPending) {
      return;
    }

    submissionRef.current = true;
    setIsActionInFlight(true);
    setError(undefined);

    startTransition(async () => {
      const failureMessage = isDeactivation
        ? 'Unable to deactivate the staff account right now. Please try again.'
        : 'Unable to reactivate the staff account right now. Please try again.';

      try {
        const result = isDeactivation
          ? await deactivateStaffUser({ userId: staffUser.id })
          : await reactivateStaffUser({ userId: staffUser.id });

        if (!result.success) {
          setError(getStatusActionFailureMessage(result, failureMessage));
          return;
        }

        setOpen(false);
        router.refresh();
        toast.success(
          isDeactivation
            ? 'Staff account deactivated.'
            : 'Staff account reactivated.',
        );
      } catch {
        setError(failureMessage);
      } finally {
        submissionRef.current = false;
        setIsActionInFlight(false);
      }
    });
  }

  if (isDeactivation && (isCurrentUser || isFinalActiveAdmin)) {
    return (
      <div className="mt-3 space-y-2">
        <Button disabled size="sm" type="button" variant="destructive">
          Deactivate account
        </Button>
        {isCurrentUser ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            You cannot deactivate the account you are currently using.
          </p>
        ) : null}
        {isFinalActiveAdmin ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            This account is the final active Admin and cannot be deactivated.
          </p>
        ) : null}
      </div>
    );
  }

  const actionLabel = isDeactivation
    ? 'Deactivate account'
    : 'Reactivate account';

  return (
    <AlertDialog onOpenChange={handleOpenChange} open={open}>
      <AlertDialogTrigger asChild>
        <Button
          className="mt-3"
          size="sm"
          type="button"
          variant={isDeactivation ? 'destructive' : 'outline'}
        >
          {actionLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isDeactivation
              ? `Deactivate ${staffUser.name}?`
              : `Reactivate ${staffUser.name}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isDeactivation
              ? 'This user will no longer be able to sign in or use the application. Existing bookings, assignments, and historical records will remain unchanged.'
              : 'This user will be able to sign in again using their existing password and assigned role.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error ? (
          <p
            aria-live="polite"
            className="text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <PendingButton
              onClick={handleConfirm}
              pending={isPending}
              pendingLabel={
                isDeactivation ? 'Deactivating...' : 'Reactivating...'
              }
              type="button"
              variant={isDeactivation ? 'destructive' : 'default'}
            >
              {actionLabel}
            </PendingButton>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
