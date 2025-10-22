/*
  Warnings:

  - The `punchInLocation` column on the `user_punches` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `punchOutLocation` column on the `user_punches` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `user_punches` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "user_punches" DROP COLUMN "punchInLocation",
ADD COLUMN     "punchInLocation" JSONB,
DROP COLUMN "punchOutLocation",
ADD COLUMN     "punchOutLocation" JSONB,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PRESENT';
