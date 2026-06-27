-- CreateEnum
CREATE TYPE "ScheduleAssignmentRole" AS ENUM ('LEAD_INSTRUCTOR', 'ASSISTANT_INSTRUCTOR', 'DIVEMASTER', 'GUIDE', 'STAFF');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'DIVEMASTER';

-- CreateTable
CREATE TABLE "ScheduleAssignment" (
    "id" TEXT NOT NULL,
    "scheduleItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ScheduleAssignmentRole" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduleAssignment_userId_idx" ON "ScheduleAssignment"("userId");

-- CreateIndex
CREATE INDEX "ScheduleAssignment_role_idx" ON "ScheduleAssignment"("role");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleAssignment_scheduleItemId_userId_key" ON "ScheduleAssignment"("scheduleItemId", "userId");

-- AddForeignKey
ALTER TABLE "ScheduleAssignment" ADD CONSTRAINT "ScheduleAssignment_scheduleItemId_fkey" FOREIGN KEY ("scheduleItemId") REFERENCES "ScheduleItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleAssignment" ADD CONSTRAINT "ScheduleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
