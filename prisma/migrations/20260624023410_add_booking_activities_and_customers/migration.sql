-- AlterTable
ALTER TABLE "BookingCustomer" ADD COLUMN     "equipmentNeeded" TEXT,
ADD COLUMN     "hotelAtBooking" TEXT,
ADD COLUMN     "notes" TEXT;

-- CreateTable
CREATE TABLE "BookingActivity" (
    "id" TEXT NOT NULL,
    "bookingRequestId" TEXT NOT NULL,
    "activityType" "ActivityType",
    "specialtyCourse" TEXT,
    "requestedDate" DATE,
    "requestedTime" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingActivity_bookingRequestId_sortOrder_idx" ON "BookingActivity"("bookingRequestId", "sortOrder");

-- AddForeignKey
ALTER TABLE "BookingActivity" ADD CONSTRAINT "BookingActivity_bookingRequestId_fkey" FOREIGN KEY ("bookingRequestId") REFERENCES "BookingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
