import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import type {
  DashboardNeedsAttentionItem,
  DashboardRecentActivityItem,
  DashboardScheduleItem,
} from '@/features/dashboard/types';
import {
  ActivityType,
  BookingCustomerRole,
  BookingStatus,
  ScheduleAssignmentRole,
  UserRole,
} from '@/generated/prisma/enums';
import { AdminDashboardSummary } from './admin-dashboard-summary';
import { NeedsAttentionSection } from './needs-attention-section';
import { RecentActivitySection } from './recent-activity-section';
import { TodaysScheduleSection } from './todays-schedule-section';

afterEach(() => {
  cleanup();
});

test('renders admin stat cards as links to existing operational filters', () => {
  render(
    <AdminDashboardSummary
      summary={{
        kind: 'admin',
        pendingApprovalCount: 2,
        needsMoreInfoCount: 3,
        todayScheduleCount: 4,
        tomorrowScheduleCount: 5,
        unassignedActivitiesCount: 6,
      }}
    />,
  );

  expect(screen.getByText('Pending Approval').closest('a')?.getAttribute('href')).toBe(
    '/bookings?status=PENDING_APPROVAL',
  );
  expect(screen.getByText('Needs More Info').closest('a')?.getAttribute('href')).toBe(
    '/bookings?status=NEEDS_MORE_INFO',
  );
  expect(screen.getByText("Today's Schedule").closest('a')?.getAttribute('href')).toBe(
    '/schedule?range=today',
  );
  expect(
    screen.getByText("Tomorrow's Schedule").closest('a')?.getAttribute('href'),
  ).toBe('/schedule?range=tomorrow');
  expect(
    screen.getByText('Unassigned Activities').closest('a')?.getAttribute('href'),
  ).toBe('/schedule?unassignedOnly=true');
});

test('renders admin review action for pending approval attention items', () => {
  render(
    <NeedsAttentionSection
      currentUser={{ id: 'admin-1', role: UserRole.ADMIN }}
      items={[
        attentionItem({
          status: BookingStatus.PENDING_APPROVAL,
          label: 'booking pending approval',
        }),
      ]}
    />,
  );

  const reviewLink = screen.getByRole('link', { name: 'Review' });

  expect(reviewLink).not.toBeNull();
  expect(reviewLink.getAttribute('href')).toBe('/bookings/booking-1/review');
  expect(screen.queryByText('booking pending approval')).toBeNull();
});

test('renders customer service fix details action for needs more info items', () => {
  render(
    <NeedsAttentionSection
      currentUser={{ id: 'cs-1', role: UserRole.CUSTOMER_SERVICE }}
      items={[
        attentionItem({
          status: BookingStatus.NEEDS_MORE_INFO,
          label: 'booking needs more information',
          detail: 'Missing certification details.',
        }),
      ]}
    />,
  );

  const fixLink = screen.getByRole('link', { name: 'Fix details' });

  expect(fixLink).not.toBeNull();
  expect(fixLink.getAttribute('href')).toBe('/bookings/booking-1/edit');
  expect(screen.getByText('Missing certification details.')).not.toBeNull();
  expect(screen.queryByText('booking needs more information')).toBeNull();
});

test('renders admin view-details action for needs more info attention items', () => {
  render(
    <NeedsAttentionSection
      currentUser={{ id: 'admin-1', role: UserRole.ADMIN }}
      items={[
        attentionItem({
          status: BookingStatus.NEEDS_MORE_INFO,
          label: 'Booking needs more information',
          detail: 'Please confirm certification.',
        }),
      ]}
    />,
  );

  const detailsLink = screen.getByRole('link', { name: 'View details' });

  expect(detailsLink).not.toBeNull();
  expect(detailsLink.getAttribute('href')).toBe('/bookings/booking-1');
});

test('does not render admin-only attention actions for customer service users', () => {
  render(
    <NeedsAttentionSection
      currentUser={{ id: 'cs-1', role: UserRole.CUSTOMER_SERVICE }}
      items={[
        attentionItem({
          status: BookingStatus.PENDING_APPROVAL,
          label: 'booking pending approval',
        }),
        attentionItem({
          id: 'schedule-schedule-1',
          kind: 'schedule',
          bookingId: 'booking-schedule-1',
          scheduleItemId: 'schedule-1',
          label: 'Scheduled activity needs staff assignment',
          status: BookingStatus.SCHEDULED,
        }),
      ]}
    />,
  );

  expect(screen.queryByRole('link', { name: 'Review' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'Assign staff' })).toBeNull();
  expect(screen.getAllByRole('link', { name: 'View booking' })).toHaveLength(2);
});

