<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

## Project

This is the Dive Shop Management System, an internal operations dashboard for a dive shop.

The MVP 0.1 goal is:

Customer service creates a booking request → admin reviews/edits/approves it → approved booking appears on the internal schedule.

The system is not a public booking website yet. It is an internal workflow tool.

## Current MVP Focus

Build the app around the booking review workflow, not around the calendar.

The first useful loop is:

1. Customer service creates a booking request.
2. Booking can be saved as Draft.
3. Customer service submits it for approval.
4. Admin reviews the booking.
5. Admin approves or requests more information.
6. Approved booking appears on the schedule.

## Stack

Use the existing project stack:

- Next.js App Router
- TypeScript
- PostgreSQL
- Prisma
- Auth.js / NextAuth-style auth
- Tailwind CSS
- shadcn/ui
- Zod
- Server Actions for internal mutations
- Supabase Storage later for file uploads
- Vercel deployment later

## Architecture Rules

Organize by feature.

Preferred structure:

- `src/app` for routes
- `src/components` for reusable UI
- `src/features/bookings` for booking logic
- `src/features/customers` for customer logic
- `src/features/schedule` for schedule logic
- `src/lib` for shared utilities
- `prisma` for schema and seed data

Do not scatter booking business logic randomly across page components.

## Server Actions and API Routes

Use Server Actions for internal dashboard mutations:

- create booking request
- save draft
- submit for approval
- approve booking
- mark needs more info
- cancel booking

Use Route Handlers only for:

- file uploads
- webhooks
- external integrations
- future public APIs

## Validation Rules

Use Zod for validation.

Client-side validation is for user experience.

Server-side validation is required for:

- submit for approval
- status transitions
- permissions
- paid deposit requirements
- fun diver requirements
- schedule publishing

Never rely only on client-side validation.

## Permissions

Always check permissions on the server.

Customer service can:

- create booking drafts
- edit own drafts
- submit bookings for approval
- edit bookings marked Needs More Info
- view bookings they created, unless product rules change later

Customer service cannot:

- approve bookings
- publish to schedule
- cancel approved bookings
- manage users

Admin/Manager can:

- view all bookings
- edit bookings
- approve bookings
- mark Needs More Info
- cancel bookings
- view schedule
- publish to schedule

## Data Model Rules

The central model is `BookingRequest`.

The schedule is not the source of truth.

A `ScheduleItem` should only be created after admin approval.

Do not create schedule items for:

- Draft bookings
- Pending Approval bookings
- Needs More Info bookings
- Cancelled bookings

## MVP Boundaries

Do not implement these unless the issue explicitly asks for them:

- public booking website
- online payments
- WhatsApp automation
- WeChat automation
- Google Calendar sync
- instructor payroll reports
- instructor monthly confirmation
- full CRM
- complex drag-and-drop calendar
- multilingual UI
- AI parsing as a required feature

## UI Rules

This is an internal operations tool.

Prioritize:

- clarity
- simple forms
- status visibility
- missing information visibility
- fast admin review
- clean schedule view

Do not prioritize:

- fancy animations
- marketing-style design
- complex dashboards
- advanced analytics

## Development Rules

Before editing code:

1. Read the relevant files.
2. Check existing patterns.
3. Make a short plan.
4. Keep changes scoped to the issue.

When editing code:

- Keep changes small.
- Do not refactor unrelated files.
- Do not change data model names casually.
- Do not invent new product features.
- Prefer boring, readable code.
- Add or update tests when changing business logic.
- Run available checks before finishing.

When finished, summarize:

1. What changed
2. Files changed
3. How to test manually
4. Any risks or follow-up tasks
