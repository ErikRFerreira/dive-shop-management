<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

## Project

This is the Dive Shop Management System, an internal operations dashboard for a dive shop.

It is not a public booking website.

The core workflow is:

1. Customer service creates a booking request.
2. Booking can be saved as Draft.
3. Customer service submits it for approval.
4. Admin/manager reviews it.
5. Admin/manager approves, cancels, or requests more information.
6. Customer service can fix and resubmit Needs More Info bookings.
7. Approved/scheduled bookings appear on the internal schedule.
8. Scheduled activities can have instructor/staff assignments.

Use the current codebase and current Prisma schema as the source of truth.

Historical planning documents are context only. If they conflict with implemented code, the code wins.

## Current Status

Sprint 1, Sprint 2, and Sprint 3 are complete.

The app already supports:

- booking create/edit/review workflow
- draft, pending approval, needs more info, approved/scheduled, and cancelled states
- admin approval and customer service resubmission
- multiple customers/divers per booking
- multiple activities per booking
- customer search and customer detail/history
- selecting existing customers during booking create/edit
- FullCalendar schedule view
- schedule filters
- multiple staff assignments per scheduled activity
- instructor access to the global schedule
- instructor personal assignments view
- role-aware dashboard summaries

## Current Sprint Focus — Sprint 4 UI Polish

Sprint 4 is focused on UI and style polish.

The goal is to make existing workflows feel more polished, consistent, premium, and usable.

Focus on:

- dashboard polish
- booking table readability
- booking detail layout
- form spacing and section hierarchy
- schedule/calendar readability
- customer page polish
- role-aware navigation clarity
- empty states
- loading/pending states
- validation feedback
- typography, spacing, buttons, cards, and badge consistency

Do not add new product scope unless explicitly requested.

Avoid adding:

- new major routes
- new database models
- new integrations
- charts/analytics
- public booking portal
- Google Calendar sync
- WhatsApp/WeChat automation
- payroll/reporting
- customer merge workflow
- AI parsing

Sprint 4 changes should mostly be UI/component/style improvements around already-built workflows.

## Stack

Use the existing stack:

- Next.js App Router
- TypeScript
- PostgreSQL
- Prisma
- Auth.js / NextAuth-style auth
- Tailwind CSS
- shadcn/ui
- Zod
- Server Actions for internal mutations

## Project Structure

Use the existing structure and patterns.

General rules:

- `src/app` — routes, layouts, page composition
- `src/features/*` — feature logic, queries, validation, permissions, mappers, types
- `src/components/ui` — low-level shadcn/ui primitives only
- `src/components/common` — reusable app-level components
- `src/components/layout` — shell/sidebar/header components
- `src/components/bookings` — booking-specific UI
- `src/components/customers` — customer-specific UI
- `src/components/schedule` — schedule-specific UI
- `src/components/dashboard` — dashboard-specific UI
- `src/lib` — truly app-wide utilities
- `prisma` — schema and seed data

Do not scatter business logic inside page components.

Page files should mostly compose queries and components.

## Component Rules

Prefer one meaningful component per file.

Avoid large multi-component files.

Reusable app-level components belong in:

```txt
src/components/common
```

Examples:

- `StatCard`
- `EmptyState`
- `SectionCard`

Low-level shadcn primitives belong in:

```txt
src/components/ui
```

Examples:

- `Button`
- `Card`
- `Dialog`
- `DropdownMenu`
- `Input`
- `Select`
- `Badge`

Do not put app-specific composite components in `src/components/ui`.

Feature-specific components should stay in their feature component folder.

## File Size and Complexity

Avoid huge files.

Guidelines:

- 400–500 lines: review whether the file should be split
- 700+ lines: usually split
- 1000+ lines: strong code smell

Before creating or expanding a large file, ask:

- Can this be split into focused components?
- Can query logic move into a feature query file?
- Can mapping logic move into a mapper file?
- Is this mixing UI, queries, validation, permissions, and formatting?

Do not reduce line count by creating vague generic abstractions.

Prefer clear, focused functions over clever reusable abstractions.

## Function and Helper Rules

Prefer focused functions with clear domain names.

Good examples:

