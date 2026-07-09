/**
 * Purpose: Server actions for managing staff assignments on scheduled activities.
 *
 * @module features/schedule/actions
 */

'use server';

import { Prisma } from '@/generated/prisma/client';
import { ActivityType, BookingStatus } from '@/generated/prisma/enums';
import {
  revalidateBookingWorkflowPaths,
  revalidateSchedulePath,
} from '@/features/bookings/cache';
import { db } from '@/lib/db';
import { requireCurrentUser } from '@/lib/current-user';
import { addUtcDateOnlyDays } from '@/lib/operational-date';

import {
  canManageScheduleAssignments,
  isAssignableStaffRole,
} from './permissions';
import {
  addScheduledCourseDaySchema,
  addScheduleAssignmentSchema,
  removeScheduledCourseDaySchema,
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

export type ScheduleDayActionResult =
  | { success: true }
  | {
      success: false;
      fieldErrors?: Record<string, string[]>;
      formError?: string;
      requiresConfirmation?: boolean;
    };

type ScheduleItemAssignmentGuard = {
  id: string;
  bookingRequest: {
    id: string;
    status: BookingStatus;
  };
};

type ScheduleDayGuard = {
  id: string;
  bookingRequestId: string;
  bookingActivityId: string | null;
  date: Date;
  startTime: string | null;
  activityType: ActivityType;
  scheduleNotes: string | null;
  bookingRequest: {
    id: string;
    status: BookingStatus;
  };
  _count: {
    assignments: number;
  };
};

type ScheduleDaySibling = {
  id: string;
  date: Date;
  startTime: string | null;
  activityType: ActivityType;
  scheduleNotes: string | null;
  createdAt: Date;
  dayNumber: number | null;
  totalDays: number;
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
}): ScheduleAssignmentActionResult | ScheduleDayActionResult {
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
 * Checks whether an authenticated user can manage scheduled course days.
 *
 * @returns A failure result when the user lacks permission, otherwise null.
 */
async function getScheduleDayPermissionError() {
  const currentUser = await requireCurrentUser();

  return canManageScheduleAssignments(currentUser)
    ? null
    : ({
        success: false,
        formError: 'You do not have permission to manage scheduled days.',
      } satisfies ScheduleDayActionResult);
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
 * Loads a scheduled day with booking status and assignment count for day actions.
 *
 * @param scheduleItemId - Schedule item being added after or removed.
 * @returns The schedule item day guard, or null when missing.
 */
async function loadScheduleDayGuard(
  scheduleItemId: string,
): Promise<ScheduleDayGuard | null> {
  return db.scheduleItem.findUnique({
    where: { id: scheduleItemId },
    select: {
      id: true,
      bookingRequestId: true,
      bookingActivityId: true,
      date: true,
      startTime: true,
      activityType: true,
      scheduleNotes: true,
      bookingRequest: {
        select: {
          id: true,
          status: true,
        },
      },
      _count: {
        select: {
          assignments: true,
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
 * Validates that scheduled day changes are allowed for the related booking status.
 *
 * @param scheduleItem - Schedule item and booking status loaded for the action.
 * @returns A failure result for non-scheduled bookings, otherwise null.
 */
function getScheduleDayStatusError(scheduleItem: ScheduleDayGuard) {
  return scheduleItem.bookingRequest.status === BookingStatus.SCHEDULED
    ? null
    : ({
        success: false,
        formError: 'Only scheduled bookings can have scheduled days changed.',
      } satisfies ScheduleDayActionResult);
}

/**
 * Builds the sibling predicate for schedule days belonging to the same activity.
 *
 * @param scheduleItem - Schedule item whose activity group is being managed.
 * @returns Prisma where input matching the schedule item's activity day group.
 */
function buildScheduleDaySiblingWhere(scheduleItem: ScheduleDayGuard) {
  return {
    bookingRequestId: scheduleItem.bookingRequestId,
    bookingActivityId: scheduleItem.bookingActivityId,
  } satisfies Prisma.ScheduleItemWhereInput;
}

/**
 * Loads schedule days that belong to the same booking activity.
 *
 * @param transaction - Prisma client or transaction scoped client.
 * @param scheduleItem - Schedule item whose activity group is being managed.
 * @returns Sibling schedule days ordered for stable day numbering.
 */
async function loadScheduleDaySiblings(
  transaction: Pick<Prisma.TransactionClient, 'scheduleItem'>,
  scheduleItem: ScheduleDayGuard,
): Promise<ScheduleDaySibling[]> {
  return transaction.scheduleItem.findMany({
    where: buildScheduleDaySiblingWhere(scheduleItem),
    select: {
      id: true,
      date: true,
      startTime: true,
      activityType: true,
      scheduleNotes: true,
      createdAt: true,
      dayNumber: true,
      totalDays: true,
    },
    orderBy: [{ date: 'asc' }, { dayNumber: 'asc' }, { createdAt: 'asc' }],
  });
}

/**
 * Updates persisted day labels for an ordered group of scheduled days.
 *
 * @param transaction - Prisma transaction client used for atomic renumbering.
 * @param scheduleItems - Ordered schedule days that should become day 1..n.
 * @param totalDaysOverride - Total day count to write when appending a new day.
 */
async function renumberScheduleDays(
  transaction: Pick<Prisma.TransactionClient, 'scheduleItem'>,
  scheduleItems: ScheduleDaySibling[],
  totalDaysOverride?: number,
) {
  const totalDays = totalDaysOverride ?? scheduleItems.length;

  await Promise.all(
    scheduleItems.map((scheduleItem, index) =>
      transaction.scheduleItem.update({
        where: {
          id: scheduleItem.id,
        },
        data: {
          dayNumber: index + 1,
          totalDays,
        },
      }),
    ),
  );
}

/**
 * Revalidates schedule surfaces and booking routes affected by schedule day changes.
 *
 * @param bookingId - Booking whose scheduled day count changed.
 */
function revalidateScheduleDayPaths(bookingId: string) {
  revalidateSchedulePath();
  revalidateBookingWorkflowPaths(bookingId);
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

/**
 * Adds one scheduled day after the last day for the selected activity group.
 *
 * @param scheduleItemId - Existing schedule item in the activity group to extend.
 * @returns Success or validation/authorization/business-rule errors.
 */
export async function addScheduledCourseDay(
  scheduleItemId: string,
): Promise<ScheduleDayActionResult> {
  const validation = addScheduledCourseDaySchema.safeParse({ scheduleItemId });

  if (!validation.success) {
    return getScheduleValidationErrors(validation.error);
  }

  const permissionError = await getScheduleDayPermissionError();
  if (permissionError) {
    return permissionError;
  }

  const scheduleItem = await loadScheduleDayGuard(
    validation.data.scheduleItemId,
  );

  if (!scheduleItem) {
    return {
      success: false,
      formError: 'Scheduled day not found. Refresh and try again.',
    };
  }

  const statusError = getScheduleDayStatusError(scheduleItem);
  if (statusError) {
    return statusError;
  }

  await db.$transaction(async (transaction) => {
    const siblings = await loadScheduleDaySiblings(transaction, scheduleItem);
    const latestScheduleItem = siblings.at(-1) ?? scheduleItem;
    const totalDays = siblings.length + 1;

    await renumberScheduleDays(transaction, siblings, totalDays);

    await transaction.scheduleItem.create({
      data: {
        bookingRequestId: scheduleItem.bookingRequestId,
        bookingActivityId: scheduleItem.bookingActivityId,
        date: addUtcDateOnlyDays(latestScheduleItem.date, 1),
        startTime: latestScheduleItem.startTime,
        activityType: latestScheduleItem.activityType,
        dayNumber: totalDays,
        totalDays,
        scheduleNotes: latestScheduleItem.scheduleNotes,
      },
    });
  });

  revalidateScheduleDayPaths(scheduleItem.bookingRequest.id);
  return { success: true };
}

/**
 * Removes one scheduled day and renumbers the remaining days in its activity group.
 *
 * @param scheduleItemId - Schedule item day to remove.
 * @param confirmAssignedRemoval - Whether assigned-staff removal has been confirmed.
 * @returns Success, confirmation-required, or validation/authorization/business-rule errors.
 */
export async function removeScheduledCourseDay(
  scheduleItemId: string,
  confirmAssignedRemoval: boolean,
): Promise<ScheduleDayActionResult> {
  const validation = removeScheduledCourseDaySchema.safeParse({
    scheduleItemId,
    confirmAssignedRemoval,
  });

  if (!validation.success) {
    return getScheduleValidationErrors(validation.error);
  }

  const permissionError = await getScheduleDayPermissionError();
  if (permissionError) {
    return permissionError;
  }

  const scheduleItem = await loadScheduleDayGuard(
    validation.data.scheduleItemId,
  );

  if (!scheduleItem) {
    return {
      success: false,
      formError: 'Scheduled day not found. Refresh and try again.',
    };
  }

  const statusError = getScheduleDayStatusError(scheduleItem);
  if (statusError) {
    return statusError;
  }

  const siblings = await loadScheduleDaySiblings(db, scheduleItem);

  if (siblings.length <= 1) {
    return {
      success: false,
      formError: 'A scheduled activity must keep at least one day.',
    };
  }

  if (
    scheduleItem._count.assignments > 0 &&
    !validation.data.confirmAssignedRemoval
  ) {
    return {
      success: false,
      requiresConfirmation: true,
      formError:
        'This scheduled day has assigned staff. Confirm removal to delete this day and its assignments.',
    };
  }

  await db.$transaction(async (transaction) => {
    await transaction.scheduleItem.delete({
      where: {
        id: validation.data.scheduleItemId,
      },
    });

    await renumberScheduleDays(
      transaction,
      siblings.filter((sibling) => sibling.id !== validation.data.scheduleItemId),
    );
  });

  revalidateScheduleDayPaths(scheduleItem.bookingRequest.id);
  return { success: true };
}
