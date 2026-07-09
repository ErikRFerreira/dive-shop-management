-- Allow approved bookings and booking activities to publish multiple schedule rows.
ALTER TYPE "ActivityType" ADD VALUE 'EMERGENCY_FIRST_RESPONSE';

DROP INDEX "ScheduleItem_bookingRequestId_key";

ALTER TABLE "ScheduleItem"
ADD COLUMN "bookingActivityId" TEXT,
ADD COLUMN "dayNumber" INTEGER;

UPDATE "ScheduleItem"
SET "dayNumber" = 1
WHERE "dayNumber" IS NULL;

CREATE INDEX "ScheduleItem_bookingRequestId_date_idx" ON "ScheduleItem"("bookingRequestId", "date");
CREATE INDEX "ScheduleItem_bookingActivityId_date_idx" ON "ScheduleItem"("bookingActivityId", "date");

ALTER TABLE "ScheduleItem"
ADD CONSTRAINT "ScheduleItem_bookingActivityId_fkey"
FOREIGN KEY ("bookingActivityId") REFERENCES "BookingActivity"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