- `getDashboardOverviewForCurrentUser`
- `getScheduleItemsForCalendar`
- `getMyAssignments`
- `findPotentialDuplicateCustomers`
- `buildScheduleEventTitle`
- `canEditBooking`
- `canReviewBooking`
- `assertCanManageScheduleAssignments`

Avoid vague helpers such as:

- `processData`
- `handleEntity`
- `preparePayload`
- `runOperation`
- `genericCrudHandler`

Use app-wide helpers only for boring reusable mechanics.

Good `src/lib` candidates:

- `normalizeEmail`
- `normalizePhoneNumber`
- `formatDate`
- `formatDateTime`
- `isNonEmptyString`

Feature-specific helpers should stay inside the feature folder.

Examples:

- duplicate detection belongs in `src/features/customers`
- booking/customer mappers belong in `src/features/bookings`
- schedule event title builders belong in `src/features/schedule`
- dashboard orchestration belongs in `src/features/dashboard`

## JSDoc Rule

Add JSDoc documentation to every function you add or update.

Good JSDoc should explain intent, inputs, outputs, and important business rules.

Avoid noisy JSDoc that only repeats the function name.

## Query Rules

Use Prisma carefully.

Do:

- use `count()` for stat/dashboard counts where practical
- use focused `select` queries for compact UI data
- avoid unnecessary large `include` trees
- avoid N+1 queries
- keep query functions focused

Dashboard query logic should be thin orchestration.

Reusable booking query logic belongs in `src/features/bookings`.

Reusable schedule query logic belongs in `src/features/schedule`.

Dashboard-specific mappers/types can stay in `src/features/dashboard`.

## Server Actions and API Routes

Use Server Actions for internal dashboard mutations.

Examples:

- create/update booking
- save draft
- submit for approval
- approve booking
- request more information
- resubmit booking
- cancel booking
- add/update/remove schedule assignments

Use Route Handlers only for:

- file uploads
- webhooks
- external integrations
- future public APIs

## Validation

Use Zod for validation.

Client-side validation improves UX.

Server-side validation is required for:

- booking create/update/submit
- customer selection
- status transitions
- permissions
- paid deposit requirements
- fun diver requirements
- equipment requirements
- schedule assignment mutations

Never rely only on client-side validation.

## Permissions

Always check permissions on the server.

Do not rely only on hiding buttons in the UI.

### Customer Service

Can:

- create booking drafts
- edit own drafts
- submit bookings for approval
- edit own Needs More Info bookings
- resubmit own Needs More Info bookings
- view relevant booking/customer/schedule information

Cannot:

- approve bookings
- publish directly to schedule
- manage schedule assignments
- manage users
- access admin-only controls

### Admin / Manager

Can:

- view all bookings
- edit/review bookings
- approve bookings
- request more information
- cancel bookings
- view global schedule
- manage schedule staff assignments
- view customer records
- view global dashboard summaries

### Instructor

Can:

- access the global schedule
- see all approved/scheduled activities
- access their own assignments view
- see only their own assigned items in `/assignments`

Cannot:

- approve/cancel/request more info
- edit bookings
- manage schedule assignments
- access admin/customer service controls

### Divemaster

Divemasters can be assigned to scheduled activities.

Divemasters do not have platform access/login in the current product direction.

Do not build divemaster navigation or dashboard unless explicitly requested.

## Data Model Rules

The central model is `BookingRequest`.

The schedule is not the source of truth.

A `ScheduleItem` should only exist for official approved/scheduled bookings.

Do not create schedule items for:

- Draft
- Pending Approval
- Needs More Info
- Cancelled

Customer profile data and booking-specific customer data must remain separate.

General reusable customer data belongs on `Customer`.

Booking-specific values belong on the booking/customer join model.

Examples:

- role in booking
- primary contact
- hotel at booking
- certification level at booking
- last dive date at booking
- logged dives at booking
- equipment needs
- booking-specific notes

Do not overwrite historical booking-specific values when showing or updating customer profile data.

## Schedule and Assignment Rules

The app database is the source of truth.

FullCalendar is only a UI layer.

Do not store important schedule data only in FullCalendar state.

The schedule should show only official approved/scheduled bookings.

Do not show:

