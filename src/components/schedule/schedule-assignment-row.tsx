'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useRef, useState, useTransition } from 'react';

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
  removeScheduleAssignment,
  updateScheduleAssignmentRole,
} from '@/features/schedule/actions';
import type { ScheduleAssignmentDetail } from '@/features/schedule/types';
import { type ScheduleAssignmentRole as ScheduleAssignmentRoleValue } from '@/generated/prisma/enums';
import { formatEnumLabel } from '@/lib/format';
import {
  assignmentRoles,
  AssignmentActionError,
  handleAssignmentActionResult,
  selectClass,
} from './schedule-assignment-utilities';
import { ScheduleAssignmentBadge } from './schedule-assignments';

type ScheduleAssignmentsListVariant = 'default' | 'compact' | 'dialog';

/**
 * Renders one assigned staff row with optional role update and remove controls.
 *
 * @param props - Assignment detail, management permission state, and display variant.
 * @returns A row describing an assigned staff member.
 */
export function ScheduleAssignmentRow({
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
