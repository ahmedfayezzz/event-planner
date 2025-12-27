-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "name" TEXT NOT NULL,
    "jobTitle" TEXT,
    "company" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "socialMediaLinks" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionGuest" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionGuest_pkey" PRIMARY KEY ("id")
);

-- AlterTable - Remove old guest columns from Session
ALTER TABLE "Session" DROP COLUMN IF EXISTS "guestName";
ALTER TABLE "Session" DROP COLUMN IF EXISTS "guestProfile";

-- CreateIndex
CREATE INDEX "Guest_isActive_idx" ON "Guest"("isActive");

-- CreateIndex
CREATE INDEX "Guest_isPublic_idx" ON "Guest"("isPublic");

-- CreateIndex
CREATE INDEX "Guest_name_idx" ON "Guest"("name");

-- CreateIndex
CREATE INDEX "SessionGuest_sessionId_idx" ON "SessionGuest"("sessionId");

-- CreateIndex
CREATE INDEX "SessionGuest_guestId_idx" ON "SessionGuest"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionGuest_sessionId_guestId_key" ON "SessionGuest"("sessionId", "guestId");

-- AddForeignKey
ALTER TABLE "SessionGuest" ADD CONSTRAINT "SessionGuest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionGuest" ADD CONSTRAINT "SessionGuest_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
