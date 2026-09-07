import type { Prisma, PrismaClient } from '../src/generated/prisma/client';
import {
  BookingCustomerRole,
  BookingParticipantStatus,
  BookingStatus,
  UserRole,
} from '../src/generated/prisma/enums';
import {
  addUtcDateOnlyDays,
  getShopTodayDate,
} from '../src/lib/operational-date';

import { demoBookings } from './seed-bookings';
import { demoCustomers } from './seed-customers';
import type {
  DemoBookingParticipantSeed,
  DemoBookingSeed,
  DemoCustomerSeed,
} from './seed-types';

const DEMO_ID_PREFIX = 'demo-';
const ASSIGNABLE_USER_ROLES = new Set<UserRole>([
  UserRole.INSTRUCTOR,
  UserRole.DIVEMASTER,
]);

export type DemoSeedSummary = {
  bookings: number;
  customers: number;
  scheduleItems: number;
  assignments: number;
  furthestScheduleDate: Date;
};

type SeedRows = {
  customers: Prisma.CustomerCreateManyInput[];
  bookings: Prisma.BookingRequestCreateManyInput[];
  activities: Prisma.BookingActivityCreateManyInput[];
  bookingCustomers: Prisma.BookingCustomerCreateManyInput[];
  deposits: Prisma.DepositCreateManyInput[];
  scheduleItems: Prisma.ScheduleItemCreateManyInput[];
  assignments: Prisma.ScheduleAssignmentCreateManyInput[];
};

type SeedUser = {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
};

/**
 * Replaces only deterministic demo operational records with a fresh rolling dataset.
 *
 * Existing users and unrelated operational records are never updated or deleted.
 * Demo booking cascades remove their child rows before the replacement rows are
 * inserted atomically.
 *
 * @param prisma - Connected Prisma client used to replace and verify demo data.
 * @param now - Execution instant used to determine the shop-local current date.
 * @returns Counts and the furthest scheduled date produced by the seed.
 */
export async function seedDemoOperationalData(
  prisma: PrismaClient,
  now = new Date(),
): Promise<DemoSeedSummary> {
  const today = getShopTodayDate(now);
  const users = await loadRequiredSeedUsers(prisma);
  const rows = buildSeedRows(today, users);

  await prisma.$transaction(async (transaction) => {
    await transaction.bookingRequest.deleteMany({
      where: { id: { startsWith: DEMO_ID_PREFIX } },
    });
    await transaction.customer.deleteMany({
      where: {
        id: { startsWith: DEMO_ID_PREFIX },
        bookings: { none: {} },
      },
    });

    await transaction.customer.createMany({
      data: rows.customers,
      skipDuplicates: true,
    });
    await transaction.bookingRequest.createMany({ data: rows.bookings });
    await transaction.bookingActivity.createMany({ data: rows.activities });
    await transaction.bookingCustomer.createMany({ data: rows.bookingCustomers });
    await transaction.deposit.createMany({ data: rows.deposits });
    await transaction.scheduleItem.createMany({ data: rows.scheduleItems });
    await transaction.scheduleAssignment.createMany({ data: rows.assignments });
  });

  return verifyDemoOperationalData(prisma, today, users);
}

/**
 * Loads every existing user referenced by the fixtures and validates assignment eligibility.
 *
 * @param prisma - Connected Prisma client used to load seeded users.
 * @returns Existing users keyed by their stable seeded email addresses.
 */
async function loadRequiredSeedUsers(prisma: PrismaClient) {
  const requiredEmails = [
    ...new Set([
      ...demoBookings.map((booking) => booking.createdByEmail),
      ...demoBookings.flatMap((booking) =>
        booking.activities.flatMap((activity) =>
          (activity.assignments ?? []).map((assignment) => assignment.email),
        ),
      ),
    ]),
  ];
  const users = await prisma.user.findMany({
    where: { email: { in: requiredEmails } },
    select: { id: true, email: true, role: true, isActive: true },
  });
  const usersByEmail = new Map(users.map((user) => [user.email, user]));

  for (const email of requiredEmails) {
    if (!usersByEmail.has(email)) {
      throw new Error(`Required seeded user ${email} was not found.`);
    }
  }

  for (const assignment of demoBookings.flatMap((booking) =>
    booking.activities.flatMap((activity) => activity.assignments ?? []),
  )) {
    const user = getRequiredUser(usersByEmail, assignment.email);
    if (!user.isActive || !ASSIGNABLE_USER_ROLES.has(user.role)) {
      throw new Error(
        `Seed assignment user ${assignment.email} must be an active instructor or divemaster.`,
      );
    }
  }

  return usersByEmail;
}