test('does not render booking or assignment links for instructors', () => {
  render(
    <div>
      <NeedsAttentionSection
        currentUser={{ id: 'instructor-1', role: UserRole.INSTRUCTOR }}
        items={[
          attentionItem({
            status: BookingStatus.PENDING_APPROVAL,
            label: 'booking pending approval',
          }),
        ]}
      />
      <TodaysScheduleSection
        currentUser={{ id: 'instructor-1', role: UserRole.INSTRUCTOR }}
        items={[scheduleItem({ isUnassigned: true, assignedStaffNames: [] })]}
      />
    </div>,
  );

  expect(screen.queryByRole('link', { name: 'Review' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'View booking' })).toBeNull();
  expect(screen.queryByText('Assign staff')).toBeNull();
});

test('shows calm missing values in attention and schedule rows', () => {
  render(
    <div>
      <NeedsAttentionSection
        currentUser={{ id: 'admin-1', role: UserRole.ADMIN }}
        items={[attentionItem({ primaryCustomerName: null, detail: null })]}
      />
      <TodaysScheduleSection
        currentUser={{ id: 'admin-1', role: UserRole.ADMIN }}
        items={[
          scheduleItem({
            primaryCustomerName: null,
            customers: [],
            startTime: null,
            isTimeTbd: true,
            hotel: null,
            assignedStaffNames: [],
            assignments: [],
            isUnassigned: true,
          }),
        ]}
      />
      <RecentActivitySection
        items={[
          recentActivityItem({
            primaryCustomerName: null,
          }),
        ]}
      />
    </div>,
  );

  expect(screen.getAllByText('No primary customer')).toHaveLength(1);
  expect(screen.getByText('Booking updated')).not.toBeNull();
  expect(screen.getByText(/No primary customer: Fun Dive/)).not.toBeNull();
  expect(screen.getByText('TBD')).not.toBeNull();
  expect(screen.getByText('No hotel')).not.toBeNull();
  expect(screen.getByText('Unassigned')).not.toBeNull();
});

test('shows unassigned and assigned staff states on today schedule rows', () => {
  render(
    <TodaysScheduleSection
      currentUser={{ id: 'admin-1', role: UserRole.ADMIN }}
      items={[
        scheduleItem({
          scheduleItemId: 'schedule-unassigned',
          bookingId: 'booking-unassigned',
          assignedStaffNames: [],
          assignments: [],
          isUnassigned: true,
        }),
        scheduleItem({
          scheduleItemId: 'schedule-assigned',
          bookingId: 'booking-assigned',
          assignedStaffNames: ['Inez Instructor', 'Dina Divemaster'],
          assignments: [
            assignment({
              id: 'assignment-1',
              userId: 'instructor-1',
              user: {
                id: 'instructor-1',
                name: 'Inez Instructor',
                email: 'inez@example.test',
                role: UserRole.INSTRUCTOR,
              },
            }),
            assignment({
              id: 'assignment-2',
              userId: 'divemaster-1',
              role: ScheduleAssignmentRole.DIVEMASTER,
              user: {
                id: 'divemaster-1',
                name: 'Dina Divemaster',
                email: 'dina@example.test',
                role: UserRole.DIVEMASTER,
              },
            }),
          ],
          isUnassigned: false,
        }),
      ]}
    />,
  );

  const assignLink = screen.getByRole('link', { name: 'Assign staff' });

  expect(screen.getByText('Unassigned')).not.toBeNull();
  expect(screen.getByText('Inez Instructor')).not.toBeNull();
  expect(screen.getByText('Dina Divemaster')).not.toBeNull();
  expect(assignLink.getAttribute('href')).toBe('/bookings/booking-unassigned');
});

test('renders recent activity as read-only status and date information', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-03T12:00:00.000Z'));

  render(
    <RecentActivitySection
      items={[
        recentActivityItem({
          label: 'Booking approved and scheduled',
          status: BookingStatus.SCHEDULED,
          occurredAt: new Date('2026-07-03T08:30:00.000Z'),
        }),
      ]}
    />,
  );

  expect(screen.getByText('Booking approved and scheduled')).not.toBeNull();
  expect(screen.getByText('3 hours ago')).not.toBeNull();
  expect(screen.queryByText('Scheduled')).toBeNull();
  expect(screen.queryByRole('link')).toBeNull();
  expect(screen.queryByRole('button')).toBeNull();

  vi.useRealTimers();
});

