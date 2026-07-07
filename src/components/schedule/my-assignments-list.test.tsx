import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import type { MyScheduleAssignment } from '@/features/schedule/types';
import {
  ActivityType,
  BookingCustomerRole,
  ScheduleAssignmentRole,
} from '@/generated/prisma/enums';
import { MyAssignmentsList } from './my-assignments-list';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-06-28T08:00:00.000Z'));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test('renders assignments grouped into today tomorrow and upcoming sections', () => {
  render(
    <MyAssignmentsList
      assignments={[
        assignment({
          scheduleItemId: 'today',
          date: new Date('2026-06-28T00:00:00.000Z'),
          primaryCustomerName: 'Today Customer',
        }),
        assignment({
          scheduleItemId: 'tomorrow',
          bookingId: 'booking-2',
          date: new Date('2026-06-29T00:00:00.000Z'),
          primaryCustomerName: 'Tomorrow Customer',
          startTime: null,
          endTime: null,
          isTimeTbd: true,
        }),
        assignment({
          scheduleItemId: 'upcoming',
          bookingId: 'booking-3',
          date: new Date('2026-07-02T00:00:00.000Z'),
          primaryCustomerName: 'Upcoming Customer',
        }),
      ]}
    />,
  );

  expect(screen.getByRole('heading', { name: 'Today' })).not.toBeNull();
  expect(screen.getByRole('heading', { name: 'Tomorrow' })).not.toBeNull();
  expect(screen.getByRole('heading', { name: 'Upcoming' })).not.toBeNull();
  expect(screen.getByText('Today Customer')).not.toBeNull();
  expect(screen.getByText('Tomorrow Customer')).not.toBeNull();
  expect(screen.getByText('Upcoming Customer')).not.toBeNull();
});

test('renders personal assignment details without edit or booking actions', () => {
  render(
    <MyAssignmentsList
      assignments={[
        assignment({
          scheduleItemId: 'schedule-1',
          date: new Date('2026-06-28T00:00:00.000Z'),
          startTime: '08:00',
          endTime: '12:30',
          isTimeTbd: false,
          activitySummary: 'Fun Dive + Snorkeling',
          primaryCustomerName: 'Maria Santos',
          customers: [
            {
              name: 'Maria Santos',
              chineseName: null,
              isPrimaryContact: true,
              role: BookingCustomerRole.PRIMARY_CONTACT,
            },
            {
              name: 'Participant Diver',
              chineseName: null,
              isPrimaryContact: false,
              role: BookingCustomerRole.PARTICIPANT,
            },
            {
              name: 'Second Diver',
              chineseName: null,
              isPrimaryContact: false,
              role: BookingCustomerRole.PARTICIPANT,
            },
          ],
          numberOfPeople: 3,
          hotel: 'Primary Booking Hotel',
          scheduleNotes: 'Meet at the shop.',
          assignmentRole: ScheduleAssignmentRole.LEAD_INSTRUCTOR,
        }),
      ]}
    />,
  );

  expect(screen.getAllByText('Maria Santos').length).toBeGreaterThan(0);
  expect(screen.getByText('Participant Diver')).not.toBeNull();
  expect(screen.getByText('Second Diver')).not.toBeNull();
  expect(screen.getByText('Primary Booking Hotel')).not.toBeNull();
  expect(screen.getByText('Lead Instructor')).not.toBeNull();
  expect(screen.queryByRole('link')).toBeNull();
  expect(screen.queryByRole('button')).toBeNull();
});

/**
 * Builds a complete personal assignment record for component tests.
 *
 * @param overrides - Assignment fields to replace for a specific assertion.
 * @returns A My Assignments row suitable for rendering tests.
 */
function assignment(
  overrides: Partial<MyScheduleAssignment> = {},
): MyScheduleAssignment {
  return {
    scheduleItemId: 'schedule-1',
    bookingId: 'booking-1',
    date: new Date('2026-06-28T00:00:00.000Z'),
    startTime: '08:00',
    endTime: null,
    isTimeTbd: false,
    activityType: ActivityType.FUN_DIVE,
    activityLabel: 'Fun Dive',
    activitySummary: 'Fun Dive',
    activities: [
      {
        id: 'activity-1',
        activityType: ActivityType.FUN_DIVE,
        activityLabel: 'Fun Dive',
        specialtyCourse: null,
        requestedDate: new Date('2026-06-28T00:00:00.000Z'),
        requestedTime: '08:00',
        notes: null,
      },
      {
        id: 'activity-2',
        activityType: ActivityType.SNORKELING,
        activityLabel: 'Snorkeling',
        specialtyCourse: null,
        requestedDate: new Date('2026-06-28T00:00:00.000Z'),
        requestedTime: '10:00',
        notes: null,
      },
    ],
    primaryCustomerName: 'Maria Santos',
    customers: [
      {
        name: 'Maria Santos',
        chineseName: null,
        isPrimaryContact: true,
        role: BookingCustomerRole.PRIMARY_CONTACT,
      },
    ],
    numberOfPeople: 2,
    hotel: null,
    scheduleNotes: null,
    assignmentRole: ScheduleAssignmentRole.DIVEMASTER,
    ...overrides,
  };
}
