import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { config } from 'dotenv';

import { PrismaClient } from '../src/generated/prisma/client';
import { UserRole } from '../src/generated/prisma/enums';
import { canAccessPlatform } from '../src/features/auth/permissions';

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
 * Seeds the development database with idempotent internal users and hashed local credentials.
 */
async function main() {
  const platformPasswordHash = await hash(
    requiredSeedUserPassword,
    PASSWORD_HASH_ROUNDS,
  );

  await Promise.all(
    users.map((user) => {
      const passwordHash = canAccessPlatform(user)
        ? platformPasswordHash
        : null;

      return prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          role: user.role,
          isActive: true,
          passwordHash,
        },
        create: {
          ...user,
          isActive: true,
          passwordHash,
        },
      });
    }),
  );

  console.info(`Seeded ${users.length} development users.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
