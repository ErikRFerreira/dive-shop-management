/**
 * Purpose: Validation schemas for schedule assignment server actions.
 *
 * @module features/schedule/validation
 */

import { z } from 'zod';

import {
  ScheduleAssignmentRole,
  ScheduleTimeSlot,
} from '@/generated/prisma/enums';

/** Validates input for creating a schedule staff assignment. */
export const addScheduleAssignmentSchema = z.object({
  scheduleItemId: z.string().trim().min(1, 'Schedule item ID is required.'),
  userId: z.string().trim().min(1, 'User ID is required.'),
  role: z.enum(ScheduleAssignmentRole),
});

/** Validates input for changing an existing schedule assignment role. */
export const updateScheduleAssignmentRoleSchema = z.object({
  assignmentId: z.string().trim().min(1, 'Assignment ID is required.'),
  role: z.enum(ScheduleAssignmentRole),
});

/** Validates input for changing a scheduled activity's operational slot. */
export const updateScheduleItemTimeSlotSchema = z.object({
  scheduleItemId: z.string().trim().min(1, 'Schedule item ID is required.'),
  timeSlot: z.enum(ScheduleTimeSlot),
});

/** Validates input for removing an existing schedule assignment. */
export const removeScheduleAssignmentSchema = z.object({
  assignmentId: z.string().trim().min(1, 'Assignment ID is required.'),
});

/** Validates input for appending one scheduled day to an activity. */
export const addScheduledCourseDaySchema = z.object({
  scheduleItemId: z.string().trim().min(1, 'Schedule item ID is required.'),
});

/** Validates input for removing one scheduled day from an activity. */
export const removeScheduledCourseDaySchema = z.object({
  scheduleItemId: z.string().trim().min(1, 'Schedule item ID is required.'),
  confirmAssignedRemoval: z.boolean(),
});
