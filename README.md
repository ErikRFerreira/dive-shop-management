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

Exact names may change during implementation.

## MVP 0.1 Scope

In scope:

- staff login and roles
- booking request list
- create booking form
- raw booking text field
- structured booking fields
- customer/diver details
- deposit/payment details
- missing info validation
- admin review workflow
- approved-only schedule view

Out of scope:

- public booking website
- online payments
- WhatsApp / WeChat automation
- Google Calendar sync
- instructor payroll reports
- full CRM
- equipment inventory
- AI parsing as a required feature

## Sprint Plan

**Sprint 1 — Booking Intake**

Build: `Create booking request → save draft → submit for approval → show in booking list`

**Sprint 2 — Admin Approval + Schedule**

Add admin review, Needs More Info, cancel, approve, and schedule creation.

**Sprint 3 — Real-World Usefulness**

Add missing info checklist, fun diver validation, deposit validation, source/referrer tracking, customer search, and demo data.

## Development Principles

- Build vertical slices.
- Keep MVP 0.1 internal-only.
- Do not make the calendar the center of the app.
- Validate permissions on the server.
- Do not let auth or uploads block the core workflow.

## First Demo Story

Customer service receives a China booking from WeChat, enters the raw message and structured fields, submits it for approval, admin reviews it, requests missing information if needed, approves it, and the booking appears on the internal schedule.
