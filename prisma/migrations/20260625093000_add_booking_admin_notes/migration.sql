-- Store internal reviewer notes captured during admin approval.
ALTER TABLE "BookingRequest" ADD COLUMN "adminNotes" TEXT;
