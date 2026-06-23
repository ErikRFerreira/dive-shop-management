-- Add activity choices and the free-text detail required for Specialty Course bookings.
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'SCUBA_REVIEW';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'DIVEMASTER';

ALTER TABLE "BookingRequest"
  ADD COLUMN IF NOT EXISTS "specialtyCourse" TEXT;
