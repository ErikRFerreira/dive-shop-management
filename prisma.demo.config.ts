import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({
  path: '.env.local',
});

const directUrl = process.env['DEMO_DIRECT_URL'] ?? process.env['DIRECT_URL'];

if (!directUrl) {
  throw new Error('DEMO_DIRECT_URL or DIRECT_URL must be set for demo migrations.');
}

const demoDirectUrl = new URL(directUrl);
demoDirectUrl.searchParams.set('schema', 'demo');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: demoDirectUrl.toString(),
  },
});
