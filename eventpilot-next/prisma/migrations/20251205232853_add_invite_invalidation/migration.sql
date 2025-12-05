-- AlterTable
ALTER TABLE "Invite" ADD COLUMN     "invalidated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "invalidatedAt" TIMESTAMP(3);