test('limits recent activity display to the three newest rows', () => {
  render(
    <RecentActivitySection
      items={[
        recentActivityItem({ id: 'activity-1', label: 'activity one' }),
        recentActivityItem({ id: 'activity-2', label: 'activity two' }),
        recentActivityItem({ id: 'activity-3', label: 'activity three' }),
        recentActivityItem({ id: 'activity-4', label: 'activity four' }),
      ]}
    />,
  );

  expect(screen.getByText('activity one')).not.toBeNull();
  expect(screen.getByText('activity two')).not.toBeNull();
  expect(screen.getByText('activity three')).not.toBeNull();
  expect(screen.queryByText('activity four')).toBeNull();
});

/**
 * Builds a dashboard needs-attention row for component tests.
 *
 * @param overrides - Attention fields to replace for a scenario.
 * @returns A complete needs-attention item.
 */
function attentionItem(
  overrides: Partial<DashboardNeedsAttentionItem> = {},
): DashboardNeedsAttentionItem {
  return {
    id: 'booking-booking-1',
    kind: 'booking',
    label: 'booking pending approval',
    bookingId: 'booking-1',
    scheduleItemId: null,
    status: BookingStatus.PENDING_APPROVAL,
    activitySummary: 'Fun Dive',
    primaryCustomerName: 'Maria Santos',
    detail: '08:00',
    date: new Date('2026-07-14T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T08:00:00.000Z'),
    ...overrides,
  };
}

/**
 * Builds a dashboard schedule item for component tests.
 *
 * @param overrides - Schedule fields to replace for a scenario.
 * @returns A complete dashboard schedule item.
 */
function scheduleItem(
  overrides: Partial<DashboardScheduleItem> = {},
): DashboardScheduleItem {
  return {
    scheduleItemId: 'schedule-1',
    bookingId: 'booking-1',
    date: new Date('2026-07-02T00:00:00.000Z'),
    startTime: '08:00',
    isTimeTbd: false,
    activityType: ActivityType.FUN_DIVE,
    activityLabel: 'Fun Dive',
    activitySummary: 'Fun Dive',
    primaryCustomerName: 'Maria Santos',
    customers: [
      {
        name: 'Maria Santos',
        chineseName: null,
        isPrimaryContact: true,
        role: BookingCustomerRole.PRIMARY_CONTACT,
      },
      {
        name: 'Lina Chen',
        chineseName: null,
        isPrimaryContact: false,
        role: BookingCustomerRole.PARTICIPANT,
      },
    ],
    numberOfPeople: 2,
    hotel: 'Primary Hotel',
    assignments: [assignment()],
    assignedStaffNames: ['Inez Instructor'],
    isUnassigned: false,
    ...overrides,
  };
}

/**
 * Builds a dashboard schedule assignment for component tests.
 *
 * @param overrides - Assignment fields to replace for a scenario.
 * @returns A complete dashboard assignment row.
 */
function assignment(
  overrides: Partial<DashboardScheduleItem['assignments'][number]> = {},
): DashboardScheduleItem['assignments'][number] {
  return {
    id: 'assignment-1',
    userId: 'instructor-1',
    role: ScheduleAssignmentRole.LEAD_INSTRUCTOR,
    user: {
      id: 'instructor-1',
      name: 'Inez Instructor',
      email: 'inez@example.test',
      role: UserRole.INSTRUCTOR,
    },
    ...overrides,
  };
}

/**
 * Builds a recent dashboard activity row for component tests.
 *
 * @param overrides - Activity fields to replace for a scenario.
 * @returns A complete recent activity item.
 */
function recentActivityItem(
  overrides: Partial<DashboardRecentActivityItem> = {},
): DashboardRecentActivityItem {
  return {
    id: 'activity-booking-1',
    bookingId: 'booking-1',
    label: 'Booking updated',
    status: BookingStatus.PENDING_APPROVAL,
    occurredAt: new Date('2026-07-01T08:00:00.000Z'),
    activitySummary: 'Fun Dive',
    primaryCustomerName: 'Maria Santos',
    ...overrides,
  };
}
