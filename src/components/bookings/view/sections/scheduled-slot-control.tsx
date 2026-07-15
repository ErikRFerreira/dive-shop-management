'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

import { PendingButton } from '@/components/common/pending-button';
import { scheduleTimeSlotOptions } from '@/features/bookings/form-options';
import {
  applyScheduleSlotToCourseDays,
  updateScheduleItemTimeSlot,
  type ScheduleDayActionResult,
} from '@/features/schedule/actions';
import { getScheduleTimeSlotLabel } from '@/features/schedule/utils';
import {
  ScheduleTimeSlot,
  type ScheduleTimeSlot as ScheduleTimeSlotValue,
} from '@/generated/prisma/enums';
import { inputClassName } from '@/lib/consts';

type ScheduledSlotControlProps = {
  canApplyToAllDays: boolean;
  scheduleItemId: string;
  timeSlot: ScheduleTimeSlotValue;
};

/**
 * Renders an admin/manager schedule slot selector for one scheduled day.
 *
 * @param props - Schedule item identity and current operational slot.
 * @returns A slot select that persists changes through the schedule action.
 */
export function ScheduledSlotControl({
  canApplyToAllDays,
  scheduleItemId,
  timeSlot,
}: ScheduledSlotControlProps) {
  const router = useRouter();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(timeSlot);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const pendingActionRef = useRef(false);
  const [isActionInFlight, setIsActionInFlight] = useState(false);
  const [pendingAction, setPendingAction] = useState<'single' | 'all' | null>(
    null,
  );
  const isActionPending = isPending || isActionInFlight;
  const hasValidSelectedTimeSlot = isValidScheduleTimeSlot(selectedTimeSlot);

  /**
   * Persists a selected operational slot and refreshes schedule-facing views.
   *
   * @param nextTimeSlot - New slot selected by an admin or manager.
   */
  function handleTimeSlotChange(nextTimeSlot: string) {
    if (pendingActionRef.current || isActionPending) {
      return;
    }

    setSelectedTimeSlot(nextTimeSlot);
    setError(undefined);

    if (!isValidScheduleTimeSlot(nextTimeSlot)) {
      setError('Select a valid schedule slot.');
      return;
    }

    pendingActionRef.current = true;
    setIsActionInFlight(true);
    setPendingAction('single');

    startTransition(async () => {
      try {
        const result = await updateScheduleItemTimeSlot(
          scheduleItemId,
          nextTimeSlot,
        );

        if (!result.success) {
          setSelectedTimeSlot(timeSlot);
        }

        handleScheduleSlotActionResult(result, router.refresh, setError);
      } finally {
        pendingActionRef.current = false;
        setIsActionInFlight(false);
        setPendingAction(null);
      }
    });
  }

  /**
   * Applies the currently selected operational slot to every related course day.
   */
  function handleApplyToAllDays() {
    if (pendingActionRef.current || isActionPending) {
      return;
    }

    setError(undefined);

    if (!isValidScheduleTimeSlot(selectedTimeSlot)) {
      setError('Select a valid schedule slot before applying it to all days.');
      return;
    }

    pendingActionRef.current = true;
    setIsActionInFlight(true);
    setPendingAction('all');

    startTransition(async () => {
      try {
        const result = await applyScheduleSlotToCourseDays(
          scheduleItemId,
          selectedTimeSlot,
        );

        handleScheduleSlotActionResult(result, router.refresh, setError);
      } finally {
        pendingActionRef.current = false;
        setIsActionInFlight(false);
        setPendingAction(null);
      }
    });
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-32 flex-1 text-sm font-medium text-muted-foreground">
          Scheduled slot
          <select
            className={`${inputClassName} mt-1 py-1`}
            disabled={isActionPending}
            onChange={(event) => handleTimeSlotChange(event.target.value)}
            value={selectedTimeSlot ?? ScheduleTimeSlot.TBD}
          >
            {scheduleTimeSlotOptions.map((slot) => (
              <option key={slot} value={slot}>
                {getScheduleTimeSlotLabel(slot)}
              </option>
            ))}
          </select>
        </label>
        {canApplyToAllDays ? (
          <PendingButton
            disabled={!hasValidSelectedTimeSlot || isActionPending}
            onClick={handleApplyToAllDays}
            pending={pendingAction === 'all' && isActionPending}
            pendingLabel="Applying..."
            size="sm"
            type="button"
            variant="outline"
          >
            Apply to all days
          </PendingButton>
        ) : null}
      </div>
      <ScheduleSlotActionError message={error} />
    </div>
  );
}

/**
 * Checks whether a client-provided select value is a supported schedule slot.
 *
 * @param value - Raw value read from the scheduled slot select.
 * @returns True for AM, PM, Night, or TBD enum values.
 */
function isValidScheduleTimeSlot(
  value: string,
): value is ScheduleTimeSlotValue {
  return scheduleTimeSlotOptions.some((timeSlot) => timeSlot === value);
}

/**
 * Applies a schedule slot update result to the client UI.
 *
 * @param result - Result returned by the schedule slot server action.
 * @param refresh - Callback that refreshes the current route.
 * @param setError - Callback that stores inline error text.
 */
function handleScheduleSlotActionResult(
  result: ScheduleDayActionResult,
  refresh: () => void,
  setError: (message?: string) => void,
) {
  if (result.success) {
    refresh();
    return;
  }

  setError(getScheduleSlotActionErrorMessage(result));
}

/**
 * Formats server action errors for inline schedule slot display.
 *
 * @param result - Failed schedule slot action result.
 * @returns A single staff-facing error message.
 */
function getScheduleSlotActionErrorMessage(
  result: Extract<ScheduleDayActionResult, { success: false }>,
) {
  const fieldError = result.fieldErrors
    ? Object.values(result.fieldErrors).flat()[0]
    : undefined;

  return result.formError ?? fieldError ?? 'Unable to update schedule slot.';
}

/**
 * Renders an accessible inline schedule slot action error.
 *
 * @param props - Optional error message.
 * @returns Inline error text when a message exists.
 */
function ScheduleSlotActionError({ message }: { message?: string }) {
  return message ? (
    <p aria-live="polite" className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
}
