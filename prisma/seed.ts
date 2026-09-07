import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { config } from 'dotenv';

import { PrismaClient } from '../src/generated/prisma/client';
import { UserRole } from '../src/generated/prisma/enums';
import { canAccessPlatform } from '../src/features/auth/permissions';
import { seedDemoOperationalData } from './seed-operational-data';

config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;
const seedUserPassword = process.env.SEED_USER_PASSWORD;
const PASSWORD_HASH_ROUNDS = 12;

if (!connectionString) {
  throw new Error('DATABASE_URL must be set to seed the database.');
}

if (!seedUserPassword) {
  throw new Error('SEED_USER_PASSWORD must be set to seed user credentials.');
}

const requiredSeedUserPassword = seedUserPassword;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
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
 * Seeds missing development users and replaces only deterministic demo operational data.
 */
async function main() {
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

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
