'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

import { scheduleTimeSlotOptions } from '@/features/bookings/form-options';
import {
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
  scheduleItemId,
  timeSlot,
}: ScheduledSlotControlProps) {
  const router = useRouter();
  const [selectedTimeSlot, setSelectedTimeSlot] =
    useState<ScheduleTimeSlotValue>(timeSlot);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const pendingActionRef = useRef(false);
  const [isActionInFlight, setIsActionInFlight] = useState(false);
  const isActionPending = isPending || isActionInFlight;

  /**
   * Persists a selected operational slot and refreshes schedule-facing views.
   *
   * @param nextTimeSlot - New slot selected by an admin or manager.
   */
  function handleTimeSlotChange(nextTimeSlot: ScheduleTimeSlotValue) {
    if (pendingActionRef.current || isActionPending) {
      return;
    }

    setSelectedTimeSlot(nextTimeSlot);
    setError(undefined);
    pendingActionRef.current = true;
    setIsActionInFlight(true);

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
      }
    });
  }

  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium text-muted-foreground">
        Scheduled slot
        <select
          className={`${inputClassName} mt-1`}
          disabled={isActionPending}
          onChange={(event) =>
            handleTimeSlotChange(event.target.value as ScheduleTimeSlotValue)
          }
          value={selectedTimeSlot ?? ScheduleTimeSlot.TBD}
        >
          {scheduleTimeSlotOptions.map((slot) => (
            <option key={slot} value={slot}>
              {getScheduleTimeSlotLabel(slot)}
            </option>
          ))}
        </select>
      </label>
      <ScheduleSlotActionError message={error} />
    </div>
  );
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
