-- AlterTable
ALTER TABLE "Sponsor" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'new';

-- CreateIndex
CREATE INDEX "Sponsor_status_idx" ON "Sponsor"("status");
