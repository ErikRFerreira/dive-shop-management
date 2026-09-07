import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import {
  ActivityType,
  BookingCustomerRole,
  BookingStatus,
  ScheduleAssignmentRole,
  ScheduleTimeSlot,
  UserRole,
} from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  getDashboardOverviewForCurrentUser: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  requireCurrentUser: vi.fn(),
}));

vi.mock('@/features/dashboard/queries', () => ({
  getDashboardOverviewForCurrentUser:
    mocks.getDashboardOverviewForCurrentUser,
}));

vi.mock('@/lib/current-user', () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

import DashboardPage from './page';

const instructor = {
  id: 'instructor-1',
  name: 'Inez Instructor',
  email: 'inez@example.test',
  role: UserRole.INSTRUCTOR,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireCurrentUser.mockResolvedValue(instructor);
  mocks.getDashboardOverviewForCurrentUser.mockResolvedValue({
    summary: {
      kind: 'instructor',
      todayAssignmentsCount: 1,
      tomorrowAssignmentsCount: 2,
      myAssignmentsCount: 3,
    },
    needsAttention: [],
    todaysSchedule: [
      {
        scheduleItemId: 'schedule-1',
        bookingId: 'booking-1',
        date: new Date('2026-07-21T00:00:00.000Z'),
        timeSlot: ScheduleTimeSlot.AM,
        startTime: null,
        isTimeTbd: false,
        activityType: ActivityType.FUN_DIVE,
        activityLabel: 'Fun Dive',
        activitySummary: 'Fun Dive',
        dayNumber: null,
        totalDays: 1,
        dayLabel: null,
        primaryCustomerName: 'Maria Santos',
        customers: [
          {
            name: 'Maria Santos',
            chineseName: null,
            isPrimaryContact: true,
            role: BookingCustomerRole.PRIMARY_CONTACT,
          },
        ],
        numberOfPeople: 1,
        hotel: 'Ocean View',
        assignments: [
          {
            id: 'assignment-1',
            userId: instructor.id,
            role: ScheduleAssignmentRole.LEAD_INSTRUCTOR,
            user: instructor,
          },
        ],
        assignedStaffNames: [instructor.name],
        isUnassigned: false,
      },
    ],
    recentActivity: [
      {
        id: 'activity-booking-1',
        bookingId: 'booking-1',
        label: 'Booking approved and scheduled',
        status: BookingStatus.SCHEDULED,
        occurredAt: new Date('2026-07-20T08:00:00.000Z'),
        activitySummary: 'Fun Dive',
        primaryCustomerName: 'Maria Santos',
      },
    ],
  });
});

afterEach(() => {
  cleanup();
});

test('renders the assignment-focused dashboard directly for instructors', async () => {
  render(await DashboardPage());

  expect(mocks.redirect).not.toHaveBeenCalled();
  expect(mocks.getDashboardOverviewForCurrentUser).toHaveBeenCalledWith(
    instructor,
  );
  expect(screen.getByText("Today's Assignments")).not.toBeNull();
  expect(screen.getByText("Tomorrow's Assignments")).not.toBeNull();
  expect(screen.getByText('My Assignments')).not.toBeNull();
  expect(screen.getByText('Ocean View')).not.toBeNull();
});

test('renders only instructor-safe dashboard links and actions', async () => {
  render(await DashboardPage());

  const hrefs = screen
    .getAllByRole('link')
    .map((link) => link.getAttribute('href'));

  expect(hrefs).toEqual([
    '/assignments',
    '/assignments',
    '/assignments',
    '/schedule?range=today',
  ]);
  expect(
    hrefs.some(
      (href) =>
        href?.startsWith('/bookings') ||
        href?.startsWith('/customers') ||
        href?.startsWith('/settings'),
    ),
  ).toBe(false);
  expect(screen.queryByText('Create Booking')).toBeNull();
  expect(screen.queryByText('Review')).toBeNull();
  expect(screen.queryByText('Assign staff')).toBeNull();
  expect(screen.queryByText('Manage assignments')).toBeNull();
});
