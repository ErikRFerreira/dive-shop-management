'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

import { PendingButton } from '@/components/common/pending-button';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  addScheduledCourseDay,
  removeScheduledCourseDay,
  type ScheduleDayActionResult,
} from '@/features/schedule/actions';

type ScheduledCourseDayActionsProps = {
  assignmentCount: number;
  canRemoveDay: boolean;
  scheduleItemId: string;
};

/**
 * Renders admin/manager controls for adjusting scheduled course days.
 *
 * @param props - Schedule item ID, assignment count, and remove eligibility.
 * @returns Add/remove day controls with confirmation for assigned days.
 */
export function ScheduledCourseDayActions({
  assignmentCount,
  canRemoveDay,
  scheduleItemId,
}: ScheduledCourseDayActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pendingActionRef = useRef(false);
  const [isActionInFlight, setIsActionInFlight] = useState(false);
  const [pendingAction, setPendingAction] = useState<'add' | 'remove' | null>(
    null,
  );
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [error, setError] = useState<string>();
  const isActionPending = isPending || isActionInFlight;
  const hasAssignments = assignmentCount > 0;

  /**
   * Runs one scheduled-day server action and applies the UI result.
   *
   * @param action - Server action callback to execute.
   * @param actionType - Scheduled-day action currently being submitted.
   */
  function runScheduleDayAction(
    action: () => Promise<ScheduleDayActionResult>,
    actionType: 'add' | 'remove',
  ) {
    if (pendingActionRef.current || isActionPending) {
      return;
    }

    pendingActionRef.current = true;
    setIsActionInFlight(true);
    setPendingAction(actionType);
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await action();
        handleScheduleDayActionResult(
          result,
          router.refresh,
          setError,
          setIsConfirmOpen,
        );
      } finally {
        pendingActionRef.current = false;
        setIsActionInFlight(false);
        setPendingAction(null);
      }
    });
  }

  /**
   * Adds another scheduled day to the current activity group.
   */
  function handleAddDay() {
    runScheduleDayAction(() => addScheduledCourseDay(scheduleItemId), 'add');
  }

  /**
   * Removes this scheduled day or opens confirmation when assignments exist.
   */
  function handleRemoveDay() {
    if (hasAssignments) {
      setError(undefined);
      setIsConfirmOpen(true);
      return;
    }

    runScheduleDayAction(
      () => removeScheduledCourseDay(scheduleItemId, false),
      'remove',
    );
  }

  /**
   * Removes this assigned scheduled day after manager confirmation.
   */
  function handleConfirmRemoveDay() {
    runScheduleDayAction(
      () => removeScheduledCourseDay(scheduleItemId, true),
      'remove',
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <PendingButton
          disabled={isActionPending}
          onClick={handleAddDay}
          pending={pendingAction === 'add'}
          pendingLabel="Adding..."
          size="sm"
          type="button"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          Add day
        </PendingButton>
        {canRemoveDay ? (
          <PendingButton
            disabled={isActionPending}
            onClick={handleRemoveDay}
            pending={pendingAction === 'remove'}
            pendingLabel="Removing..."
            size="sm"
            type="button"
            variant="outline"
          >
            <Trash2 className="h-4 w-4" />
            Remove day
          </PendingButton>
        ) : null}
      </div>

      <ScheduleDayActionError message={error} />

      <Dialog onOpenChange={setIsConfirmOpen} open={isConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove scheduled day?</DialogTitle>
            <DialogDescription>
              This day has assigned staff. Removing it will delete this
              scheduled day and its assignments only.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={isActionPending}
              onClick={() => setIsConfirmOpen(false)}
              type="button"
              variant="outline"
            >
              Keep day
            </Button>
            <PendingButton
              disabled={isActionPending}
              onClick={handleConfirmRemoveDay}
              pending={pendingAction === 'remove'}
              pendingLabel="Removing..."
              type="button"
              variant="destructive"
            >
              Remove day
            </PendingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Applies a scheduled-day action result to the client UI.
 *
 * @param result - Result returned by a scheduled-day server action.
 * @param refresh - Callback that refreshes the current route.
 * @param setError - Callback that stores inline error text.
 * @param setIsConfirmOpen - Callback that toggles assigned-day confirmation.
 */
function handleScheduleDayActionResult(
  result: ScheduleDayActionResult,
  refresh: () => void,
  setError: (message?: string) => void,
  setIsConfirmOpen: (open: boolean) => void,
) {
  if (result.success) {
    setIsConfirmOpen(false);
    refresh();
    return;
  }

  if (result.requiresConfirmation) {
    setIsConfirmOpen(true);
  }

  setError(getScheduleDayActionErrorMessage(result));
}

/**
 * Formats scheduled-day server action errors for inline display.
 *
 * @param result - Failed scheduled-day action result.
 * @returns A single staff-facing error message.
 */
function getScheduleDayActionErrorMessage(
  result: Extract<ScheduleDayActionResult, { success: false }>,
) {
  const fieldError = result.fieldErrors
    ? Object.values(result.fieldErrors).flat()[0]
    : undefined;

  return result.formError ?? fieldError ?? 'Unable to update scheduled days.';
}

/**
 * Renders an accessible inline scheduled-day action error.
 *
 * @param props - Optional error message.
 * @returns Inline error text when a message exists.
 */
function ScheduleDayActionError({ message }: { message?: string }) {
  return message ? (
    <p aria-live="polite" className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
}
