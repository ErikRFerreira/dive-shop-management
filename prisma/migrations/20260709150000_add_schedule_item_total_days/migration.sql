-- Persist total course days on each schedule row for stable Day N/M labels.
ALTER TABLE "ScheduleItem"
ADD COLUMN "totalDays" INTEGER NOT NULL DEFAULT 1;

UPDATE "ScheduleItem"
SET "dayNumber" = 1
WHERE "dayNumber" IS NULL;
