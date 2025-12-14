/*
  Warnings:

  - You are about to drop the column `userId` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the `Companion` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[registrationId]` on the table `Attendance` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[registrationId,sessionId]` on the table `Attendance` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `registrationId` to the `Attendance` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'GUEST';
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- DropForeignKey
ALTER TABLE "public"."Attendance" DROP CONSTRAINT "Attendance_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Companion" DROP CONSTRAINT "Companion_convertedToUserId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Companion" DROP CONSTRAINT "Companion_registrationId_fkey";

-- DropIndex
DROP INDEX "public"."Attendance_userId_sessionId_key";

-- AlterTable
ALTER TABLE "Attendance" DROP COLUMN "userId",
ADD COLUMN     "registrationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "invitedByRegistrationId" TEXT,
ADD COLUMN     "isManual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manualAddedAt" TIMESTAMP(3),
ADD COLUMN     "manualAddedBy" TEXT,
ADD COLUMN     "sponsorType" TEXT,
ADD COLUMN     "sponsorshipOtherText" TEXT,
ADD COLUMN     "sponsorshipTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "wantsToSponsor" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "bannerUrl" TEXT,
ADD COLUMN     "locationUrl" TEXT,
ADD COLUMN     "showCateringInterest" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showRegistrationPurpose" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showSocialMediaFields" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "canAccessAnalytics" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canAccessCheckin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canAccessDashboard" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canAccessHosts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canAccessSessions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canAccessSettings" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canAccessUsers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "createdByAdminId" TEXT,
ADD COLUMN     "isManuallyCreated" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "public"."Companion";

-- CreateTable
CREATE TABLE "EventCatering" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "hostId" TEXT,
    "hostingType" TEXT NOT NULL,
    "isSelfCatering" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventCatering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "type" TEXT NOT NULL DEFAULT 'person',
    "logoUrl" TEXT,
    "sponsorshipTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sponsorshipOtherText" TEXT,
    "userId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSponsorship" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sponsorId" TEXT,
    "sponsorshipType" TEXT NOT NULL,
    "isSelfSponsored" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSponsorship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "showSocialMediaFields" BOOLEAN NOT NULL DEFAULT true,
    "showRegistrationPurpose" BOOLEAN NOT NULL DEFAULT true,
    "showCateringInterest" BOOLEAN NOT NULL DEFAULT true,
    "siteName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "twitterHandle" TEXT,
    "instagramHandle" TEXT,
    "snapchatHandle" TEXT,
    "linkedinUrl" TEXT,
    "whatsappNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLabel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNote" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UserToUserLabel" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserToUserLabel_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "EventCatering_sessionId_idx" ON "EventCatering"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Sponsor_userId_key" ON "Sponsor"("userId");

-- CreateIndex
CREATE INDEX "Sponsor_userId_idx" ON "Sponsor"("userId");

-- CreateIndex
CREATE INDEX "Sponsor_type_idx" ON "Sponsor"("type");

-- CreateIndex
CREATE INDEX "EventSponsorship_sessionId_idx" ON "EventSponsorship"("sessionId");

-- CreateIndex
CREATE INDEX "EventSponsorship_sponsorId_idx" ON "EventSponsorship"("sponsorId");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "UserLabel_name_key" ON "UserLabel"("name");

-- CreateIndex
CREATE INDEX "UserLabel_name_idx" ON "UserLabel"("name");

-- CreateIndex
CREATE INDEX "UserNote_userId_idx" ON "UserNote"("userId");

-- CreateIndex
CREATE INDEX "UserNote_createdById_idx" ON "UserNote"("createdById");

-- CreateIndex
CREATE INDEX "_UserToUserLabel_B_index" ON "_UserToUserLabel"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_registrationId_key" ON "Attendance"("registrationId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_registrationId_sessionId_key" ON "Attendance"("registrationId", "sessionId");

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_invitedByRegistrationId_fkey" FOREIGN KEY ("invitedByRegistrationId") REFERENCES "Registration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCatering" ADD CONSTRAINT "EventCatering_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCatering" ADD CONSTRAINT "EventCatering_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSponsorship" ADD CONSTRAINT "EventSponsorship_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSponsorship" ADD CONSTRAINT "EventSponsorship_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNote" ADD CONSTRAINT "UserNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNote" ADD CONSTRAINT "UserNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserToUserLabel" ADD CONSTRAINT "_UserToUserLabel_A_fkey" FOREIGN KEY ("A") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserToUserLabel" ADD CONSTRAINT "_UserToUserLabel_B_fkey" FOREIGN KEY ("B") REFERENCES "UserLabel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
