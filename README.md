# Dive Shop Management System

An internal operations dashboard for turning booking inquiries into reviewed bookings and official scheduled activities. The application database is the source of truth; only approved bookings published to the schedule appear there.

## Workflow

`Draft -> Pending approval -> Scheduled`

When corrections are required, a pending booking moves to `Needs more info` and can be resubmitted for approval. Bookings under review or already scheduled can also be cancelled.

Customer service creates and maintains booking requests. Admins and managers review them, request corrections, approve them for the schedule, or cancel them.

## Features

- Booking intake and approval workflow with multiple customers and activities
- Customer search, profiles, and booking history
- FullCalendar schedule with operational filters
- Multiple instructor or divemaster assignments per scheduled activity
- Role-aware dashboards and navigation
- Admin-only staff account management

## Roles

- **Admin:** Full operational access and staff management.
- **Manager:** Full operational access without staff management.
- **Customer Service:** Creates, edits, submits, and resubmits their booking requests; can also access customers and the schedule.
- **Instructor:** Can view the global schedule and personal assignments.
- **Divemaster:** Can be assigned to scheduled activities but cannot log in.

## Tech Stack

Next.js 16 App Router, React 19, TypeScript, PostgreSQL, Prisma 7, Auth.js credentials, Tailwind CSS 4, shadcn/ui, Zod, FullCalendar, and Vitest.

## Local Development

Requires Node.js 20.9 or newer, pnpm 11, and PostgreSQL.

Install dependencies and copy the environment template to `.env.local`:

```bash
pnpm install
cp .env.example .env.local
```

Configure these values:

```env
DATABASE_URL="postgresql://USER:PASSWORD@POOLER_HOST:6543/postgres?pgbouncer=true"
DATABASE_SCHEMA="public"
DIRECT_URL="postgresql://USER:PASSWORD@DIRECT_OR_SESSION_HOST:5432/postgres?schema=public"
AUTH_SECRET="replace-with-a-random-secret"
SEED_USER_PASSWORD="replace-with-a-local-development-password"
ENABLE_DEV_ACCOUNT_SELECTOR="false"
```

`DATABASE_URL` is the pooled runtime connection. `DIRECT_URL` is used by Prisma
migrations and should use either Supabase's direct connection or its session
pooler. `ENABLE_DEV_ACCOUNT_SELECTOR` optionally enables the development-only
account picker. URL-encode special characters in database passwords.

Set up the database and start the app:

```bash
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The seed creates login accounts for `admin@diveshop.local`, `manager@diveshop.local`, `cs@diveshop.local`, `mark@diveshop.local`, `erik@diveshop.local`, and `tomas@diveshop.local`. They share the password in `SEED_USER_PASSWORD`. It also creates `rigie@diveshop.local` and `junior@diveshop.local` as assignment-only divemasters without login access.

## Portfolio Demo Database

The portfolio deployment uses the same Supabase database with its own `demo`
schema. Configure these variables wherever migrations or seeds are run:

```env
DEMO_DATABASE_URL="postgresql://USER:PASSWORD@POOLER_HOST:6543/postgres?pgbouncer=true"
DEMO_DIRECT_URL="postgresql://USER:PASSWORD@DIRECT_OR_SESSION_HOST:5432/postgres"
```

`DEMO_DIRECT_URL` is optional when `DIRECT_URL` reaches the same database; the
demo migration config always forces the `demo` schema. The demo seed also selects
`demo` explicitly, so neither demo connection URL needs a `schema` query
parameter. To prepare or refresh the portfolio dataset, run:

```bash
pnpm db:setup:demo
```

This applies any pending migrations already present in `prisma/migrations`, then
deletes application data from the `demo` schema only and replaces it with the
fictional rolling seed dataset. It preserves `demo._prisma_migrations` and does
not modify `public`.

For the deployed demo application, set its normal runtime variables to the demo
target:

```env
DATABASE_URL="postgresql://USER:PASSWORD@POOLER_HOST:6543/postgres?pgbouncer=true"
DATABASE_SCHEMA="demo"
```

Keep `DATABASE_SCHEMA="public"` (or omit it) for the main application.
Selecting `DATABASE_SCHEMA="demo"` also enables the seeded demo account selector
on the login page, including in production deployments.

A schema separates object names, but it is not a security boundary for a
privileged database credential. Before publishing the portfolio deployment,
prefer a separate Supabase project or give its runtime connection a dedicated
database role that has access to `demo` and no access to `public`.

## Useful Commands

| Command          | Purpose                              |
| ---------------- | ------------------------------------ |
| `pnpm dev`       | Start the development server         |
| `pnpm test`      | Run the Vitest suite                 |
| `pnpm lint`      | Run ESLint                           |
| `pnpm build`     | Create a production build            |
| `pnpm db:migrate` | Apply development database migrations |
| `pnpm db:migrate:demo` | Apply committed migrations to `demo` |
| `pnpm db:seed`    | Seed local staff accounts             |
| `pnpm db:seed:demo` | Reset and seed only the `demo` schema |
| `pnpm db:setup:demo` | Migrate, reset, and seed `demo`       |
| `pnpm db:studio`  | Open Prisma Studio                    |
