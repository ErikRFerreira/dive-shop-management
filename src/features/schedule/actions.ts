/**
 * Purpose: Server actions for managing staff assignments on scheduled activities.
 *
 * @module features/schedule/actions
 */

'use server';

import { Prisma } from '@/generated/prisma/client';
import { BookingStatus } from '@/generated/prisma/enums';
import {
  revalidateBookingWorkflowPaths,
  revalidateSchedulePath,
} from '@/features/bookings/cache';
import { db } from '@/lib/db';
import { requireCurrentUser } from '@/lib/current-user';

import {
  canManageScheduleAssignments,
  isAssignableStaffRole,
} from './permissions';
import {
  addScheduleAssignmentSchema,
  removeScheduleAssignmentSchema,
  updateScheduleAssignmentRoleSchema,
} from './validation';

export type ScheduleAssignmentActionResult =
  | { success: true }
  | {
      success: false;
      fieldErrors?: Record<string, string[]>;
      formError?: string;
    };

type ScheduleItemAssignmentGuard = {
  id: string;
  bookingRequest: {
    id: string;
    status: BookingStatus;
  };
};

/**
 * Converts schedule action validation failures into the shared result shape.
 *
 * @param error - Zod validation error from a schedule assignment schema.
 * @returns Field and form errors consumable by future assignment controls.
 */
function getScheduleValidationErrors(error: {
  flatten: () => {
    fieldErrors: Record<string, string[] | undefined>;
    formErrors: string[];
  };
}): ScheduleAssignmentActionResult {
  const flattened = error.flatten();
  const fieldErrors = Object.fromEntries(
    Object.entries(flattened.fieldErrors).filter(
      (entry): entry is [string, string[]] => entry[1] !== undefined,
    ),
  );

  return {
    success: false,
    fieldErrors,
    formError: flattened.formErrors[0],
  };
}

/**
 * Checks whether an authenticated user can manage schedule assignments.
 *
 * @returns A failure result when the user lacks permission, otherwise null.
 */
async function getScheduleAssignmentPermissionError() {
  const currentUser = await requireCurrentUser();

  return canManageScheduleAssignments(currentUser)
    ? null
    : ({
        success: false,
        formError: 'You do not have permission to manage schedule assignments.',
      } satisfies ScheduleAssignmentActionResult);
}

/**
 * Loads a schedule item with the related booking status needed for mutation guards.
 *
 * @param scheduleItemId - Schedule item being assigned.
 * @returns The schedule item and related booking status, or null when missing.
 */
