'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useId, useMemo, useState, useTransition } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  addScheduleAssignment,
  removeScheduleAssignment,
  updateScheduleAssignmentRole,
  type ScheduleAssignmentActionResult,
} from '@/features/schedule/actions';
import type {
  AssignableStaff,
  ScheduleAssignmentDetail,
} from '@/features/schedule/types';
import {
  ScheduleAssignmentRole,
  type ScheduleAssignmentRole as ScheduleAssignmentRoleValue,
} from '@/generated/prisma/enums';
import { formatEnumLabel } from '@/lib/format';

const assignmentRoles = Object.values(ScheduleAssignmentRole);

type ScheduleAssignmentsListProps = {
  assignments: ScheduleAssignmentDetail[];
  assignableStaff: AssignableStaff[];
  canManageAssignments: boolean;
  scheduleItemId: string;
};

type ScheduleAssignmentBadgeProps = {
  assignment?: ScheduleAssignmentDetail;
};

type ScheduleAssignmentFormProps = {
  assignments: ScheduleAssignmentDetail[];
  assignableStaff: AssignableStaff[];
  scheduleItemId: string;
};

type AssignmentActionErrorProps = {
  message?: string;
};

/**
 * Renders the schedule assignment section for a selected schedule event.
 *
 * @param props - Assignment data, available staff, and permission state.
 * @returns A read-only assignment list with optional admin/manager controls.
 */
