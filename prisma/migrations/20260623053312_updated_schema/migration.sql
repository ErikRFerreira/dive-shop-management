/*
  Warnings:

  - The values [INDONESIAN] on the enum `PreferredLanguage` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('PESOS', 'YUAN', 'EURO', 'DOLLAR', 'OTHER');

-- AlterEnum
BEGIN;
CREATE TYPE "PreferredLanguage_new" AS ENUM ('ENGLISH', 'CHINESE', 'OTHER');
ALTER TABLE "Customer" ALTER COLUMN "preferredLanguage" TYPE "PreferredLanguage_new" USING ("preferredLanguage"::text::"PreferredLanguage_new");
ALTER TYPE "PreferredLanguage" RENAME TO "PreferredLanguage_old";
ALTER TYPE "PreferredLanguage_new" RENAME TO "PreferredLanguage";
DROP TYPE "public"."PreferredLanguage_old";
COMMIT;
