-- Preserve the latest administrator request for a booking returned to Customer Service.
ALTER TABLE "BookingRequest" ADD COLUMN "needsMoreInfoReason" TEXT;
