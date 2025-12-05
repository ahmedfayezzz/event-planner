-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "guestHostingTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "guestWantsToHost" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hostingTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "wantsToHost" BOOLEAN NOT NULL DEFAULT false;
