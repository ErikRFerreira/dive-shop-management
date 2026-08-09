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
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
AUTH_SECRET="replace-with-a-random-secret"
SEED_USER_PASSWORD="replace-with-a-local-development-password"
ENABLE_DEV_ACCOUNT_SELECTOR="false"
```

`DIRECT_URL` is used by Prisma migrations. `ENABLE_DEV_ACCOUNT_SELECTOR` optionally enables the development-only account picker.

Set up the database and start the app:

```bash
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The seed creates login accounts for `admin@diveshop.local`, `manager@diveshop.local`, `cs@diveshop.local`, `mark@diveshop.local`, `erik@diveshop.local`, and `tomas@diveshop.local`. They share the password in `SEED_USER_PASSWORD`. It also creates `rigie@diveshop.local` and `junior@diveshop.local` as assignment-only divemasters without login access.

## Useful Commands

| Command          | Purpose                              |
| ---------------- | ------------------------------------ |
| `pnpm dev`       | Start the development server         |
| `pnpm test`      | Run the Vitest suite                 |
| `pnpm lint`      | Run ESLint                           |
| `pnpm build`     | Create a production build            |
| `pnpm db:migrate` | Apply development database migrations |
| `pnpm db:seed`    | Seed local staff accounts             |
| `pnpm db:studio`  | Open Prisma Studio                    |