/**
 * Builds flat create-many rows for all demo models from the declarative fixtures.
 *
 * @param today - Shop-local today represented as UTC midnight for date-only fields.
 * @param users - Existing seeded users keyed by email.
 * @returns Dependency-ordered row collections with deterministic identifiers.
 */
function buildSeedRows(today: Date, users: Map<string, SeedUser>): SeedRows {
  const customerByKey = new Map(
    demoCustomers.map((customer) => [customer.key, customer]),
  );
  const rows: SeedRows = {
    customers: demoCustomers.map((customer, index) =>
      buildCustomerRow(customer, today, index),
    ),
    bookings: [],
    activities: [],
    bookingCustomers: [],
    deposits: [],
    scheduleItems: [],
    assignments: [],
  };

  for (const booking of demoBookings) {
    appendBookingRows(rows, booking, today, users, customerByKey);
  }

  return rows;
}

/**
 * Maps one customer fixture to a deterministic customer row.
 *
 * @param customer - Fictional customer profile fixture.
 * @param today - Rolling seed base date.
 * @param index - Stable fixture order used to vary profile creation history.
 * @returns Prisma customer row ready for bulk creation.
 */
function buildCustomerRow(
  customer: DemoCustomerSeed,
  today: Date,
  index: number,
): Prisma.CustomerCreateManyInput {
  const createdAt = instantFromToday(today, -45 + (index % 24), 4);

  return {
    id: customerId(customer.key),
    ...customer.profile,
    createdAt,
    updatedAt: instantFromToday(today, Math.min(-1, -10 + (index % 10)), 6),
  };
}

/**
 * Appends one booking and all relational rows while preserving workflow invariants.
 *
 * @param rows - Mutable bulk row accumulator.
 * @param booking - Booking scenario fixture to append.
 * @param today - Rolling seed base date.
 * @param users - Existing seeded users keyed by email.
 * @param customerByKey - Customer fixtures keyed by stable fixture key.
 */
