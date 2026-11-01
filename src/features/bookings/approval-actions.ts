/**
 * Purpose: Server action for approving bookings and publishing schedule items.
 *
 * @module features/bookings/approval-actions
 */

'use server';

import { redirect } from 'next/navigation';

import {
  ActivityType,
  BookingStatus,
  ScheduleTimeSlot,
} from '@/generated/prisma/enums';
import { getDefaultActivityDurationDays } from '@/features/bookings/activity-utils';
import { db } from '@/lib/db';
import { requireCurrentUser } from '@/lib/current-user';
import { addUtcDateOnlyDays } from '@/lib/operational-date';

import {
  getValidationErrors,
  type BookingWorkflowActionState,
} from './action-results';
import {
  revalidateBookingWorkflowPaths,
  revalidateSchedulePath,
} from './cache';
import {
  canApproveBookingRequest,
  canPerformBookingStatusTransition,
} from './permissions';
import { assertCanTransitionBookingStatus } from './status';
import { approveBookingSchema } from './validation';

type ApprovableBookingActivity = {
  id: string;
  activityType: ActivityType | null;
  requestedDate: Date | null;
  requestedTime: string | null;
  requestedTimeSlot?: ScheduleTimeSlot | null;
  durationDays: number;
  notes: string | null;
  sortOrder: number;
};

type ScheduleItemCreateInput = {
  bookingRequestId: string;
  bookingActivityId: string | null;
  date: Date;
  startTime: string | null;
  timeSlot: ScheduleTimeSlot;
  activityType: ActivityType;
  dayNumber: number;
  totalDays: number;
  scheduleNotes: string | null;
};

type ApprovalScheduleTimeSlotsResult =
  | {
      success: true;
      timeSlots: Map<string, ScheduleTimeSlot>;
    }
  | {
      success: false;
      fieldErrors: Record<string, string[]>;
    };

const approvalScheduleTimeSlotFieldPrefix = 'scheduleTimeSlot:';
const legacyApprovalScheduleTimeSlotKey = 'legacy';

/**
 * Reads admin-selected schedule slots from the approval form.
 *
 * @param formData - Submitted approval form data with activity-keyed slot fields.
 * @returns Valid slots by activity key, or field errors for invalid values.
 */
function getApprovalScheduleTimeSlots(
  formData: FormData,
): ApprovalScheduleTimeSlotsResult {
  const timeSlots = new Map<string, ScheduleTimeSlot>();
  const fieldErrors: Record<string, string[]> = {};

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith(approvalScheduleTimeSlotFieldPrefix)) {
      continue;
    }

    const activityKey = key.slice(approvalScheduleTimeSlotFieldPrefix.length);
    const parsedTimeSlot = Object.values(ScheduleTimeSlot).includes(
      value as ScheduleTimeSlot,
    )
      ? (value as ScheduleTimeSlot)
      : null;

    if (!activityKey || !parsedTimeSlot) {
      fieldErrors[key] = ['Select a valid schedule slot.'];
      continue;
    }

    timeSlots.set(activityKey, parsedTimeSlot);
  }

  return Object.keys(fieldErrors).length > 0
    ? { success: false, fieldErrors }
    : { success: true, timeSlots };
}

/**
 * Expands one approved booking activity into one or more dated schedule rows.
 *
 * @param bookingId - Booking request being published to the schedule.
 * @param activity - Stored activity row with requested scheduling details.
 * @param timeSlot - Admin-selected operational slot for each schedule row.
 * @param scheduleNotes - Notes copied from admin or internal booking notes.
 * @returns Schedule row create inputs for each activity duration day.
 */
function buildScheduleItemsForActivity(
  bookingId: string,
  activity: ApprovableBookingActivity,
  timeSlot: ScheduleTimeSlot,
  scheduleNotes: string | null,
): ScheduleItemCreateInput[] {
  if (!activity.activityType || !activity.requestedDate) {
    return [];
  }

  const activityType = activity.activityType;
  const requestedDate = activity.requestedDate;
  const totalDays = activity.durationDays;

  return Array.from({ length: totalDays }).map((_, index) => ({
    bookingRequestId: bookingId,
    bookingActivityId: activity.id,
    date: addUtcDateOnlyDays(requestedDate, index),
    startTime: null,
    timeSlot,
    activityType,
    dayNumber: index + 1,
    totalDays,
    scheduleNotes,
  }));
}

/**
 * Builds schedule rows for the approval action using activity rows first.
 *
 * @param booking - Booking fields required to publish schedule items.
 * @param approvalTimeSlots - Selected slots keyed by activity ID.
 * @param scheduleNotes - Notes copied onto each schedule row.
 * @returns Schedule rows, or an error when required date or type data is missing.
 */