- Draft
- Pending Approval
- Needs More Info
- Cancelled

Scheduled activities can have multiple staff assignments.

Use the `ScheduleAssignment` model if it exists.

Do not assume a single `assignedStaffId`.

Admin/manager can manage assignments.

Customer service and instructors can view assignments but cannot manage them.

Do not add unless explicitly requested:

- instructor availability
- conflict detection
- payroll
- monthly reports
- confirmation workflow
- notifications
- drag-and-drop scheduling
- resource timeline
- instructor/boat/resource columns

## Dashboard Rules

The dashboard is an operational overview, not analytics.

Use simple stat cards and operational sections.

Do not add charts, graphs, revenue reporting, or advanced analytics unless explicitly requested.

Dashboard summaries must be role-aware.

Admin/manager dashboard can show global queues.

Customer service dashboard should be scoped to their own work.

Instructor dashboard should be assignment-focused.

Keep dashboard query files small.

`src/features/dashboard/queries.ts` should orchestrate dashboard data, not duplicate all booking/schedule query logic.

## UI Rules

This is an internal operations tool, but it should feel polished, calm, reliable, and premium.

Prioritize:

- clarity
- visual hierarchy
- status visibility
- missing information visibility
- fast admin review
- clear schedule view
- useful operational queues
- readable empty states
- clear pending/loading states
- helpful validation messages
- consistent spacing
- consistent typography
- consistent cards/buttons/badges

Do not prioritize:

- fancy animations
- marketing-style design
- complex dashboards
- decorative UI that reduces readability
- advanced analytics

Use shadcn/ui primitives where practical.

Prefer existing components and patterns before creating new ones.

Do not create one-off styles unless necessary.

During Sprint 4, UI polish is expected, but business behavior should not change unless explicitly requested.

## Empty, Loading, and Error States

Empty states should be calm and helpful.

Examples:

- `No customers found.`
- `This customer has no booking history yet.`
- `No scheduled activities match these filters.`
- `No unassigned scheduled activities found.`
- `You have no assigned activities today.`
- `No recent activity yet.`

Use pending/loading states for important actions where practical:

- customer search
- booking save/update/submit
- customer selection
- schedule assignment add/update/remove
- filters/navigation when needed

Validation and error messages should be clear and operational.

## MVP Boundaries

Do not implement these unless explicitly requested:

- public booking website
- customer accounts
- online payments
- WhatsApp/WeChat automation
- Google Calendar sync
- external calendar export
- payroll/monthly reports
- instructor confirmation workflow
- full CRM
- customer merge workflow
- drag-and-drop calendar
- multilingual UI
- AI parsing as a required feature
- charts/advanced analytics
- notifications
- instructor availability/conflict detection

Google Calendar sync may come later, but the app database should remain the source of truth.

When Google Calendar sync is eventually added, prefer one-way sync from app schedule to Google Calendar first.

## Development Rules

Before editing code:

1. Read the relevant files.
2. Check existing patterns.
3. Check the current Prisma schema.
4. Make a short plan.
5. Keep changes scoped to the issue.

When editing code:

- keep changes small
- do not refactor unrelated files
- do not change schema unless explicitly asked
- do not change permissions unless explicitly asked
- do not invent new product features
- prefer boring, readable code
- add JSDoc to every function you add or update
- run available checks before finishing

When refactoring:

- preserve behavior
- preserve routes
- preserve permissions
- preserve schema
- split large files into focused files
- move reusable logic to the correct feature folder
- move reusable app-level components to `src/components/common`
- keep shadcn primitives in `src/components/ui`

When finished, summarize:

1. What changed
2. Files changed
3. How to test manually
4. Risks or follow-up tasks

## Manual Testing Priority

Prioritize manual testing of the core workflows:

1. Customer service creates draft.
2. Customer service submits booking for approval.
3. Admin reviews booking.
4. Admin requests more information.
5. Customer service fixes and resubmits.
6. Admin approves booking.
7. Approved booking appears on schedule.
8. Admin/manager assigns staff.
9. Schedule filters work.
10. Instructor can see global schedule.
11. Instructor can see own assignments.
12. Customer search and existing customer selection work.
13. Dashboard summaries are role-aware.