function appendBookingRows(
  rows: SeedRows,
  booking: DemoBookingSeed,
  today: Date,
  users: Map<string, SeedUser>,
  customerByKey: Map<string, DemoCustomerSeed>,
) {
  if (booking.activities.length === 0) {
    throw new Error(`Demo booking ${booking.key} must contain an activity.`);
  }

  const bookingId = bookingRequestId(booking.key);
  const firstActivity = booking.activities[0];
  const activeParticipantCount = booking.participants.filter(
    (participant) =>
      (participant.status ?? BookingParticipantStatus.ACTIVE) ===
      BookingParticipantStatus.ACTIVE,
  ).length;
  const createdAt = instantFromToday(today, booking.createdOffset, 3);
  const updatedAt = instantFromToday(
    today,
    booking.updatedOffset ?? Math.min(0, booking.createdOffset + 1),
    5,
  );

  rows.bookings.push({
    id: bookingId,
    status: booking.status,
    activityType: firstActivity.activityType,
    specialtyCourse: firstActivity.specialtyCourse ?? null,
    source: booking.source,
    requestedDate: dateFromToday(today, firstActivity.dateOffset),
    requestedTime: firstActivity.requestedTime ?? null,
    requestedTimeSlot: firstActivity.timeSlot,
    numberOfPeople: activeParticipantCount,
    referrerName: booking.referrerName ?? null,
    notes: booking.notes ?? null,
    internalNotes: booking.internalNotes ?? null,
    adminNotes: booking.adminNotes ?? null,
    needsMoreInfoReason: booking.needsMoreInfoReason ?? null,
    createdById: getRequiredUser(users, booking.createdByEmail).id,
    createdAt,
    updatedAt,
  });

  booking.participants.forEach((participant, participantIndex) => {
    rows.bookingCustomers.push(
      buildBookingCustomerRow(
        bookingId,
        participant,
        participantIndex,
        today,
        customerByKey,
        createdAt,
        updatedAt,
      ),
    );
  });

  booking.activities.forEach((activity, activityIndex) => {
    const activityId = bookingActivityId(booking.key, activity.key);
    rows.activities.push({
      id: activityId,
      bookingRequestId: bookingId,
      activityType: activity.activityType,
      specialtyCourse: activity.specialtyCourse ?? null,
      durationDays: activity.durationDays ?? 1,
      requestedDate: dateFromToday(today, activity.dateOffset),
      requestedTime: activity.requestedTime ?? null,
      requestedTimeSlot: activity.timeSlot,
      notes: activity.notes ?? null,
      sortOrder: activityIndex,
      createdAt,
      updatedAt,
    });

    if (
      booking.status === BookingStatus.SCHEDULED ||
      (booking.status === BookingStatus.CANCELLED &&
        booking.preserveCancelledSchedule)
    ) {
      appendScheduleRows(
        rows,
        booking,
        activity,
        activityId,
        today,
        users,
        createdAt,
        updatedAt,
      );
    }
  });

  if (booking.deposit) {
    rows.deposits.push({
      id: `${DEMO_ID_PREFIX}deposit-${booking.key}`,
      bookingRequestId: bookingId,
      amount: booking.deposit.amount ?? null,
      status: booking.deposit.status,
      currency: booking.deposit.currency ?? null,
      paidTo: booking.deposit.paidTo ?? null,
      paymentMethod: booking.deposit.paymentMethod ?? null,
      dueAt:
        booking.deposit.dueOffset === undefined
          ? null
          : instantFromToday(today, booking.deposit.dueOffset, 10),
      paidAt:
        booking.deposit.paidOffset === undefined
          ? null
          : instantFromToday(today, booking.deposit.paidOffset, 8),
      notes: booking.deposit.notes ?? null,
      createdAt,
      updatedAt,
    });
  }
}

/**
 * Maps one participant fixture to a booking/customer join row.
 *
 * @param bookingId - Deterministic parent booking identifier.
 * @param participant - Booking-specific customer details.
 * @param participantIndex - Stable participant order used to select the primary contact.
 * @param today - Rolling seed base date.
 * @param customerByKey - Customer fixtures keyed by stable fixture key.
 * @param createdAt - Parent booking creation timestamp.
 * @param updatedAt - Parent booking update timestamp.
 * @returns Prisma booking-customer row with profile defaults and booking overrides.
 */
function buildBookingCustomerRow(
  bookingId: string,
  participant: DemoBookingParticipantSeed,
  participantIndex: number,
  today: Date,
  customerByKey: Map<string, DemoCustomerSeed>,
  createdAt: Date,
  updatedAt: Date,
): Prisma.BookingCustomerCreateManyInput {
  const customer = customerByKey.get(participant.customerKey);
  if (!customer) {
    throw new Error(`Unknown demo customer key ${participant.customerKey}.`);
  }

  const status = participant.status ?? BookingParticipantStatus.ACTIVE;
  const lastDiveOffset =
    participant.lastDiveOffset ?? customer.diving?.lastDiveOffset;

  return {
    bookingRequestId: bookingId,
    customerId: customerId(customer.key),
    role:
      participantIndex === 0
        ? BookingCustomerRole.PRIMARY_CONTACT
        : BookingCustomerRole.PARTICIPANT,
    participationStatus: status,
    participationStatusNote: participant.statusNote ?? null,
    participationStatusChangedAt:
      status === BookingParticipantStatus.ACTIVE ? null : updatedAt,
    hotelAtBooking: participant.hotelAtBooking ?? customer.profile.hotel ?? null,
    equipmentNeeded:
      participant.equipmentNeeded ?? customer.diving?.equipmentNeeded ?? null,
    notes: participant.notes ?? null,
    certificationAgency: optionalText(
      participant.certificationAgency ?? customer.diving?.certificationAgency,
    ),
    certificationLevel: optionalText(
      participant.certificationLevel ?? customer.diving?.certificationLevel,
    ),
    lastDiveAt:
      lastDiveOffset === undefined
        ? null
        : instantFromToday(today, lastDiveOffset, 2),
    heightCm: participant.heightCm ?? customer.diving?.heightCm ?? null,
    weightKg: participant.weightKg ?? customer.diving?.weightKg ?? null,
    shoeSize: participant.shoeSize ?? customer.diving?.shoeSize ?? null,
    divesLogged: participant.divesLogged ?? customer.diving?.divesLogged ?? null,
    createdAt,
    updatedAt,
  };
}

