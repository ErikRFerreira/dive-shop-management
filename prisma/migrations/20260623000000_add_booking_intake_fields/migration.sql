-- Preserve every intake field required by the first booking-request form.
ALTER TYPE "DepositStatus" ADD VALUE 'UNKNOWN';

ALTER TABLE "BookingRequest"
  ADD COLUMN "requestedDate" DATE,
  ADD COLUMN "requestedTime" TEXT,
  ADD COLUMN "numberOfPeople" INTEGER,
  ADD COLUMN "referrerName" TEXT;

ALTER TABLE "Customer"
  ADD COLUMN "fullName" TEXT,
  ADD COLUMN "chineseName" TEXT,
  ADD COLUMN "weChatId" TEXT,
  ADD COLUMN "whatsAppNumber" TEXT,
  ADD COLUMN "hotel" TEXT;

ALTER TABLE "BookingCustomer"
  ADD COLUMN "equipmentNeeded" BOOLEAN,
  ADD COLUMN "heightCm" INTEGER,
  ADD COLUMN "weightKg" DECIMAL(5, 2),
  ADD COLUMN "shoeSize" DECIMAL(4, 1),
  ADD COLUMN "maskNotes" TEXT,
  ADD COLUMN "divesLogged" INTEGER;

ALTER TABLE "Deposit"
  ADD COLUMN "currency" TEXT,
  ADD COLUMN "paidTo" TEXT,
  ADD COLUMN "paymentMethod" TEXT;

CREATE INDEX "BookingRequest_requestedDate_idx" ON "BookingRequest"("requestedDate");
