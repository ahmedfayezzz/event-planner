/*
  Warnings:

  - A unique constraint covering the columns `[trackingToken]` on the table `ValetRecord` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ValetRecord" ADD COLUMN     "ticketNumber" INTEGER,
ADD COLUMN     "trackingToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ValetRecord_trackingToken_key" ON "ValetRecord"("trackingToken");

-- CreateIndex
CREATE INDEX "ValetRecord_sessionId_ticketNumber_idx" ON "ValetRecord"("sessionId", "ticketNumber");
