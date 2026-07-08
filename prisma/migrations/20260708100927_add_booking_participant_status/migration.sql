-- CreateEnum
CREATE TYPE "BookingParticipantStatus" AS ENUM ('ACTIVE', 'DROPPED_OUT', 'CANCELLED', 'NO_SHOW');

-- AlterTable
ALTER TABLE "BookingCustomer" ADD COLUMN     "participationStatus" "BookingParticipantStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "participationStatusChangedAt" TIMESTAMP(3),
ADD COLUMN     "participationStatusNote" TEXT;
