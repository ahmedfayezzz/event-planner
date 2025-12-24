-- AlterTable
ALTER TABLE "Sponsor" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Sponsor_isArchived_idx" ON "Sponsor"("isArchived");
