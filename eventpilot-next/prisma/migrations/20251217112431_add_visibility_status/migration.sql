-- CreateEnum
CREATE TYPE "VisibilityStatus" AS ENUM ('inactive', 'active', 'archived');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "visibilityStatus" "VisibilityStatus" NOT NULL DEFAULT 'inactive';
