import type { ScheduleAssignmentActionResult } from '@/features/schedule/actions';
import type {
  AssignableStaff,
  ScheduleAssignmentDetail,
} from '@/features/schedule/types';
import {
  ScheduleAssignmentRole,
  type ScheduleAssignmentRole as ScheduleAssignmentRoleValue,
} from '@/generated/prisma/enums';
import { formatEnumLabel } from '@/lib/format';

export const assignmentRoles = Object.values(ScheduleAssignmentRole);

/* Shared styling for the compact native selects, matched to the schedule
   filter controls for visual consistency. */
export const selectClass =
  'h-9 truncate rounded-lg border border-border bg-background px-2.5 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 [&>span]:truncate';

type AssignmentActionErrorProps = {
  message?: string;
};

/**
 * Removes staff who are already assigned to the selected schedule item.
 *
 * @param assignableStaff - Staff users available for assignment.
 * @param assignments - Current schedule item assignments.
 * @returns Staff users not already assigned to this schedule item.
 */
export function getAvailableAssignableStaff(
  assignableStaff: AssignableStaff[],
  assignments: ScheduleAssignmentDetail[],
) {
  const assignedUserIds = new Set(
    assignments.map((assignment) => assignment.userId),
  );

  return assignableStaff.filter((staff) => !assignedUserIds.has(staff.id));
}

/**
 * Formats a staff picker option with account role context.
 *
 * @param staff - Assignable staff user.
 * @returns A compact staff picker label.
 */
export function formatStaffOption(staff: AssignableStaff) {
  return `${staff.name} (${formatEnumLabel(staff.role)})`;
}

/**
 * Applies a schedule assignment action result to the client UI.
 *
 * @param result - Result returned by a schedule assignment server action.
 * @param refresh - Callback that refreshes the current route.
 * @param setError - Callback that stores inline error text.
 */
export function handleAssignmentActionResult(
  result: ScheduleAssignmentActionResult,
  refresh: () => void,
  setError: (message?: string) => void,
) {
  if (result.success) {
    refresh();
    return;
  }

  setError(getAssignmentActionErrorMessage(result));
}

/**
 * Formats server action errors for inline assignment form display.
 *
 * @param result - Failed assignment action result.
 * @returns A single staff-facing error message.
 */
export function getAssignmentActionErrorMessage(
  result: Extract<ScheduleAssignmentActionResult, { success: false }>,
) {
  const fieldError = result.fieldErrors
    ? Object.values(result.fieldErrors).flat()[0]
    : undefined;

  return result.formError ?? fieldError ?? 'Unable to update assignments.';
}

/**
 * Renders an accessible inline action error.
 *
 * @param props - Optional error message.
 * @returns Inline error text when a message exists.
 */
export function AssignmentActionError({ message }: AssignmentActionErrorProps) {
  return message ? (
    <p aria-live="polite" className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
}
