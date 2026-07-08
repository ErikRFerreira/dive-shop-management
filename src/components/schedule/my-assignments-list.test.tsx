import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import type {
  MyScheduleAssignment,
  MyScheduleAssignmentBriefing,
} from '@/features/schedule/types';
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

test('renders summary counts and next assignment metadata', () => {
  render(
    <MyAssignmentsList
      briefing={briefing({
        todayAssignments: [
          assignment({
            scheduleItemId: 'today',
            primaryCustomerName: 'Today Customer',
          }),
        ],
        tomorrowAssignments: [
          assignment({
            scheduleItemId: 'tomorrow',
            bookingId: 'booking-2',
            date: new Date('2026-06-29T00:00:00.000Z'),
            primaryCustomerName: 'Tomorrow Customer',
          }),
        ],
        upcomingAssignments: [
          assignment({
            scheduleItemId: 'upcoming',
            bookingId: 'booking-3',
            date: new Date('2026-07-02T00:00:00.000Z'),
            primaryCustomerName: 'Upcoming Customer',
          }),
        ],
        summary: {
          todayCount: 1,
          tomorrowCount: 1,
          upcomingCount: 3,
          nextAssignment: {
            date: new Date('2026-06-28T00:00:00.000Z'),
            activitySummary: 'Fun Dive',
          },
        },
      })}
    />,
  );

  expect(screen.getAllByText('Today').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Tomorrow').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Upcoming').length).toBeGreaterThan(0);
  expect(screen.getByText('Next assignment')).not.toBeNull();
  expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(2);
  expect(screen.getAllByText('3').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Fun Dive').length).toBeGreaterThan(0);
});

test('renders today and tomorrow assignment cards with compact empty states', () => {
  render(
    <MyAssignmentsList
      briefing={briefing({
        upcomingAssignments: [
          assignment({
            scheduleItemId: 'upcoming',
            bookingId: 'booking-3',
            date: new Date('2026-07-02T00:00:00.000Z'),
            primaryCustomerName: 'Upcoming Customer',
            customers: [
              {
                name: 'Upcoming Customer',
                chineseName: null,
                isPrimaryContact: true,
                role: BookingCustomerRole.PRIMARY_CONTACT,
              },
            ],
          }),
        ],
        summary: {
          todayCount: 0,
          tomorrowCount: 0,
          upcomingCount: 1,
          nextAssignment: {
            date: new Date('2026-07-02T00:00:00.000Z'),
            activitySummary: 'Fun Dive',
          },
        },
      })}
    />,
  );

  expect(screen.getByText('No assigned activities today.')).not.toBeNull();
  expect(screen.getByText('No assigned activities tomorrow.')).not.toBeNull();
  expect(screen.getByText('Upcoming Customer')).not.toBeNull();
});

test('renders upcoming assignments in a scalable table', () => {
  render(
    <MyAssignmentsList
      briefing={briefing({
        upcomingAssignments: [
          assignment({
            scheduleItemId: 'upcoming',
            bookingId: 'booking-3',
            date: new Date('2026-07-02T00:00:00.000Z'),
            primaryCustomerName: 'Upcoming Customer',
            customers: [
              {
                name: 'Upcoming Customer',
                chineseName: null,
                isPrimaryContact: true,
                role: BookingCustomerRole.PRIMARY_CONTACT,
              },
              {
                name: 'Second Diver',
                chineseName: null,
                isPrimaryContact: false,
                role: BookingCustomerRole.PARTICIPANT,
              },
            ],
            hotel: 'Harbor Hotel',
            scheduleNotes: null,
            assignmentRole: ScheduleAssignmentRole.ASSISTANT_INSTRUCTOR,
          }),
        ],
        summary: {
          todayCount: 0,
          tomorrowCount: 0,
          upcomingCount: 1,
          nextAssignment: {
            date: new Date('2026-07-02T00:00:00.000Z'),
            activitySummary: 'Fun Dive',
          },
        },
      })}
    />,
  );

  const table = screen.getByRole('table');
  expect(within(table).getByText('Date / Time')).not.toBeNull();
  expect(within(table).getByText('Activity')).not.toBeNull();
  expect(within(table).getByText('Active participants')).not.toBeNull();
  expect(within(table).getByText('Location')).not.toBeNull();
  expect(within(table).getByText('Role')).not.toBeNull();
  expect(within(table).getByText('Notes')).not.toBeNull();
  expect(within(table).getByText('02 Jul 2026')).not.toBeNull();
  expect(within(table).getByText('2 active participants')).not.toBeNull();
  expect(within(table).getByText('Upcoming Customer')).not.toBeNull();
  expect(within(table).getByText('Second Diver')).not.toBeNull();
  expect(within(table).getByText('Hotel / pickup: Harbor Hotel')).not.toBeNull();
  expect(within(table).getByText('Assistant Instructor')).not.toBeNull();
  expect(within(table).getByText('No notes')).not.toBeNull();
});

