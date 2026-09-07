import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { config } from 'dotenv';

import { PrismaClient } from '../src/generated/prisma/client';
import { UserRole } from '../src/generated/prisma/enums';
import { canAccessPlatform } from '../src/features/auth/permissions';
import { seedDemoOperationalData } from './seed-operational-data';

config({ path: '.env.local' });

const isDemoSeed = process.argv.includes('--demo');
const connectionString = isDemoSeed
  ? process.env.DEMO_DATABASE_URL
  : process.env.DATABASE_URL;
const databaseSchema = isDemoSeed
  ? 'demo'
  : (process.env.DATABASE_SCHEMA ?? 'public');
const seedUserPassword = process.env.SEED_USER_PASSWORD;
const PASSWORD_HASH_ROUNDS = 12;

if (!connectionString) {
  throw new Error(
    `${isDemoSeed ? 'DEMO_DATABASE_URL' : 'DATABASE_URL'} must be set to seed the database.`,
  );
}

if (!seedUserPassword) {
  throw new Error('SEED_USER_PASSWORD must be set to seed user credentials.');
}

const requiredSeedUserPassword = seedUserPassword;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }, { schema: databaseSchema }),
});

const users = [
  {
    name: 'Admin User',
    email: 'admin@diveshop.local',
    role: UserRole.ADMIN,
  },
  {
    name: 'Customer Service User',
    email: 'cs@diveshop.local',
    role: UserRole.CUSTOMER_SERVICE,
  },
  {
    name: 'Manager User',
    email: 'manager@diveshop.local',
    role: UserRole.MANAGER,
  },
  {
    name: 'Mark Instructor',
    email: 'mark@diveshop.local',
    role: UserRole.INSTRUCTOR,
  },
  {
    name: 'Erik Instructor',
    email: 'erik@diveshop.local',
    role: UserRole.INSTRUCTOR,
  },
  {
    name: 'Tomas Instructor',
    email: 'tomas@diveshop.local',
    role: UserRole.INSTRUCTOR,
  },
  {
    name: 'Rigie Divemaster',
    email: 'rigie@diveshop.local',
    role: UserRole.DIVEMASTER,
  },
  {
    name: 'Junior Divemaster',
    email: 'junior@diveshop.local',
    role: UserRole.DIVEMASTER,
  },
] as const;

/**
 * Seeds the selected database with staff users and deterministic operational data.
 *
 * The explicit demo target is cleared first so cloned operational records cannot
 * remain in the portfolio dataset. The default target keeps its existing safety
 * behavior and preserves unrelated records.
 *
 * @returns A promise that resolves after the selected target is seeded and verified.
 */
async function main(): Promise<void> {
  if (isDemoSeed) {
    await resetDemoData();
  }

  const existingSeedUsersBefore = await prisma.user.findMany({
    where: { email: { in: users.map((user) => user.email) } },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { email: 'asc' },
  });
  const platformPasswordHash = await hash(
    requiredSeedUserPassword,
    PASSWORD_HASH_ROUNDS,
  );

  const createdUsers = await prisma.user.createMany({
    data: users.map((user) => ({
      ...user,
      isActive: true,
      passwordHash: canAccessPlatform(user) ? platformPasswordHash : null,
    })),
    skipDuplicates: true,
  });

  console.info(
    `Ensured ${users.length} development users exist (${createdUsers.count} created; existing users unchanged).`,
  );

  const demoSummary = await seedDemoOperationalData(prisma);
  const existingSeedUsersAfter = await prisma.user.findMany({
    where: { id: { in: existingSeedUsersBefore.map((user) => user.id) } },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { email: 'asc' },
  });

  if (
    JSON.stringify(existingSeedUsersBefore) !==
    JSON.stringify(existingSeedUsersAfter)
  ) {
    throw new Error('Existing seeded users changed while seeding demo data.');
  }

  console.info(
    `Seeded ${demoSummary.bookings} demo bookings, ${demoSummary.customers} customers, ${demoSummary.scheduleItems} active schedule items, and ${demoSummary.assignments} staff assignments through ${demoSummary.furthestScheduleDate.toISOString().slice(0, 10)}.`,
  );
}

/**
 * Deletes application data from the explicitly selected demo schema only.
 *
 * Booking cascades remove activities, participants, deposits, schedule items,
 * and assignments before customers and staff users are cleared. Prisma's
 * migration history is intentionally preserved.
 *
 * @returns A promise that resolves after all application rows are removed.
 */
async function resetDemoData(): Promise<void> {
  if (databaseSchema !== 'demo') {
    throw new Error('Refusing to reset data outside the demo schema.');
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.bookingRequest.deleteMany();
    await transaction.customer.deleteMany();
    await transaction.user.deleteMany();
  });

  console.info('Cleared existing application data from the demo schema.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
