'use client';

import { useActionState, useEffect } from 'react';

import { PendingButton } from '@/components/common/pending-button';
import { Textarea } from '@/components/ui/textarea';
import { approveBooking } from '@/features/bookings/actions';
import { scheduleTimeSlotOptions } from '@/features/bookings/form-options';
import { getScheduleTimeSlotLabel } from '@/features/schedule/utils';
import { ScheduleTimeSlot } from '@/generated/prisma/enums';
import { inputClassName } from '@/lib/consts';

import {
  ActionError,
  getInitialBookingWorkflowActionState,
} from './workflow-action-state';
import { CalendarCheck } from 'lucide-react';

export type ApprovalScheduleActivitySlot = {
  id: string;
  label: string;
  defaultTimeSlot?: ScheduleTimeSlot | null;
};

type ApproveBookingFormProps = {
  bookingId: string;
  defaultAdminNotes?: string | null;
  noteDescription?: string;
  noteLabel?: string;
  onPendingChange?: (pending: boolean) => void;
  scheduleActivities?: ApprovalScheduleActivitySlot[];
};

const approvalScheduleTimeSlotFieldPrefix = 'scheduleTimeSlot:';

/**
 * Builds the approval form field name for one activity schedule slot.
 *
 * @param activityId - Persisted activity ID or the legacy fallback key.
 * @returns FormData key parsed by the approval server action.
 */
function getApprovalScheduleTimeSlotFieldName(activityId: string) {
  return `${approvalScheduleTimeSlotFieldPrefix}${activityId}`;
}

/**
 * Form used by administrators to approve and publish a booking to the schedule.
 *
 * @param props - Booking identity, optional existing admin notes, review-specific note copy, and schedule slot rows.
 * @returns Approval workflow form wired to the booking approval action.
 */
export function ApproveBookingForm({
  bookingId,
  defaultAdminNotes,
  noteLabel = 'Admin/schedule notes',
  noteDescription,
  onPendingChange,
  scheduleActivities = [],
}: ApproveBookingFormProps) {
  const [state, formAction, pending] = useActionState(
    approveBooking,
    getInitialBookingWorkflowActionState(),
  );

  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);

  return (
    <form action={formAction} className="grid gap-3">
      <input name="bookingId" type="hidden" value={bookingId} />
      {scheduleActivities.length > 0 ? (
        <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <div>
            <p className="text-sm font-medium">Schedule slots</p>
            <p className="text-xs text-muted-foreground">
              Set the operational slot for the schedule rows created on
              approval.
            </p>
          </div>
          <div className="grid gap-2">
            {scheduleActivities.map((activity) => (
              <label
                className="grid gap-1 text-sm sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-center"
                key={activity.id}
              >
                <span className="font-medium text-muted-foreground">
                  {activity.label}
                </span>
                <select
                  className={`${inputClassName} p-1`}
                  defaultValue={
                    activity.defaultTimeSlot ?? ScheduleTimeSlot.TBD
                  }
                  name={getApprovalScheduleTimeSlotFieldName(activity.id)}
                >
                  {scheduleTimeSlotOptions.map((timeSlot) => (
                    <option key={timeSlot} value={timeSlot}>
                      {getScheduleTimeSlotLabel(timeSlot)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      ) : null}
      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="admin-notes">
          {noteLabel}
        </label>
        {noteDescription && (
          <p className="text-sm text-muted-foreground">{noteDescription}</p>
        )}
        <Textarea
          className="min-h-20 resize-none rounded-lg bg-background px-3 py-2 leading-relaxed text-foreground shadow-sm placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring/30"
          defaultValue={defaultAdminNotes ?? ''}
          id="admin-notes"
          name="adminNotes"
          placeholder="Add notes for admin review or the internal schedule."
        />
      </div>
      <ActionError message={state.formError} />
      <PendingButton
        pending={pending}
        pendingLabel="Approving..."
        type="submit"
      >
        <CalendarCheck />
        Approve & Schedule
      </PendingButton>
    </form>
  );
}
