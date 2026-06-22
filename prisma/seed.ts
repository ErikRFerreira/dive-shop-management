import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client';
import { UserRole } from '../src/generated/prisma/enums';

config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL must be set to seed the database.');
}

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
    name: 'Mark User',
    email: 'mark@diveshop.local',
    role: UserRole.INSTRUCTOR,
  },
] as const;

async function main() {
  await Promise.all(
    users.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          role: user.role,
          isActive: true,
        },
        create: user,
      }),
    ),
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
