-- Create the internal schedule row published by admin booking approval.
CREATE TABLE "ScheduleItem" (
    "id" TEXT NOT NULL,
    "bookingRequestId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT,
    "activityType" "ActivityType" NOT NULL,
    "scheduleNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleItem_pkey" PRIMARY KEY ("id")
);

-- Enforce one schedule row per booking request.
CREATE UNIQUE INDEX "ScheduleItem_bookingRequestId_key" ON "ScheduleItem"("bookingRequestId");

CREATE INDEX "ScheduleItem_date_idx" ON "ScheduleItem"("date");

CREATE INDEX "ScheduleItem_activityType_idx" ON "ScheduleItem"("activityType");

ALTER TABLE "ScheduleItem" ADD CONSTRAINT "ScheduleItem_bookingRequestId_fkey" FOREIGN KEY ("bookingRequestId") REFERENCES "BookingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
