-- AlterTable
ALTER TABLE "User" ADD COLUMN     "canAccessValet" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ValetRecord" ADD COLUMN     "lastAdminActionAt" TIMESTAMP(3),
ADD COLUMN     "lastAdminActionBy" TEXT,
ADD COLUMN     "lastAdminActionReason" TEXT,
ADD COLUMN     "lastAdminActionType" TEXT;

-- CreateTable
CREATE TABLE "ValetEmployeeSession" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "ValetEmployeeSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ValetEmployeeSession_employeeId_idx" ON "ValetEmployeeSession"("employeeId");

-- CreateIndex
CREATE INDEX "ValetEmployeeSession_sessionId_idx" ON "ValetEmployeeSession"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "ValetEmployeeSession_employeeId_sessionId_key" ON "ValetEmployeeSession"("employeeId", "sessionId");

-- AddForeignKey
ALTER TABLE "ValetEmployeeSession" ADD CONSTRAINT "ValetEmployeeSession_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "ValetEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValetEmployeeSession" ADD CONSTRAINT "ValetEmployeeSession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
