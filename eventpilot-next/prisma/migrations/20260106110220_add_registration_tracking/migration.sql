-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "isNotComing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "markedNotComingAt" TIMESTAMP(3),
ADD COLUMN     "markedNotComingById" TEXT,
ADD COLUMN     "notComingReason" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedById" TEXT;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_markedNotComingById_fkey" FOREIGN KEY ("markedNotComingById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