export function ScheduleAssignmentsList({
  assignments,
  assignableStaff,
  canManageAssignments,
  scheduleItemId,
}: ScheduleAssignmentsListProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">Assigned staff</h3>
        {assignments.length === 0 ? <ScheduleAssignmentBadge /> : null}
      </div>

      {assignments.length > 0 ? (
        <ul className="space-y-2">
          {assignments.map((assignment) => (
            <li className="rounded-md border p-3" key={assignment.id}>
              <ScheduleAssignmentRow
                assignment={assignment}
                canManageAssignments={canManageAssignments}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No instructor or divemaster has been assigned yet.
        </p>
      )}

      {canManageAssignments ? (
        <ScheduleAssignmentForm
          assignableStaff={assignableStaff}
          assignments={assignments}
          scheduleItemId={scheduleItemId}
        />
      ) : null}
    </section>
  );
}

/**
 * Renders one assignment status badge, or the unassigned state.
 *
 * @param props - Optional assignment to format.
 * @returns A compact badge for assignment status display.
 */
export function ScheduleAssignmentBadge({
  assignment,
}: ScheduleAssignmentBadgeProps) {
  if (!assignment) {
    return <Badge variant="outline">Unassigned</Badge>;
  }

  return <Badge variant="secondary">{formatEnumLabel(assignment.role)}</Badge>;
}

/**
 * Renders one assigned staff row with optional role update and remove controls.
 *
 * @param props - Assignment detail and management permission state.
 * @returns A row describing an assigned staff member.
 */
function ScheduleAssignmentRow({
  assignment,
  canManageAssignments,
}: {
  assignment: ScheduleAssignmentDetail;
  canManageAssignments: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const roleSelectId = useId();

  /**
   * Updates the assignment role through the schedule assignment server action.
   *
   * @param role - New schedule assignment role selected by the manager.
   */
  function handleRoleChange(role: ScheduleAssignmentRoleValue) {
    setError(undefined);
    startTransition(async () => {
      const result = await updateScheduleAssignmentRole(assignment.id, role);
      handleAssignmentActionResult(result, router.refresh, setError);
    });
  }

  /**
   * Removes the current staff assignment through the server action.
   */
  function handleRemoveAssignment() {
    setError(undefined);
    startTransition(async () => {
      const result = await removeScheduleAssignment(assignment.id);
      handleAssignmentActionResult(result, router.refresh, setError);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{assignment.user.name}</p>
            <ScheduleAssignmentBadge assignment={assignment} />
          </div>
          <p className="break-words text-sm text-muted-foreground">
            {formatEnumLabel(assignment.user.role)}
            {assignment.user.email ? ` / ${assignment.user.email}` : ''}
          </p>
        </div>

        {canManageAssignments ? (
          <Button
            aria-label={`Remove ${assignment.user.name}`}
            disabled={isPending}
            onClick={handleRemoveAssignment}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {canManageAssignments ? (
        <div className="grid gap-2 sm:max-w-64">
          <Label htmlFor={roleSelectId}>Assignment role</Label>
          <Select
            disabled={isPending}
            onValueChange={handleRoleChange}
            value={assignment.role}
          >
            <SelectTrigger id={roleSelectId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {assignmentRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {formatEnumLabel(role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <AssignmentActionError message={error} />
    </div>
  );
}

/**
 * Renders admin/manager controls for adding a new assignment.
 *
 * @param props - Current assignments, assignable staff, and schedule item ID.
 * @returns A compact staff assignment form.
 */
export function ScheduleAssignmentForm({
  assignments,
  assignableStaff,
  scheduleItemId,
}: ScheduleAssignmentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] =
    useState<ScheduleAssignmentRoleValue>(ScheduleAssignmentRole.STAFF);
  const [error, setError] = useState<string>();
  const staffSelectId = useId();
  const roleSelectId = useId();
  const availableStaff = useMemo(
    () => getAvailableAssignableStaff(assignableStaff, assignments),
    [assignableStaff, assignments],
  );

  /**
   * Adds the selected staff user to the schedule item.
   *
   * @param event - Form submit event from the add assignment form.
   */
  function handleAddAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);

    if (!selectedUserId) {
      setError('Select a staff member before adding an assignment.');
      return;
    }

    startTransition(async () => {
      const result = await addScheduleAssignment(
        scheduleItemId,
        selectedUserId,
        selectedRole,
      );

      if (result.success) {
        setSelectedUserId('');
      }

      handleAssignmentActionResult(result, router.refresh, setError);
    });
  }

  return (
    <form className="grid gap-3 rounded-md border p-3" onSubmit={handleAddAssignment}>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
        <div className="grid gap-2">
          <Label htmlFor={staffSelectId}>Staff</Label>
          <Select
            disabled={isPending || availableStaff.length === 0}
            onValueChange={setSelectedUserId}
            value={selectedUserId}
          >
            <SelectTrigger id={staffSelectId}>
              <SelectValue
                placeholder={
                  availableStaff.length === 0
                    ? 'All staff assigned'
                    : 'Select staff'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {availableStaff.map((staff) => (
                <SelectItem key={staff.id} value={staff.id}>
                  {formatStaffOption(staff)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={roleSelectId}>Role</Label>
          <Select
            disabled={isPending}
            onValueChange={(role) =>
              setSelectedRole(role as ScheduleAssignmentRoleValue)
            }
            value={selectedRole}
          >
            <SelectTrigger id={roleSelectId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {assignmentRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {formatEnumLabel(role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button
            disabled={isPending || availableStaff.length === 0}
            type="submit"
          >
            {isPending ? 'Adding...' : 'Add assignment'}
          </Button>
        </div>
      </div>

      <AssignmentActionError message={error} />
    </form>
  );
}

/**
 * Removes staff who are already assigned to the selected schedule item.
 *
 * @param assignableStaff - Staff users available for assignment.
 * @param assignments - Current schedule item assignments.
 * @returns Staff users not already assigned to this schedule item.
 */
function getAvailableAssignableStaff(
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
function formatStaffOption(staff: AssignableStaff) {
  return `${staff.name} (${formatEnumLabel(staff.role)})`;
}

/**
 * Applies a schedule assignment action result to the client UI.
 *
 * @param result - Result returned by a schedule assignment server action.
 * @param refresh - Callback that refreshes the current route.
 * @param setError - Callback that stores inline error text.
 */
function handleAssignmentActionResult(
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
function getAssignmentActionErrorMessage(
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
function AssignmentActionError({ message }: AssignmentActionErrorProps) {
  return message ? (
    <p aria-live="polite" className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
}
