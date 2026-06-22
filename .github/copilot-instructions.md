# GitHub Copilot Instructions

This repository is a custom Next.js internal dashboard for the Dive Shop Management System.

## Project Goal

MVP 0.1 focuses on this workflow:

Customer service creates a booking request → admin reviews/approves it → approved booking appears on the internal schedule.

Do not suggest public booking, Google Calendar sync, WhatsApp/WeChat automation, online payments, instructor payroll, or AI parsing unless explicitly requested.

## Stack

Use:

- Next.js App Router
- TypeScript
- Prisma
- PostgreSQL
- Tailwind CSS
- shadcn/ui
- Zod
- Server Actions for internal dashboard mutations

## Code Style

Prefer:

- simple readable TypeScript
- feature-based organization
- server-side permission checks
- Zod validation
- small components
- clear status handling
- boring, maintainable code

Avoid:

- unnecessary abstractions
- unrelated refactors
- large all-in-one components
- client-only validation for critical rules
- calendar-first architecture

## Domain Rules

The central model is `BookingRequest`.

Only approved/scheduled bookings should appear on the schedule.

Customer service cannot approve bookings.

Admin/Manager can approve, request more info, cancel, and publish to schedule.

Draft bookings can be incomplete.

Bookings submitted for approval must pass critical validation.