function buildScheduleItemsForApproval(
  booking: {
    id: string;
    requestedDate: Date | null;
    requestedTime: string | null;
    requestedTimeSlot?: ScheduleTimeSlot | null;
    activityType: ActivityType | null;
    activities: ApprovableBookingActivity[];
  },
  approvalTimeSlots: Map<string, ScheduleTimeSlot>,
  scheduleNotes: string | null,
):
  | { success: true; scheduleItems: ScheduleItemCreateInput[] }
  | { success: false; formError: string } {
  if (booking.activities.length === 0) {
    if (!booking.requestedDate) {
      return {
        success: false,
        formError: 'Requested date is required before approving a booking.',
      };
    }

    if (!booking.activityType) {
      return {
        success: false,
        formError: 'Activity type is required before approving a booking.',
      };
    }

    return {
      success: true,
      scheduleItems: buildScheduleItemsForActivity(
        booking.id,
        {
          id: 'legacy-booking-activity',
          activityType: booking.activityType,
          requestedDate: booking.requestedDate,
          requestedTime: booking.requestedTime,
          requestedTimeSlot: booking.requestedTimeSlot,
          durationDays: getDefaultActivityDurationDays(booking.activityType),
          notes: null,
          sortOrder: 0,
        },
        approvalTimeSlots.get(legacyApprovalScheduleTimeSlotKey) ??
          ScheduleTimeSlot.TBD,
        scheduleNotes,
      ).map((scheduleItem) => ({
        ...scheduleItem,
        bookingActivityId: null,
      })),
    };
  }

  const incompleteActivity = booking.activities.find(
    (activity) => !activity.activityType || !activity.requestedDate,
  );

  if (incompleteActivity) {
    return {
      success: false,
      formError:
        'Every activity needs an activity type and requested date before approval.',
    };
  }

  return {
    success: true,
    scheduleItems: booking.activities.flatMap((activity) =>
      buildScheduleItemsForActivity(
        booking.id,
        activity,
        approvalTimeSlots.get(activity.id) ?? ScheduleTimeSlot.TBD,
        scheduleNotes,
      ),
    ),
  };
}

/**
 * Publishes a pending booking to the internal schedule.
 *
 * The status update and ScheduleItem creation occur in one transaction so a
 * scheduled booking cannot exist without its schedule rows.
 *
 * @param _previousState - Previous form action state supplied by React.
 * @param formData - Form payload containing booking, notes, and schedule slots.
 * @returns Workflow errors; on success, revalidates routes and redirects.
 */
export async function approveBooking(
  _previousState: BookingWorkflowActionState,
  formData: FormData,
): Promise<BookingWorkflowActionState> {
  const validation = approveBookingSchema.safeParse({
    bookingId: formData.get('bookingId'),
    adminNotes: formData.get('adminNotes'),
  });

  if (!validation.success) {
    return getValidationErrors(validation.error);
  }

  const approvalTimeSlots = getApprovalScheduleTimeSlots(formData);
  if (!approvalTimeSlots.success) {
    return {
      fieldErrors: approvalTimeSlots.fieldErrors,
      formError: 'Select a valid schedule slot before approving.',
    };
  }

  const currentUser = await requireCurrentUser();

  if (!canApproveBookingRequest(currentUser)) {
    return {
      formError: 'You do not have permission to approve this booking.',
    };
  }

  const booking = await db.bookingRequest.findUnique({
    where: { id: validation.data.bookingId },
    select: {
      id: true,
      status: true,
      requestedDate: true,
      requestedTime: true,
      requestedTimeSlot: true,
      activityType: true,
      internalNotes: true,
      adminNotes: true,
      scheduleItems: {
        select: {
          id: true,
        },
        take: 1,
      },
      activities: {
        select: {
          id: true,
          activityType: true,
          requestedDate: true,
          requestedTime: true,
          requestedTimeSlot: true,
          durationDays: true,
          notes: true,
          sortOrder: true,
        },
        orderBy: {
          sortOrder: 'asc',
        },
      },
    },
  });

  if (!booking) {
    return { formError: 'Booking request not found.' };
  }

  if (booking.status !== BookingStatus.PENDING_APPROVAL) {
    return {
      formError: 'Only pending approval bookings can be approved.',
    };
  }

  const legacyScheduleItem = (
    booking as { scheduleItem?: { id: string } | null }
  ).scheduleItem;
  const existingScheduleItems =
    booking.scheduleItems ?? (legacyScheduleItem ? [legacyScheduleItem] : []);

  if (existingScheduleItems.length > 0) {
    return {
      formError: 'This booking already has a schedule item.',
    };
  }

  const adminNotes = validation.data.adminNotes;
  const scheduleNotes = adminNotes ?? booking.internalNotes;
  const scheduleItemBuildResult = buildScheduleItemsForApproval(
    {
      ...booking,
      activities: booking.activities ?? [],
    },
    approvalTimeSlots.timeSlots,
    scheduleNotes,
  );

  if (!scheduleItemBuildResult.success) {
    return { formError: scheduleItemBuildResult.formError };
  }

  if (
    !canPerformBookingStatusTransition(
      currentUser,
      booking.status,
      BookingStatus.SCHEDULED,
    )
  ) {
    return {
      formError: 'You do not have permission to approve this booking.',
    };
  }

  assertCanTransitionBookingStatus(booking.status, BookingStatus.SCHEDULED);

  const transactionError = await db.$transaction(async (transaction) => {
    const existingScheduleItem = await transaction.scheduleItem.findFirst({
      where: {
        bookingRequestId: booking.id,
      },
      select: {
        id: true,
      },
    });

    if (existingScheduleItem) {
      return {
        formError: 'This booking already has a schedule item.',
      };
    }

    const updateResult = await transaction.bookingRequest.updateMany({
      where: {
        id: booking.id,
        status: BookingStatus.PENDING_APPROVAL,
      },
      data: {
        status: BookingStatus.SCHEDULED,
        adminNotes,
      },
    });

    if (updateResult.count !== 1) {
      return {
        formError:
          'This booking was updated by another user. Refresh and try again.',
      };
    }

    for (const scheduleItem of scheduleItemBuildResult.scheduleItems) {
      await transaction.scheduleItem.create({
        data: scheduleItem,
      });
    }

    return null;
  });

  if (transactionError) {
    return transactionError;
  }

  revalidateBookingWorkflowPaths(booking.id);
  revalidateSchedulePath();
  redirect(`/bookings/${booking.id}`);
}
