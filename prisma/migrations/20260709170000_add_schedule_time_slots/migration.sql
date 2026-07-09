CREATE TYPE "ScheduleTimeSlot" AS ENUM ('AM', 'PM', 'NIGHT', 'TBD');

ALTER TABLE "BookingRequest"
ADD COLUMN "requestedTimeSlot" "ScheduleTimeSlot" NOT NULL DEFAULT 'TBD';

ALTER TABLE "BookingActivity"
ADD COLUMN "requestedTimeSlot" "ScheduleTimeSlot" NOT NULL DEFAULT 'TBD';

ALTER TABLE "ScheduleItem"
ADD COLUMN "timeSlot" "ScheduleTimeSlot" NOT NULL DEFAULT 'TBD';
