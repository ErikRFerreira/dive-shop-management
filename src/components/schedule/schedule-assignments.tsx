'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  FormEvent,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';

import { AssignmentBadge } from '@/components/common/assignment-badge';
import { PendingButton } from '@/components/common/pending-button';
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
  assignStaffToAllCourseDays,
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
  canAssignToAllCourseDays?: boolean;
  canManageAssignments: boolean;
  isManagingAssignments?: boolean;
  managementMode?: ScheduleAssignmentManagementMode;
  scheduleItemId: string;
  variant?: ScheduleAssignmentsListVariant;
};

type ScheduleAssignmentBadgeProps = {
  assignment?: ScheduleAssignmentDetail;
};

type ScheduleAssignmentFormProps = {
  assignments: ScheduleAssignmentDetail[];
  assignableStaff: AssignableStaff[];
  canAssignToAllCourseDays?: boolean;
  scheduleItemId: string;
  variant?: ScheduleAssignmentFormVariant;
};

type AssignmentActionErrorProps = {
  message?: string;
};

type ScheduleAssignmentsListVariant = 'default' | 'compact' | 'dialog';
type ScheduleAssignmentManagementMode = 'always' | 'collapsible';
type ScheduleAssignmentFormVariant = 'default' | 'dialog';

/* Shared styling for the compact native selects, matched to the schedule
   filter controls for visual consistency. */
const selectClass =
  'h-9 truncate rounded-lg border border-border bg-background px-2.5 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 [&>span]:truncate';

/**
 * Renders the schedule assignment section for a selected schedule event.
 *
 * @param props - Assignment data, available staff, permission state, display
 * variant, and whether controls should appear immediately or after expansion.
 * @returns A read-only assignment list with optional admin/manager controls.
 */