test('renders capped upcoming assignments without action controls', () => {
  render(
    <MyAssignmentsList
      briefing={briefing({
        upcomingAssignments: Array.from({ length: 20 }, (_, index) =>
          assignment({
            scheduleItemId: `upcoming-${index}`,
            bookingId: `booking-${index}`,
            date: new Date('2026-07-02T00:00:00.000Z'),
            primaryCustomerName: `Upcoming Customer ${index}`,
          }),
        ),
        summary: {
          todayCount: 0,
          tomorrowCount: 0,
          upcomingCount: 42,
          nextAssignment: {
            date: new Date('2026-07-02T00:00:00.000Z'),
            activitySummary: 'Fun Dive',
          },
        },
      })}
    />,
  );

  expect(screen.getAllByText('2 active participants')).toHaveLength(20);
  expect(screen.queryByText('Read-only')).toBeNull();
});

test('renders personal assignment details without edit or booking actions', () => {
  render(
    <MyAssignmentsList
      briefing={briefing({
        todayAssignments: [
          assignment({
            scheduleItemId: 'schedule-1',
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
        ],
        summary: {
          todayCount: 1,
          tomorrowCount: 0,
          upcomingCount: 0,
          nextAssignment: {
            date: new Date('2026-06-28T00:00:00.000Z'),
            activitySummary: 'Fun Dive + Snorkeling',
          },
        },
      })}
    />,
  );

  expect(screen.getAllByText('Maria Santos').length).toBeGreaterThan(0);
  expect(screen.getByText('3 active participants')).not.toBeNull();
  expect(screen.getByText('Participant Diver')).not.toBeNull();
  expect(screen.getByText('Second Diver')).not.toBeNull();
  expect(screen.getByText('Hotel / pickup: Primary Booking Hotel')).not.toBeNull();
  expect(screen.getByText(hasTextContent('28 Jun 2026'))).not.toBeNull();
  expect(screen.getByText(hasTextContent('08:00 - 12:30'))).not.toBeNull();
  expect(screen.getAllByText('Fun Dive + Snorkeling').length).toBeGreaterThan(0);
  expect(screen.getByText('Meet at the shop.')).not.toBeNull();
  expect(screen.getByText('Lead Instructor')).not.toBeNull();
  expect(screen.queryByRole('link')).toBeNull();
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.queryByText('Edit booking')).toBeNull();
  expect(screen.queryByText('Review booking')).toBeNull();
  expect(screen.queryByText('Approve booking')).toBeNull();
  expect(screen.queryByText('Cancel booking')).toBeNull();
  expect(screen.queryByText('Manage assignments')).toBeNull();
});

test('renders missing hotel pickup and time fallback safely', () => {
  render(
    <MyAssignmentsList
      briefing={briefing({
        todayAssignments: [
          assignment({
            scheduleItemId: 'schedule-1',
            startTime: null,
            endTime: null,
            isTimeTbd: false,
            hotel: null,
          }),
        ],
        summary: {
          todayCount: 1,
          tomorrowCount: 0,
          upcomingCount: 0,
          nextAssignment: {
            date: new Date('2026-06-28T00:00:00.000Z'),
            activitySummary: 'Fun Dive',
          },
        },
      })}
    />,
  );

  expect(screen.getByText(hasTextContent('Time TBD'))).not.toBeNull();
  expect(screen.getByText('Hotel / pickup: Not recorded')).not.toBeNull();
});

/**
 * Matches any element whose rendered text contains the requested fragment.
 *
 * @param text - Text fragment expected in the element's content.
 * @returns Testing Library text matcher.
 */
function hasTextContent(text: string) {
  return (_content: string, element: Element | null) => {
    if (!element?.textContent?.includes(text)) {
      return false;
    }

    return Array.from(element.children).every(
      (child) => !child.textContent?.includes(text),
    );
  };
}

/**
 * Builds a complete briefing payload for My Assignments component tests.
 *
 * @param overrides - Briefing fields to replace for a specific assertion.
 * @returns A My Assignments briefing suitable for rendering tests.
 */
function briefing(
  overrides: Partial<MyScheduleAssignmentBriefing> = {},
): MyScheduleAssignmentBriefing {
  return {
    todayAssignments: [],
    tomorrowAssignments: [],
    upcomingAssignments: [],
    upcomingLimit: 20,
    summary: {
      todayCount: 0,
      tomorrowCount: 0,
      upcomingCount: 0,
      nextAssignment: null,
    },
    ...overrides,
  };
}

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
