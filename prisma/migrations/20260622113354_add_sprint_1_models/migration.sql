-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'NEEDS_MORE_INFO', 'APPROVED', 'SCHEDULED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('FUN_DIVE', 'DISCOVER_SCUBA_DIVING', 'OPEN_WATER_COURSE', 'ADVANCED_OPEN_WATER_COURSE', 'RESCUE_DIVER_COURSE', 'SPECIALTY_COURSE', 'SNORKELING', 'OTHER');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('WECHAT', 'WHATSAPP', 'PHONE', 'EMAIL', 'WALK_IN', 'REFERRAL', 'INSTRUCTOR', 'OTHER');

-- CreateEnum
CREATE TYPE "PreferredLanguage" AS ENUM ('ENGLISH', 'CHINESE', 'INDONESIAN', 'OTHER');

-- CreateEnum
CREATE TYPE "BookingCustomerRole" AS ENUM ('PRIMARY_CONTACT', 'PARTICIPANT');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'PAID', 'WAIVED', 'REFUNDED');

-- CreateTable
CREATE TABLE "BookingRequest" (
    "id" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'DRAFT',
    "activityType" "ActivityType",
    "source" "BookingSource",
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "notes" TEXT,
    "internalNotes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "preferredLanguage" "PreferredLanguage",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingCustomer" (
    "bookingRequestId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "role" "BookingCustomerRole" NOT NULL DEFAULT 'PARTICIPANT',
    "certificationAgency" TEXT,
    "certificationLevel" TEXT,
    "lastDiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingCustomer_pkey" PRIMARY KEY ("bookingRequestId","customerId")
);

-- CreateTable
CREATE TABLE "Deposit" (
    "id" TEXT NOT NULL,
    "bookingRequestId" TEXT NOT NULL,
    "amount" DECIMAL(10,2),
    "status" "DepositStatus" NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingRequest_status_idx" ON "BookingRequest"("status");

-- CreateIndex
CREATE INDEX "BookingRequest_createdById_idx" ON "BookingRequest"("createdById");

-- CreateIndex
CREATE INDEX "BookingRequest_startAt_idx" ON "BookingRequest"("startAt");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "BookingCustomer_customerId_idx" ON "BookingCustomer"("customerId");

-- CreateIndex
CREATE INDEX "Deposit_bookingRequestId_idx" ON "Deposit"("bookingRequestId");

-- CreateIndex
CREATE INDEX "Deposit_status_idx" ON "Deposit"("status");

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingCustomer" ADD CONSTRAINT "BookingCustomer_bookingRequestId_fkey" FOREIGN KEY ("bookingRequestId") REFERENCES "BookingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingCustomer" ADD CONSTRAINT "BookingCustomer_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_bookingRequestId_fkey" FOREIGN KEY ("bookingRequestId") REFERENCES "BookingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
