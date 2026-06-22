# Dive Shop Management System

Internal dashboard for dive shop booking intake, admin approval, and schedule publishing.

The app helps customer service turn messy booking information from WeChat, WhatsApp, referrals, or instructors into structured booking requests. Admin reviews those requests before they become part of the official internal schedule.

## Current Phase

**MVP 0.1 / Sprint 1**

Sprint 1 goal: `Create booking request → save draft → submit for approval → show as Pending Approval`

Sprint 1 does not include admin approval, schedule publishing, file uploads, messaging automation, or instructor payroll reports.

## MVP Goal

Smallest useful workflow:

`Customer Service creates booking request → Admin reviews / approves it → Approved booking appears on internal schedule`

Main rule: **only approved bookings appear on the official schedule.**

## Tech Stack

- Next.js App Router
- TypeScript
- PostgreSQL
- Prisma
- Auth.js / NextAuth-style authentication
- Tailwind CSS
- shadcn/ui
- Zod
- Supabase Postgres / Storage
- Vercel

## Roles

**Customer Service** can create bookings, save drafts, submit bookings for approval, and update bookings marked as Needs More Info.

**Admin / Manager** can view all bookings, edit bookings, approve bookings, request more information, cancel bookings, and view the schedule.

Instructor features are planned for later and are not part of MVP 0.1.

## Core Models

- `User`
- `BookingRequest`
- `Customer`
- `BookingCustomer`
- `Deposit`
- `ScheduleItem`
- `Attachment` later
- `BookingStatusHistory` later

`BookingRequest` is the central model. `ScheduleItem` is created only after admin approval.

## Booking Statuses

`DRAFT`, `PENDING_APPROVAL`, `NEEDS_MORE_INFO`, `APPROVED`, `SCHEDULED`, `CANCELLED`

For the early MVP, `APPROVED` and `SCHEDULED` may behave as one step.

## Main Routes

```text
/login
/dashboard
/bookings
/bookings/new
/bookings/[id]
/bookings/[id]/review
/schedule
/customers
/settings/users
```

Sprint 1 should focus only on `/bookings`, `/bookings/new`, and basic booking detail display.

## Local Development

```bash
pnpm install
cp .env.example .env
pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev
```

Expected environment variables:

```env
DATABASE_URL=
DIRECT_URL=
AUTH_SECRET=
AUTH_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=
```

## Database Setup

This project uses PostgreSQL with Prisma.

Create a `.env` file:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
```