/**
 * Expands one scheduled activity into its real course-day and assignment rows.
 *
 * @param rows - Mutable bulk row accumulator.
 * @param booking - Parent booking scenario fixture.
 * @param activity - Activity to publish across one or more calendar days.
 * @param activityId - Deterministic parent activity identifier.
 * @param today - Rolling seed base date.
 * @param users - Existing seeded users keyed by email.
 * @param createdAt - Parent booking creation timestamp.
 * @param updatedAt - Parent booking update timestamp.
 */
function appendScheduleRows(
  rows: SeedRows,
  booking: DemoBookingSeed,
  activity: DemoBookingSeed['activities'][number],
  activityId: string,
  today: Date,
  users: Map<string, SeedUser>,
  createdAt: Date,
  updatedAt: Date,
) {
  const totalDays = activity.durationDays ?? 1;

  for (let dayIndex = 0; dayIndex < totalDays; dayIndex += 1) {
    const scheduleId = `${DEMO_ID_PREFIX}schedule-${booking.key}-${activity.key}-${dayIndex + 1}`;
    rows.scheduleItems.push({
      id: scheduleId,
      bookingRequestId: bookingRequestId(booking.key),
      bookingActivityId: activityId,
      date: dateFromToday(today, activity.dateOffset + dayIndex),
      startTime: activity.requestedTime ?? null,
      timeSlot: activity.timeSlot,
      activityType: activity.activityType,
      dayNumber: dayIndex + 1,
      totalDays,
      scheduleNotes: activity.scheduleNotes ?? booking.internalNotes ?? null,
      createdAt,
      updatedAt,
    });

    for (const assignment of activity.assignments ?? []) {
      const user = getRequiredUser(users, assignment.email);
      rows.assignments.push({
        id: `${DEMO_ID_PREFIX}assignment-${booking.key}-${activity.key}-${dayIndex + 1}-${user.id}`,
        scheduleItemId: scheduleId,
        userId: user.id,
        role: assignment.role,
        notes: assignment.notes ?? null,
        createdAt,
        updatedAt,
      });
    }
  }
}

/**
 * Verifies demo counts, rolling horizon, headcounts, workflow scheduling, and assignments.
 *
 * @param prisma - Connected Prisma client used for post-seed checks.
 * @param today - Shop-local rolling base date used by the seed.
 * @param users - Existing seeded users keyed by email.
 * @returns Verified high-level seed summary.
 */