export function ScheduleAssignmentsList({
  assignments,
  assignableStaff,
  canAssignToAllCourseDays = false,
  canManageAssignments,
  isManagingAssignments = false,
  managementMode = 'always',
  scheduleItemId,
  variant = 'default',
}: ScheduleAssignmentsListProps) {
  const showManagementControls =
    canManageAssignments &&
    (managementMode === 'always' || isManagingAssignments);

  if (variant === 'dialog') {
    return showManagementControls ? (
      <section className="rounded-xl border border-border bg-muted/30 p-4">
        <div className="space-y-1 mb-1">
          <h3 className="text-sm font-semibold text-foreground">
            Manage staff assignments
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Assign instructors or update their roles for this scheduled
            activity.
          </p>
        </div>

        {assignments.length > 0 ? (
          <ul className="space-y-2 pb-3">
            {assignments.map((assignment) => (
              <li
                className="rounded-lg border border-border bg-card px-3 py-2"
                key={assignment.id}
              >
                <ScheduleAssignmentRow
                  assignment={assignment}
                  canManageAssignments={showManagementControls}
                  variant={variant}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-unassigned/30 bg-unassigned/5 px-4 py-3 text-sm text-unassigned mb-3">
            No instructors assigned yet.
          </p>
        )}

        <ScheduleAssignmentForm
          assignableStaff={assignableStaff}
          assignments={assignments}
          canAssignToAllCourseDays={canAssignToAllCourseDays}
          scheduleItemId={scheduleItemId}
          variant="dialog"
        />
      </section>
    ) : null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">Assigned staff</h3>
        {assignments.length === 0 ? <ScheduleAssignmentBadge /> : null}
      </div>

      {assignments.length > 0 ? (
        <ul className="space-y-2">
          {assignments.map((assignment) => (
            <li
              className={
                variant === 'compact'
                  ? 'rounded-md border px-3 py-2'
                  : 'rounded-md border p-3'
              }
              key={assignment.id}
            >
              <ScheduleAssignmentRow
                assignment={assignment}
                canManageAssignments={showManagementControls}
                variant={variant}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No staff assigned</p>
      )}

      {showManagementControls ? (
        <ScheduleAssignmentForm
          assignableStaff={assignableStaff}
          assignments={assignments}
          canAssignToAllCourseDays={canAssignToAllCourseDays}
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

  return (
    <AssignmentBadge
      label={formatEnumLabel(assignment.role)}
      variant="secondary"
      colorScheme="ocean"
    />
  );
}

/**
 * Renders one assigned staff row with optional role update and remove controls.
 *
 * @param props - Assignment detail, management permission state, and display variant.
 * @returns A row describing an assigned staff member.
 */
function ScheduleAssignmentRow({
  assignment,
  canManageAssignments,
  variant,
}: {
  assignment: ScheduleAssignmentDetail;
  canManageAssignments: boolean;
  variant: ScheduleAssignmentsListVariant;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pendingActionRef = useRef(false);
  const [isActionInFlight, setIsActionInFlight] = useState(false);
  const [error, setError] = useState<string>();
  const roleSelectId = useId();
  const isCompactLayout = variant === 'compact' || variant === 'dialog';
  const isActionPending = isPending || isActionInFlight;

  /**
   * Updates the assignment role through the schedule assignment server action.
   *
   * @param role - New schedule assignment role selected by the manager.
   */
  function handleRoleChange(role: ScheduleAssignmentRoleValue) {
    if (pendingActionRef.current || isActionPending) {
      return;
    }

    pendingActionRef.current = true;
    setIsActionInFlight(true);
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await updateScheduleAssignmentRole(assignment.id, role);
        handleAssignmentActionResult(result, router.refresh, setError);
      } finally {
        pendingActionRef.current = false;
        setIsActionInFlight(false);
      }
    });
  }

  /**
   * Removes the current staff assignment through the server action.
   */
  function handleRemoveAssignment() {
    if (pendingActionRef.current || isActionPending) {
      return;
    }

    pendingActionRef.current = true;
    setIsActionInFlight(true);
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await removeScheduleAssignment(assignment.id);
        handleAssignmentActionResult(result, router.refresh, setError);
      } finally {
        pendingActionRef.current = false;
        setIsActionInFlight(false);
      }
    });
  }

  if (isCompactLayout && !canManageAssignments) {
    return (
      <p className="text-sm">
        {assignment.user.name} <span aria-hidden="true">{'\u2014'}</span>{' '}
        {formatEnumLabel(assignment.role)}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={
          isCompactLayout
            ? 'grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-center'
            : 'flex flex-wrap items-start justify-between gap-3'
        }
      >
        <div className="min-w-0 space-y-1">
          <div
            className={
              isCompactLayout
                ? 'min-h-9 content-center'
                : 'flex flex-wrap items-center gap-2'
            }
          >
            <p className="font-medium">{assignment.user.name}</p>
            {variant === 'default' ? (
              <ScheduleAssignmentBadge assignment={assignment} />
            ) : null}
          </div>
          {variant === 'default' ? (
            <p className="wrap-break-word text-sm text-muted-foreground">
              {formatEnumLabel(assignment.user.role)}
              {assignment.user.email ? ` / ${assignment.user.email}` : ''}
            </p>
          ) : null}
        </div>

        {canManageAssignments ? (
          <div
            className={
              isCompactLayout ? 'grid gap-1' : 'grid gap-2 sm:max-w-64'
            }
          >
            <Label
              className={isCompactLayout ? 'sr-only' : undefined}
              htmlFor={roleSelectId}
            >
              Assignment role
            </Label>
            <Select
              disabled={isActionPending}
              onValueChange={handleRoleChange}
              value={assignment.role}
            >
              <SelectTrigger id={roleSelectId} className={selectClass}>
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

        {canManageAssignments ? (
          <Button
            aria-label={`Remove ${assignment.user.name}`}
            className={
              isCompactLayout
                ? 'justify-self-start sm:justify-self-end'
                : undefined
            }
            disabled={isActionPending}
            onClick={handleRemoveAssignment}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <AssignmentActionError message={error} />
    </div>
  );
}

/**
 * Renders admin/manager controls for adding a new assignment.
 *
 * @param props - Current assignments, assignable staff, schedule item ID, and
 * display variant.
 * @returns A compact staff assignment form.
 */
export function ScheduleAssignmentForm({
  assignments,
  assignableStaff,
  canAssignToAllCourseDays = false,
  scheduleItemId,
  variant = 'default',
}: ScheduleAssignmentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pendingActionRef = useRef(false);
  const [isActionInFlight, setIsActionInFlight] = useState(false);
  const [pendingAction, setPendingAction] = useState<'add' | 'all' | null>(
    null,
  );
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<
    ScheduleAssignmentRoleValue | ''
  >('');
  const [error, setError] = useState<string>();
  const staffSelectId = useId();
  const roleSelectId = useId();
  const availableStaff = useMemo(
    () => getAvailableAssignableStaff(assignableStaff, assignments),
    [assignableStaff, assignments],
  );
  const staffOptions = canAssignToAllCourseDays
    ? assignableStaff
    : availableStaff;
  const isActionPending = isPending || isActionInFlight;
  const isMissingSelection = !selectedUserId || !selectedRole;

  /**
   * Validates the shared staff and role fields before assignment actions.
   *
   * @returns True when the assignment form has enough data to submit.
   */
  function validateAssignmentSelection() {
    setError(undefined);

    if (!selectedUserId) {
      setError('Select a staff member before adding an assignment.');
      return;
    }

    if (!selectedRole) {
      setError('Select a role before adding an assignment.');
      return;
    }

    return true;
  }

  /**
   * Runs one assignment mutation while guarding against duplicate submissions.
   *
   * @param action - Pending action identifier used for button feedback.
   * @param mutation - Server action call to execute with the selected form data.
   */
  function runAssignmentMutation(
    action: 'add' | 'all',
    mutation: () => Promise<ScheduleAssignmentActionResult>,
  ) {
    if (pendingActionRef.current || isActionPending) {
      return;
    }

    if (!validateAssignmentSelection()) {
      return;
    }

    pendingActionRef.current = true;
    setIsActionInFlight(true);
    setPendingAction(action);
    startTransition(async () => {
      try {
        const result = await mutation();

        if (result.success) {
          setSelectedUserId('');
          setSelectedRole('');
        }

        handleAssignmentActionResult(result, router.refresh, setError);
      } finally {
        pendingActionRef.current = false;
        setIsActionInFlight(false);
        setPendingAction(null);
      }
    });
  }

  /**
   * Adds the selected staff user to the current schedule item.
   *
   * @param event - Form submit event from the add assignment form.
   */
  function handleAddAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    runAssignmentMutation('add', () =>
      addScheduleAssignment(scheduleItemId, selectedUserId, selectedRole),
    );
  }

  /**
   * Adds the selected staff user to every unassigned day in this course group.
   */
  function handleAssignToAllCourseDays() {
    runAssignmentMutation('all', () =>
      assignStaffToAllCourseDays(scheduleItemId, selectedUserId, selectedRole),
    );
  }

  return (
    <form
      className={
        variant === 'dialog'
          ? 'grid gap-3 border-t border-border pt-4'
          : 'grid gap-3 rounded-lg border p-3 bg-muted/30'
      }
      onSubmit={handleAddAssignment}
    >
      {variant === 'dialog' ? (
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          Add assignment
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
        <div className="grid gap-2">
          <Label
            className={variant === 'dialog' ? 'sr-only' : undefined}
            htmlFor={staffSelectId}
          >
            Staff
          </Label>
          <Select
            disabled={isActionPending || staffOptions.length === 0}
            onValueChange={setSelectedUserId}
            value={selectedUserId}
          >
            <SelectTrigger id={staffSelectId} className={selectClass}>
              <SelectValue
                placeholder={
                  staffOptions.length === 0
                    ? 'All available staff assigned'
                    : 'Select staff'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {staffOptions.map((staff) => (
                <SelectItem key={staff.id} value={staff.id}>
                  {formatStaffOption(staff)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label
            className={variant === 'dialog' ? 'sr-only' : undefined}
            htmlFor={roleSelectId}
          >
            Role
          </Label>
          <Select
            disabled={isActionPending}
            onValueChange={(role) =>
              setSelectedRole(role as ScheduleAssignmentRoleValue | '')
            }
            value={selectedRole}
          >
            <SelectTrigger id={roleSelectId} className={selectClass}>
              <SelectValue placeholder="Select role" />
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

        <div className="flex flex-wrap items-end gap-2">
          <PendingButton
            disabled={
              staffOptions.length === 0 || isMissingSelection || isActionPending
            }
            pending={pendingAction === 'add' && isActionPending}
            pendingLabel="Adding..."
            type="submit"
          >
            {variant === 'dialog' ? <Plus className="h-4 w-4" /> : null}
            {variant === 'dialog' ? 'Add' : 'Add assignment'}
          </PendingButton>
          {canAssignToAllCourseDays ? (
            <PendingButton
              disabled={
                staffOptions.length === 0 ||
                isMissingSelection ||
                isActionPending
              }
              onClick={handleAssignToAllCourseDays}
              pending={pendingAction === 'all' && isActionPending}
              pendingLabel="Assigning..."
              type="button"
              variant="outline"
            >
              Assign to all course days
            </PendingButton>
          ) : null}
        </div>
      </div>

      {availableStaff.length === 0 && !canAssignToAllCourseDays ? (
        <p className="text-sm text-muted-foreground">
          All available staff are already assigned to this activity.
        </p>
      ) : null}

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
