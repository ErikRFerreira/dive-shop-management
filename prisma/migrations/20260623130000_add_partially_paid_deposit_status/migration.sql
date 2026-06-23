-- Support deposits that have been received only in part.
ALTER TYPE "DepositStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID';