async function verifyDemoOperationalData(
  prisma: PrismaClient,
  today: Date,
  users: Map<string, SeedUser>,
): Promise<DemoSeedSummary> {
  const [bookings, customerCount, scheduleItems, assignmentCount] =
    await Promise.all([
      prisma.bookingRequest.findMany({
        where: { id: { startsWith: DEMO_ID_PREFIX } },
        select: {
          id: true,
          status: true,
          numberOfPeople: true,
          customers: { select: { participationStatus: true } },
          scheduleItems: { select: { id: true } },
        },
      }),
      prisma.customer.count({
        where: { id: { startsWith: DEMO_ID_PREFIX } },
      }),
      prisma.scheduleItem.findMany({
        where: {
          bookingRequestId: { startsWith: DEMO_ID_PREFIX },
          bookingRequest: { status: BookingStatus.SCHEDULED },
        },
        select: { date: true },
        orderBy: { date: 'desc' },
      }),
      prisma.scheduleAssignment.count({
        where: { scheduleItem: { bookingRequestId: { startsWith: DEMO_ID_PREFIX } } },
      }),
    ]);

  if (bookings.length !== demoBookings.length) {
    throw new Error(
      `Expected ${demoBookings.length} demo bookings but found ${bookings.length}.`,
    );
  }

  for (const booking of bookings) {
    const activeCustomers = booking.customers.filter(
      (customer) =>
        customer.participationStatus === BookingParticipantStatus.ACTIVE,
    ).length;
    if (booking.numberOfPeople !== activeCustomers) {
      throw new Error(`Demo booking ${booking.id} has an inconsistent headcount.`);
    }

    const shouldHaveSchedule = booking.status === BookingStatus.SCHEDULED;
    const mustNotHaveSchedule =
      booking.status !== BookingStatus.SCHEDULED &&
      booking.status !== BookingStatus.CANCELLED;
    if (
      (shouldHaveSchedule && booking.scheduleItems.length === 0) ||
      (mustNotHaveSchedule && booking.scheduleItems.length > 0)
    ) {
      throw new Error(
        `Demo booking ${booking.id} does not match schedule workflow rules.`,
      );
    }
  }

  const furthestScheduleDate = scheduleItems[0]?.date;
  const requiredHorizon = dateFromToday(today, 14);
  if (!furthestScheduleDate || furthestScheduleDate < requiredHorizon) {
    throw new Error('Demo schedule does not extend through today + 14 days.');
  }

  for (const user of users.values()) {
    if (
      !user.isActive &&
      ASSIGNABLE_USER_ROLES.has(user.role)
    ) {
      throw new Error(`Inactive user ${user.email} was used by demo fixtures.`);
    }
  }

  return {
    bookings: bookings.length,
    customers: customerCount,
    scheduleItems: scheduleItems.length,
    assignments: assignmentCount,
    furthestScheduleDate,
  };
}

/**
 * Resolves a required user or fails before any operational seed writes occur.
 *
 * @param users - Existing seeded users keyed by email.
 * @param email - Stable seeded email to resolve.
 * @returns Matching existing user.
 */
function getRequiredUser(users: Map<string, SeedUser>, email: string) {
  const user = users.get(email);
  if (!user) {
    throw new Error(`Required seeded user ${email} was not found.`);
  }
  return user;
}

/**
 * Returns a rolling date-only value using the app's UTC-midnight representation.
 *
 * @param today - Shop-local current date represented at UTC midnight.
 * @param days - Whole calendar-day offset from today.
 * @returns Offset date suitable for Prisma `@db.Date` fields.
 */
function dateFromToday(today: Date, days: number) {
  return addUtcDateOnlyDays(today, days);
}

/**
 * Returns a deterministic timestamp on a rolling calendar day.
 *
 * @param today - Shop-local current date represented at UTC midnight.
 * @param days - Whole calendar-day offset from today.
 * @param utcHour - UTC hour used to create believable record chronology.
 * @returns Offset timestamp suitable for Prisma DateTime fields.
 */
function instantFromToday(today: Date, days: number, utcHour: number) {
  const date = dateFromToday(today, days);
  date.setUTCHours(utcHour, 0, 0, 0);
  return date;
}

/**
 * Normalizes optional fixture text so deliberate blank values become database nulls.
 *
 * @param value - Optional fixture string.
 * @returns Trimmed text or null when the value is absent or blank.
 */
function optionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

/**
 * Builds the deterministic primary key for a demo customer fixture.
 *
 * @param key - Stable customer fixture key.
 * @returns Demo-prefixed customer identifier.
 */
function customerId(key: string) {
  return `${DEMO_ID_PREFIX}customer-${key}`;
}

/**
 * Builds the deterministic primary key for a demo booking fixture.
 *
 * @param key - Stable booking scenario key.
 * @returns Demo-prefixed booking identifier.
 */
function bookingRequestId(key: string) {
  return `${DEMO_ID_PREFIX}booking-${key}`;
}

/**
 * Builds the deterministic primary key for a demo activity fixture.
 *
 * @param bookingKey - Stable parent booking key.
 * @param activityKey - Stable activity key within the booking.
 * @returns Demo-prefixed activity identifier.
 */
function bookingActivityId(bookingKey: string, activityKey: string) {
  return `${DEMO_ID_PREFIX}activity-${bookingKey}-${activityKey}`;
}