async function loadScheduleItemAssignmentGuard(scheduleItemId: string) {
  return db.scheduleItem.findUnique({
    where: { id: scheduleItemId },
    select: {
      id: true,
      bookingRequest: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });
}

/**
 * Loads an assignment with the related schedule item and booking status.
 *
 * @param assignmentId - Assignment being updated or removed.
 * @returns The assignment and related booking status, or null when missing.
 */
async function loadExistingAssignmentGuard(assignmentId: string) {
  return db.scheduleAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      scheduleItem: {
        select: {
          id: true,
          bookingRequest: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Validates that assignment changes are allowed for the related booking status.
 *
 * @param scheduleItem - Schedule item and booking status loaded for the action.
 * @returns A failure result for non-scheduled bookings, otherwise null.
 */
function getScheduleStatusError(scheduleItem: ScheduleItemAssignmentGuard) {
  return scheduleItem.bookingRequest.status === BookingStatus.SCHEDULED
    ? null
    : ({
        success: false,
        formError: 'Only scheduled bookings can have staff assignments changed.',
      } satisfies ScheduleAssignmentActionResult);
}

/**
 * Revalidates schedule and booking detail routes affected by an assignment change.
 *
 * @param bookingId - Booking whose schedule assignment changed.
 */
function revalidateScheduleAssignmentPaths(bookingId: string) {
  revalidateSchedulePath();
  revalidateBookingWorkflowPaths(bookingId);
}

/**
 * Adds one staff assignment to a scheduled activity.
 *
 * @param scheduleItemId - Schedule item receiving the staff assignment.
 * @param userId - Active instructor or divemaster user to assign.
 * @param role - Assignment role the staff member will fill for this schedule item.
 * @returns Success or validation/authorization/business-rule errors.
 */
export async function addScheduleAssignment(
  scheduleItemId: string,
  userId: string,
  role: unknown,
): Promise<ScheduleAssignmentActionResult> {
  const validation = addScheduleAssignmentSchema.safeParse({
    scheduleItemId,
    userId,
    role,
  });

  if (!validation.success) {
    return getScheduleValidationErrors(validation.error);
  }

  const permissionError = await getScheduleAssignmentPermissionError();
  if (permissionError) {
    return permissionError;
  }

  const scheduleItem = await loadScheduleItemAssignmentGuard(
    validation.data.scheduleItemId,
  );

  if (!scheduleItem) {
    return {
      success: false,
      formError: 'Scheduled activity not found. Refresh and try again.',
    };
  }

  const statusError = getScheduleStatusError(scheduleItem);
  if (statusError) {
    return statusError;
  }

  const selectedUser = await db.user.findUnique({
    where: { id: validation.data.userId },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  });

  if (!selectedUser) {
    return {
      success: false,
      formError: 'Selected staff member not found. Refresh and try again.',
    };
  }

  if (!selectedUser.isActive || !isAssignableStaffRole(selectedUser.role)) {
    return {
      success: false,
      formError:
        'Only active instructors and divemasters can be assigned to scheduled activities.',
    };
  }

  const existingAssignment = await db.scheduleAssignment.findUnique({
    where: {
      scheduleItemId_userId: {
        scheduleItemId: validation.data.scheduleItemId,
        userId: validation.data.userId,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingAssignment) {
    return {
      success: false,
      formError:
        'This staff member is already assigned to this scheduled activity.',
    };
  }

  try {
    await db.scheduleAssignment.create({
      data: {
        scheduleItemId: validation.data.scheduleItemId,
        userId: validation.data.userId,
        role: validation.data.role,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return {
        success: false,
        formError:
          'This staff member is already assigned to this scheduled activity.',
      };
    }

    throw error;
  }

  revalidateScheduleAssignmentPaths(scheduleItem.bookingRequest.id);
  return { success: true };
}

/**
 * Updates the assignment role for an existing scheduled activity staff member.
 *
 * @param assignmentId - Existing assignment to update.
 * @param role - New assignment role.
 * @returns Success or validation/authorization/business-rule errors.
 */
export async function updateScheduleAssignmentRole(
  assignmentId: string,
  role: unknown,
): Promise<ScheduleAssignmentActionResult> {
  const validation = updateScheduleAssignmentRoleSchema.safeParse({
    assignmentId,
    role,
  });

  if (!validation.success) {
    return getScheduleValidationErrors(validation.error);
  }

  const permissionError = await getScheduleAssignmentPermissionError();
  if (permissionError) {
    return permissionError;
  }

  const assignment = await loadExistingAssignmentGuard(
    validation.data.assignmentId,
  );

  if (!assignment) {
    return { success: false, formError: 'Schedule assignment not found.' };
  }

  const statusError = getScheduleStatusError(assignment.scheduleItem);
  if (statusError) {
    return statusError;
  }

  await db.scheduleAssignment.update({
    where: {
      id: validation.data.assignmentId,
    },
    data: {
      role: validation.data.role,
    },
  });

  revalidateScheduleAssignmentPaths(
    assignment.scheduleItem.bookingRequest.id,
  );
  return { success: true };
}

/**
 * Removes an existing staff assignment from a scheduled activity.
 *
 * @param assignmentId - Existing assignment to remove.
 * @returns Success or validation/authorization/business-rule errors.
 */
export async function removeScheduleAssignment(
  assignmentId: string,
): Promise<ScheduleAssignmentActionResult> {
  const validation = removeScheduleAssignmentSchema.safeParse({ assignmentId });

  if (!validation.success) {
    return getScheduleValidationErrors(validation.error);
  }

  const permissionError = await getScheduleAssignmentPermissionError();
  if (permissionError) {
    return permissionError;
  }

  const assignment = await loadExistingAssignmentGuard(
    validation.data.assignmentId,
  );

  if (!assignment) {
    return { success: false, formError: 'Schedule assignment not found.' };
  }

  const statusError = getScheduleStatusError(assignment.scheduleItem);
  if (statusError) {
    return statusError;
  }

  await db.scheduleAssignment.delete({
    where: {
      id: validation.data.assignmentId,
    },
  });

  revalidateScheduleAssignmentPaths(
    assignment.scheduleItem.bookingRequest.id,
  );
  return { success: true };
}
