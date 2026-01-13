-- CreateEnum
CREATE TYPE "ValetStatus" AS ENUM ('expected', 'parked', 'requested', 'ready', 'retrieved');

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "needsValet" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "valetEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "valetLotCapacity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "valetRetrievalNotice" INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE "ValetEmployee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValetEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValetRecord" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestPhone" TEXT,
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "vehicleColor" TEXT,
    "vehiclePlate" TEXT,
    "parkingSlot" TEXT,
    "status" "ValetStatus" NOT NULL DEFAULT 'expected',
    "parkedAt" TIMESTAMP(3),
    "parkedByEmployeeId" TEXT,
    "retrievalRequestedAt" TIMESTAMP(3),
    "retrievalPriority" INTEGER NOT NULL DEFAULT 0,
    "vehicleReadyAt" TIMESTAMP(3),
    "retrievedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValetRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ValetEmployee_username_key" ON "ValetEmployee"("username");

-- CreateIndex
CREATE INDEX "ValetEmployee_username_idx" ON "ValetEmployee"("username");

-- CreateIndex
CREATE INDEX "ValetEmployee_isActive_idx" ON "ValetEmployee"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ValetRecord_registrationId_key" ON "ValetRecord"("registrationId");

-- CreateIndex
CREATE INDEX "ValetRecord_sessionId_idx" ON "ValetRecord"("sessionId");

-- CreateIndex
CREATE INDEX "ValetRecord_status_idx" ON "ValetRecord"("status");

-- CreateIndex
CREATE INDEX "ValetRecord_registrationId_idx" ON "ValetRecord"("registrationId");

-- AddForeignKey
ALTER TABLE "ValetRecord" ADD CONSTRAINT "ValetRecord_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValetRecord" ADD CONSTRAINT "ValetRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValetRecord" ADD CONSTRAINT "ValetRecord_parkedByEmployeeId_fkey" FOREIGN KEY ("parkedByEmployeeId") REFERENCES "ValetEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
