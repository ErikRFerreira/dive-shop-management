import type {
  ActivityType,
  BookingCustomerRole,
  BookingStatus,
  ScheduleAssignmentRole,
  UserRole,
} from '@/generated/prisma/enums';

export type AdminDashboardSummary = {
  kind: 'admin';
  pendingApprovalCount: number;
  needsMoreInfoCount: number;
  todayScheduleCount: number;
  tomorrowScheduleCount: number;
  unassignedActivitiesCount: number;
};

export type CustomerServiceDashboardSummary = {
  kind: 'customer-service';
  myDraftsCount: number;
  myPendingApprovalCount: number;
  myNeedsMoreInfoCount: number;
  myApprovedScheduledBookingsCount: number;
};

export type InstructorDashboardSummary = {
  kind: 'instructor';
  todayAssignmentsCount: number;
  tomorrowAssignmentsCount: number;
  myAssignmentsCount: number;
};

export type EmptyDashboardSummary = {
  kind: 'empty';
};

export type DashboardSummary =
  | AdminDashboardSummary
  | CustomerServiceDashboardSummary
  | InstructorDashboardSummary
  | EmptyDashboardSummary;

/** Dashboard data returned by the server query layer for future section UI. */
export type DashboardOverview = {
  summary: DashboardSummary;
  needsAttention: DashboardNeedsAttentionItem[];
  todaysSchedule: DashboardScheduleItem[];
  recentActivity: DashboardRecentActivityItem[];
};

/** Operational item that should be surfaced near the top of the dashboard. */
export type DashboardNeedsAttentionItem = {
  id: string;
  kind: 'booking' | 'schedule';
  label: string;
  bookingId: string;
  scheduleItemId: string | null;
  status: BookingStatus | null;
  activitySummary: string;
  primaryCustomerName: string | null;
  detail: string | null;
  date: Date | null;
  updatedAt: Date;
};

/** Staff assignment attached to a dashboard schedule row. */
export type DashboardScheduleAssignment = {
  id: string;
  userId: string;
  role: ScheduleAssignmentRole;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
};

/** Customer or diver attached to a dashboard schedule row. */
export type DashboardScheduleCustomer = {
  name: string;
  chineseName: string | null;
  isPrimaryContact: boolean;
  role: BookingCustomerRole;
};

/** Schedule row shaped for compact dashboard sections. */
export type DashboardScheduleItem = {
  scheduleItemId: string;
  bookingId: string;
  date: Date;
  startTime: string | null;
  isTimeTbd: boolean;
  activityType: ActivityType;
  activityLabel: string;
  activitySummary: string;
  primaryCustomerName: string | null;
  customers: DashboardScheduleCustomer[];
  /** Active operational participant count derived from booking/customer rows. */
  numberOfPeople: number | null;
  hotel: string | null;
  assignments: DashboardScheduleAssignment[];
  assignedStaffNames: string[];
  isUnassigned: boolean;
};

/** Recent operational booking activity derived from the best available source. */
export type DashboardRecentActivityItem = {
  id: string;
  bookingId: string;
  label: string;
  status: BookingStatus;
  occurredAt: Date;
  activitySummary: string;
  primaryCustomerName: string | null;
};
